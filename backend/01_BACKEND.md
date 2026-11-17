# VeriTwin — Backend Work Spec (Node.js + PostgreSQL + Python FastAPI)

> **Owner:** Backend developer. **Read first:** `00_SHARED_CONTRACT.md` (API URLs, DTOs, enums, state machine). This file covers *how to build* it.
> **Rule:** never change a URL, field name, enum, or status code from the contract without agreeing with the frontend developer.

## 0. Prompt for Antigravity / AI agent

```
You are building the backend of VeriTwin. Read 00_SHARED_CONTRACT.md and 01_BACKEND.md fully.
Implement exactly the endpoints, DTOs, enums, error codes, and state machine in the contract.
Create two services in a monorepo: /api (Node.js Express, TypeScript) and /image-service (Python FastAPI + OpenCV).
Follow the folder structure, schema SQL, business rules, and milestones in 01_BACKEND.md.
Work milestone by milestone; after each milestone run the tests and the curl smoke script before moving on.
Do not invent fields. If something is ambiguous, choose the simplest option and list it under "Assumptions" in README.
```

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+, TypeScript, Express 4 |
| DB | PostgreSQL 15 (+ `pgcrypto`) |
| DB access | Prisma **or** `pg` + `node-pg-migrate` (raw SQL in §3 is the source of truth; if using Prisma, use `prisma db pull` / `$queryRaw` for triggers) |
| Validation | Zod (one schema per endpoint, shared error mapper → `VALIDATION_ERROR`) |
| Auth | `jsonwebtoken`, `bcrypt`, opaque refresh tokens stored hashed |
| Uploads | `multer` (memory storage, 8 MB limit, mime whitelist) |
| QR | `qrcode` (PNG buffer), Node `crypto` (HMAC) |
| HTTP to Python | `axios` + `form-data`, 15 s timeout |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Logging | `pino` + request-id |
| Tests | `vitest` / `jest` + `supertest` |
| Image service | Python 3.11, FastAPI, Uvicorn, OpenCV (`opencv-python-headless`), NumPy, `invisible-watermark` (DWT-DCT) |
| Containers | `docker-compose` (postgres, api, image-service) |

## 2. Repository Layout

```
veritwin/
├─ docker-compose.yml
├─ .env.example
├─ api/
│  ├─ src/
│  │  ├─ app.ts / server.ts
│  │  ├─ config/env.ts                    # zod-validated env
│  │  ├─ db/ (pool.ts, migrations/001_init.sql, seed.ts)
│  │  ├─ middleware/ (auth.ts, requireRole.ts, validate.ts, upload.ts, errorHandler.ts, rateLimit.ts, requestId.ts)
│  │  ├─ modules/
│  │  │  ├─ auth/            (routes, controller, service)
│  │  │  ├─ manufacturer/    (products, batches, twins, events, analytics, audit)
│  │  │  ├─ retailer/
│  │  │  ├─ consumer/        (vault, transfers)
│  │  │  ├─ scan/            (scanLogo, scanQr, verdict.ts)
│  │  │  └─ assets/
│  │  ├─ services/
│  │  │  ├─ twinStateMachine.ts           # transition table + apply()
│  │  │  ├─ eventLog.ts                   # append-only + hash chain
│  │  │  ├─ qrSigner.ts                   # sign/verify VT1 payloads
│  │  │  ├─ transferTokens.ts
│  │  │  ├─ imageServiceClient.ts         # encode/decode calls
│  │  │  ├─ storage.ts                    # save/read files
│  │  │  ├─ twinView.ts                   # TwinView / LimitedTwinView builders + masking
│  │  │  └─ serial.ts / twinCode.ts
│  │  └─ utils/ (errors.ts, pagination.ts, hash.ts)
│  ├─ storage/ (originals, watermarked, qr)     # gitignored
│  └─ tests/
└─ image-service/
   ├─ app/ (main.py, watermark.py, preprocess.py, schemas.py)
   ├─ requirements.txt
   └─ tests/
```

## 3. Environment (`.env.example`)

```
NODE_ENV=development
PORT=4000
PUBLIC_BASE_URL=http://192.168.1.10:4000     # LAN IP so phones can load asset URLs
DATABASE_URL=postgresql://veritwin:veritwin@localhost:5432/veritwin

JWT_ACCESS_SECRET=change-me-32+chars
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7

QR_HMAC_SECRET=change-me-different-32+chars
TRANSFER_TTL_SECONDS=120

IMAGE_SERVICE_URL=http://localhost:8000
IMAGE_SERVICE_KEY=internal-shared-secret
WM_CONFIDENCE_THRESHOLD=0.75

MANUFACTURER_INVITE_CODE=MAKER-2026
RETAILER_INVITE_CODE=RETAIL-2026
STORAGE_DIR=./storage
MAX_UPLOAD_MB=8
```

---

## 4. Database Schema (PostgreSQL) — `migrations/001_init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────── ENUMS ─────────
CREATE TYPE user_role            AS ENUM ('MANUFACTURER','RETAILER','CONSUMER');
CREATE TYPE product_category     AS ENUM ('WATCH','APPAREL','FOOTWEAR','ACCESSORY','OTHER');
CREATE TYPE twin_status          AS ENUM ('MANUFACTURED','QA_PASSED','IN_TRANSIT','IN_RETAIL','SOLD');
CREATE TYPE lifecycle_event_type AS ENUM ('MANUFACTURED','QA_PASSED','DISPATCHED_TO_RETAIL','RECEIVED_AT_RETAIL',
                                          'INSPECTED','FIRST_SALE','RESOLD');
CREATE TYPE verification_method  AS ENUM ('WATERMARK','QR');
CREATE TYPE scan_verdict         AS ENUM ('GENUINE','FAKE','ALREADY_CLAIMED','LOW_CONFIDENCE');
CREATE TYPE transfer_status      AS ENUM ('PENDING','CLAIMED','EXPIRED','CANCELLED');

-- ───────── USERS ─────────
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name          VARCHAR(120) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  password_hash      TEXT NOT NULL,
  role               user_role NOT NULL DEFAULT 'CONSUMER',
  organization_name  VARCHAR(160),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_org_required CHECK (role = 'CONSUMER' OR organization_name IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,          -- sha256 hex
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);

-- ───────── PRODUCT MASTER ─────────
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES users(id),
  sku            VARCHAR(64) NOT NULL UNIQUE,
  name           VARCHAR(160) NOT NULL,
  brand          VARCHAR(120) NOT NULL,
  category       product_category NOT NULL,
  mrp            NUMERIC(12,2) NOT NULL CHECK (mrp >= 0),
  currency       CHAR(3) NOT NULL DEFAULT 'INR',
  material       VARCHAR(255),
  specs          JSONB NOT NULL DEFAULT '{}'::jsonb,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_mfr_idx ON products(manufacturer_id);

CREATE TABLE product_audit (               -- MRP/spec edit history (not the lifecycle log)
  id          BIGSERIAL PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products(id),
  changed_by  UUID NOT NULL REFERENCES users(id),
  before      JSONB NOT NULL,
  after       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id),
  batch_no          VARCHAR(64) NOT NULL UNIQUE,
  planned_quantity  INT NOT NULL CHECK (planned_quantity > 0),
  manufactured_on   DATE NOT NULL,
  factory_location  VARCHAR(160),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────── DIGITAL TWINS ─────────
CREATE SEQUENCE twin_serial_seq START 1;

CREATE TABLE digital_twins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_code             CHAR(8) NOT NULL UNIQUE,         -- 32-bit hex embedded in watermark
  serial_number         VARCHAR(40) NOT NULL UNIQUE,     -- VT-WCH-2026-000123
  product_id            UUID NOT NULL REFERENCES products(id),
  batch_id              UUID NOT NULL REFERENCES batches(id),
  status                twin_status NOT NULL DEFAULT 'MANUFACTURED',
  current_retailer_id   UUID REFERENCES users(id),
  current_owner_id      UUID REFERENCES users(id),
  claimed_at            TIMESTAMPTZ,                      -- set at FIRST_SALE
  original_logo_url     TEXT NOT NULL,
  watermarked_logo_url  TEXT NOT NULL,
  fallback_qr_payload   TEXT NOT NULL UNIQUE,             -- VT1.<id>.<sig>
  fallback_qr_url       TEXT NOT NULL,
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT owner_only_when_sold CHECK ( (status = 'SOLD') = (current_owner_id IS NOT NULL) )
);
CREATE INDEX twins_status_idx    ON digital_twins(status);
CREATE INDEX twins_retailer_idx  ON digital_twins(current_retailer_id, status);
CREATE INDEX twins_owner_idx     ON digital_twins(current_owner_id);
CREATE INDEX twins_batch_idx     ON digital_twins(batch_id);

-- ───────── APPEND-ONLY, HASH-CHAINED LIFECYCLE LOG ─────────
CREATE TABLE lifecycle_events (
  id             BIGSERIAL PRIMARY KEY,
  twin_id        UUID NOT NULL REFERENCES digital_twins(id),
  event_type     lifecycle_event_type NOT NULL,
  actor_id       UUID REFERENCES users(id),
  actor_role     user_role,
  from_status    twin_status,
  to_status      twin_status NOT NULL,
  from_owner_id  UUID REFERENCES users(id),
  to_owner_id    UUID REFERENCES users(id),
  notes          TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash      CHAR(64) NOT NULL,                       -- '000…0' for genesis
  event_hash     CHAR(64) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_twin_idx ON lifecycle_events(twin_id, id);
CREATE INDEX events_type_idx ON lifecycle_events(event_type, created_at DESC);

-- Make it genuinely append-only
CREATE OR REPLACE FUNCTION forbid_event_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'lifecycle_events is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER lifecycle_events_no_update BEFORE UPDATE ON lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();
CREATE TRIGGER lifecycle_events_no_delete BEFORE DELETE ON lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();

-- ───────── P2P TRANSFER TOKENS ─────────
CREATE TABLE transfer_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id       UUID NOT NULL REFERENCES digital_twins(id),
  seller_id     UUID NOT NULL REFERENCES users(id),
  buyer_id      UUID REFERENCES users(id),
  token_hash    CHAR(64) NOT NULL UNIQUE,                 -- sha256(token); raw token never stored
  status        transfer_status NOT NULL DEFAULT 'PENDING',
  expires_at    TIMESTAMPTZ NOT NULL,
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- at most ONE pending transfer per twin
CREATE UNIQUE INDEX one_pending_transfer_per_twin ON transfer_tokens(twin_id) WHERE status = 'PENDING';

-- ───────── SCAN LOGS (analytics + clone detection) ─────────
CREATE TABLE scan_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id       UUID REFERENCES digital_twins(id),        -- null for FAKE/unknown
  scanned_by    UUID NOT NULL REFERENCES users(id),
  scanner_role  user_role NOT NULL,
  method        verification_method NOT NULL,
  verdict       scan_verdict NOT NULL,
  confidence    NUMERIC(4,3),
  decoded_code  CHAR(8),                                  -- what the decoder returned (debug/analytics)
  reason        VARCHAR(40),
  ip            INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scans_twin_idx   ON scan_logs(twin_id, created_at DESC);
CREATE INDEX scans_time_idx   ON scan_logs(created_at DESC);
CREATE INDEX scans_verdict_idx ON scan_logs(verdict);
```

### 4.1 Field notes
- `twin_code`: generate with `crypto.randomBytes(4).toString('hex').toUpperCase()`; retry on unique violation. It is the *only* value inside the watermark (short = more robust). The UUID `id` is never watermarked.
- `serial_number`: `VT-<CAT3>-<YYYY>-<6-digit nextval('twin_serial_seq')>`.
- `fallback_qr_payload`: `VT1.` + base64url(twin_id) + `.` + base64url(HMAC_SHA256(QR_HMAC_SECRET, "VT1." + twin_id)).
- Event hash (per twin chain):
  `event_hash = sha256(prev_hash | twin_id | event_type | actor_id | to_status | canonicalJson(metadata) | created_at_iso)`; genesis `prev_hash = '0'*64`. `canonicalJson` = keys sorted recursively.
- If you prefer MongoDB: map each table to a collection; keep `lifecycle_events` insert-only (no update/delete in repo layer) and enforce the unique partial index with `partialFilterExpression`. Multi-document transactions require a replica set.

---

## 5. Python Image Service (`/image-service`)

### 5.1 Endpoints (internal only — never exposed to the mobile app)
All require header `X-Internal-Key: <IMAGE_SERVICE_KEY>` else `401`.

**`POST /internal/watermark/encode`** — multipart: `image` (png/jpg), `twin_code` (8 hex chars)
→ `200 image/png` bytes. Response headers: `X-Psnr: 41.3`, `X-Payload-Bits: 40`.
Errors: `400 {"detail":"image too small (min 512x512)"}`, `400 {"detail":"invalid twin_code"}`.

**`POST /internal/watermark/decode`** — multipart: `image`
```json
{ "decoded": true,
  "twin_code": "9F3A27C1",
  "confidence": 0.92,
  "attempts": 12,
  "valid_attempts": 11,
  "votes": { "9F3A27C1": 11 },
  "preprocessing": ["perspective","denoise","scale_variants"],
  "processing_ms": 830 }
```
When nothing passes CRC: `{ "decoded": false, "twin_code": null, "confidence": 0.0, "attempts": 12, "valid_attempts": 0, ... }`

**`GET /health`** → `{ "status":"ok" }`

### 5.2 Encode algorithm
1. Load image (BGR), if alpha channel composite on white; resize so min side ≥ 512 (upscale if needed, cap 2048).
2. Payload = 32-bit `twin_code` + 8-bit CRC-8 → 40 bits.
3. Embed with DWT-DCT (`imwatermark.WatermarkEncoder`, `set_watermark('bits', bits)`, method `dwtDct`) on the Y channel. Keep PSNR ≥ 38 dB so the logo looks unchanged.
4. Return PNG.

### 5.3 Decode algorithm
1. Decode bytes → image. Normalize long side to 1024.
2. **Perspective correction:** grayscale → blur → Canny → largest quadrilateral contour (`approxPolyDP`) covering ≥ 40% of frame → `warpPerspective` to 512×512. If no quad found, center-crop square (the app already crops using the guide).
3. **Noise/lighting:** `fastNlMeansDenoising` or bilateral filter, CLAHE on luminance.
4. **Multi-variant decoding:** run decoder on variants: {scale 0.9, 1.0, 1.1} × {rotation −2°, 0°, +2°} × {raw, sharpened} (≈ 12–18 attempts, stop early if 8 identical valid votes).
5. For each attempt: extract 40 bits → verify CRC-8 → keep only CRC-valid codes.
6. **Confidence** = `votes_for_winner / total_attempts` (so noisy captures with few valid votes score low). Return winner + confidence.
7. Node compares confidence with `WM_CONFIDENCE_THRESHOLD` (default 0.75).

### 5.4 Feasibility spike (do this on Day 1–2, before building anything else)
Camera-captured watermark robustness is the **riskiest part** of the project.
- Embed a code into a logo → print on paper / show on a second screen → photograph with a phone → decode.
- Record success rate for 20 photos. If < 70 %: use a bolder pattern (larger logo area, lower frequency band, add repetition/tiling of the payload across the logo, raise embed strength while keeping PSNR ≥ 35 dB).
- Whatever the result, the **QR fallback guarantees the demo works**. Tune `WM_CONFIDENCE_THRESHOLD` using spike data.

### 5.5 Python tests
- encode → decode round trip on the clean PNG = same code, confidence ≥ 0.95.
- JPEG q70, gaussian noise, ±3° rotation, mild perspective warp → still decodes (record rates).
- random non-watermarked photo → `decoded:false`.

---

## 6. Node Business Rules (implement exactly)

### 6.1 Auth & RBAC
- bcrypt cost 10. Access JWT claims: `{ sub, role }`. `requireRole('MANUFACTURER')` middleware per router.
- Refresh tokens: random 48 bytes, store sha256, rotate on every refresh (revoke old).
- `/auth/register`: role omitted → CONSUMER. If MANUFACTURER/RETAILER: require valid `invite_code` and `organization_name`.
- Map JWT expiry to `TOKEN_EXPIRED`, any other JWT failure to `UNAUTHENTICATED`.

### 6.2 State machine service
```ts
const TRANSITIONS = {
  QA_PASSED:            { from: ['MANUFACTURED'], to: 'QA_PASSED',  roles: ['MANUFACTURER'] },
  DISPATCHED_TO_RETAIL: { from: ['QA_PASSED'],    to: 'IN_TRANSIT', roles: ['MANUFACTURER'] },
  RECEIVED_AT_RETAIL:   { from: ['IN_TRANSIT'],   to: 'IN_RETAIL',  roles: ['RETAILER'] },
  INSPECTED:            { from: ['IN_RETAIL'],    to: 'IN_RETAIL',  roles: ['RETAILER'] },
  FIRST_SALE:           { from: ['IN_RETAIL'],    to: 'SOLD',       roles: ['RETAILER'] },
  RESOLD:               { from: ['SOLD'],         to: 'SOLD',       roles: ['SYSTEM'] },
};
```
`applyEvent(tx, twinId, eventType, actor, payload)`:
1. `SELECT … FROM digital_twins WHERE id=$1 FOR UPDATE` (serializes concurrent actions).
2. Validate role, status, ownership/assignment (`NOT_ASSIGNED`, `INVALID_STATE_TRANSITION` with `details.current_status` + `details.allowed_from`).
3. Update twin columns (`status`, `current_retailer_id`, `current_owner_id`, `claimed_at`).
4. `eventLog.append(...)` — reads last `event_hash` for the twin, computes new hash, inserts.
5. Commit. **Every mutation must be inside one DB transaction.**

### 6.3 Twin creation (`POST /manufacturer/twins`)
- Validate multipart (`logo` required, mime png/jpeg, dimensions ≥ 512 via `sharp`/`image-size`).
- Loop `quantity` times **inside one transaction**: insert twin row (need `id` before QR) → call encode → write files → build QR → update twin with URLs → append `MANUFACTURED` event.
- If any encode fails → rollback DB **and** delete files written in this request → `503 IMAGE_SERVICE_UNAVAILABLE`.
- Store original upload once per request (`storage/originals/<uuid>.png`) and reference it from each twin.

### 6.4 Scan evaluation (`scan/verdict.ts`) — one function used by both endpoints
```ts
evaluate({ twin|null, caller, method, confidence, reason }):
  if (!twin)                                   → FAKE (reason TWIN_NOT_FOUND | INVALID_SIGNATURE)
  const isOwner = twin.current_owner_id === caller.id
  if (twin.status !== 'SOLD')                  → GENUINE
  if (caller.role === 'MANUFACTURER')          → GENUINE (full view)
  if (isOwner)                                 → GENUINE (is_owner = true)
  else                                         → ALREADY_CLAIMED (LimitedTwinView, no timeline/owner)
```
Then: write `scan_logs`, compute `allowed_actions` per contract §7.5, build view with `twinView.ts`.
Scan endpoints are rate limited: 30 requests/min/user.

### 6.5 Views & masking (`twinView.ts`)
- `twin_code`: MANUFACTURER only. `owner`: MANUFACTURER, or the owner themself. `current_retailer`: not shown to CONSUMER.
- Timeline for CONSUMER: map CONSUMER actors → `display: "Owner"` (current) / `"Previous owner"`, `user_id: null`.
- Never expose `fallback_qr_payload` or asset URLs to non-manufacturers (a leaked payload is a valid clone).

### 6.6 P2P transfers
- Create: verify `current_owner_id == caller` (`NOT_OWNER`). In a tx: mark any existing PENDING for the twin as `CANCELLED`, insert new row with `token_hash=sha256(token)`, `expires_at = now()+TTL`. Return `qr_payload = "VTX1." + token` (token = 32 random bytes base64url).
- Poll `GET /transfers/:id`: lazily flip `PENDING` → `EXPIRED` when `expires_at < now()`.
- Claim: parse prefix (`VTX1.`) → hash → in tx `SELECT … FOR UPDATE`:
  - none → `404 TRANSFER_INVALID`; status CLAIMED/CANCELLED → `409 TRANSFER_ALREADY_USED`; expired → set EXPIRED, `410 TRANSFER_EXPIRED`; `seller_id == caller` → `400 CANNOT_CLAIM_OWN`.
  - else set `buyer_id`, `status=CLAIMED`, `claimed_at=now()`; call `applyEvent(RESOLD)` with `from_owner_id`, `to_owner_id`; return fresh `TwinView` for the buyer.
- Add a periodic job (`setInterval` 60 s) to expire stale PENDING rows.

### 6.7 Analytics queries (manufacturer)
- `status_breakdown`: `GROUP BY status` on this manufacturer's twins.
- `verification_methods`: `GROUP BY method` on `scan_logs` joined by twin/manufacturer within `days`; `fallback_rate = qr / total`.
- `clone_alerts`: twins with ≥ 3 `ALREADY_CLAIMED` scans by non-owners in window, ordered by count.
- `scans_per_day`: `date_trunc('day')` buckets.
- Note: FAKE scans have no twin → include in `verdicts` via global count of scans in window (acceptable for a minor project).

### 6.8 Integrity check
Re-walk the chain: recompute each `event_hash` from `prev_hash` + stored fields; first mismatch → `valid:false, broken_at_event_id`. Include a `scripts/tamper-demo.sql` that disables the trigger, edits one event, then shows the endpoint flipping to `valid:false` (great for the viva).

### 6.9 Assets
`GET /api/assets/:kind/:filename` — MANUFACTURER only; validate `kind` against whitelist and `filename` against `^[0-9a-f-]{36}\.png$` (no path traversal); `Cache-Control: private`.

---

## 7. Security Checklist
- [ ] Passwords hashed; JWT secrets from env; no secrets in repo.
- [ ] Helmet + CORS (allow `*` in dev only).
- [ ] Rate limit: auth 10/min/IP, scans 30/min/user, global 300/min/IP.
- [ ] Multer: memory storage, size ≤ 8 MB, mime whitelist, magic-byte check.
- [ ] Image service only reachable on internal network, requires `X-Internal-Key`.
- [ ] QR verification uses `crypto.timingSafeEqual`.
- [ ] Transfer tokens hashed at rest, TTL 120 s, single-use.
- [ ] Parameterized SQL only.
- [ ] Consistent error envelope, no stack traces in responses.

## 8. Known Limitations (mention honestly in viva — shows maturity)
1. A **photocopy of a printed logo preserves the watermark**, so a clone resolves to a real twin. The defense is *state*: once `SOLD`, clone scans return `ALREADY_CLAIMED` and `clone_alerts` surfaces repeated scans. A clone made **before** the first sale can't be distinguished by scan alone — mitigation is the retailer `INSPECTED` step and scan-frequency anomaly alerts (future work: per-unit tamper-evident seals, scan geolocation).
2. Watermark robustness depends on print quality/lighting → the signed QR fallback.
3. Signed QR can also be copied; same state-based protection applies.
4. HMAC (symmetric) signing is simple; Ed25519 (public-key) would allow offline verification.

---

## 9. Seed Script (`db/seed.ts`)
- Users per contract §8 (four accounts).
- 1 product (`WCH-CHR-001`, MRP 24999), 1 batch, **no twins pre-created with fake files** — instead include `scripts/seed-demo-twins.ts` that calls the real create flow with a sample logo in `api/assets-sample/logo.png`, produces 5 twins, runs: 2 → `QA_PASSED` + `DISPATCHED_TO_RETAIL`, 1 of those `RECEIVED_AT_RETAIL`, 1 sold to Riya.
- Seed must be idempotent.

## 10. Testing (minimum)
- Unit: state machine table, hash chain append/verify, QR sign/verify (tamper 1 char → fail), twinView masking, verdict evaluation matrix.
- Integration (`supertest`): auth flow, RBAC (consumer hitting `/manufacturer/*` → 403), full lifecycle create→QA→dispatch→receive→sell→transfer, double-claim race (two parallel claims → exactly one 200), expired token, low-confidence 422 (mock image service).
- Provide `scripts/smoke.sh` with curl calls for every milestone.
- Provide **`mock image service`** flag `IMAGE_SERVICE_MOCK=true` (encode returns the input unchanged; decode returns twin_code from a header `X-Mock-Twin-Code`) so API work isn't blocked by the Python work.

---

## 11. Milestones (backend)

| # | Milestone | Done when | Unblocks frontend |
|---|---|---|---|
| **B0** | Day 1: repo, docker-compose, Postgres migration, env, `/health`, error envelope, **spike of watermark feasibility** | `curl /api/health` ok; spike result recorded | — |
| **B1** | Auth + RBAC + seed users | register/login/refresh/me work; role guards tested | Login screens |
| **B2** | Products, batches, retailers list | Contract §7.2 product/batch endpoints | Manufacturer forms |
| **B3** | Python service encode + twin creation + QR assets + assets endpoint | `POST /manufacturer/twins` returns real URLs; images open | Create-twin screen + asset preview |
| **B4** | Events + state machine + hash chain + integrity | QA/dispatch/receive flows; integrity endpoint | Timeline UI, retailer inventory |
| **B5** | Scan-QR + Scan-logo (decode) + verdict + scan logs + low-confidence 422 | all verdict DTOs match contract | Scanner screens (the big one) |
| **B6** | Retailer sell + consumer vault | sale flow + vault endpoints | Retailer POS, My Vault |
| **B7** | P2P transfers (create/poll/cancel/claim) + expiry job | race-safe claim test passes | Transfer screens |
| **B8** | Analytics + audit + clone alerts + tamper demo script | analytics DTO matches | Manufacturer dashboard |
| **B9** | Hardening, README, Postman/Insomnia collection, demo data, Docker one-command start | `docker compose up` gives working stack | Final demo |

**Sync points with frontend:** after B1 (login), B3 (assets), B5 (scan), B7 (P2P). Provide a **Postman collection** (`docs/veritwin.postman_collection.json`) after B2 and keep it updated.

## 12. Definition of Done
- Every endpoint in `00_SHARED_CONTRACT.md` implemented with identical field names, status codes, and error codes.
- `docker compose up` brings up Postgres + API + image service; seed gives demo accounts.
- All tests green; manual end-to-end demo script (below) passes.

## 13. Demo Script (rehearse for the college showcase)
1. Manufacturer: create product + batch → create 3 twins from a logo → download watermarked logo + QR → show "invisible" difference side-by-side.
2. Manufacturer: QA pass + dispatch to retailer.
3. Retailer: scan logo → receive → inspect → sell to Riya.
4. Consumer (Arjun): scan the same product → **ALREADY_CLAIMED**.
5. Scan a random logo / edited QR → **FAKE**.
6. Show low-light scan → **fallback to QR** prompt.
7. Riya: P2P transfer QR → Arjun scans → vault updates, timeline shows `RESOLD`.
8. Manufacturer dashboard: analytics + clone alert + run tamper script → integrity flips to **invalid**.
