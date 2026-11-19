# VeriTwin — Shared Contract (Backend ⇄ Frontend)

> **Both developers read this file first.** It is the single source of truth for roles, enums, state machine, data flow, and every REST endpoint (URL, auth, request DTO, response DTO).
> Any change to this file must be agreed by both developers before code changes.
>
> - Backend developer → also read `01_BACKEND.md`
> - Frontend developer → also read `02_FRONTEND.md`

---

## 1. Product Summary

**VeriTwin** creates a tamper-evident **Digital Twin** for each physical product (luxury watch, branded apparel). Each unit has:
- static specs + MRP + batch metadata,
- an **append-only, hash-chained lifecycle log**,
- a live ownership state,
- two physical-world links: a **hidden watermark in the printed logo** (primary) and a **signed fallback QR** (secondary).

Verification verdicts: `GENUINE`, `FAKE`, `ALREADY_CLAIMED`.

---

## 2. Roles & Permission Matrix

| Capability | MANUFACTURER | RETAILER | CONSUMER |
|---|:-:|:-:|:-:|
| Register / login | ✅ | ✅ | ✅ (public signup) |
| Create product master, batches, twins | ✅ | ❌ | ❌ |
| Get watermarked logo + fallback QR assets | ✅ | ❌ | ❌ |
| Append factory events (`QA_PASSED`, `DISPATCHED_TO_RETAIL`) | ✅ | ❌ | ❌ |
| Global analytics + audit + integrity check | ✅ | ❌ | ❌ |
| Scan logo / QR (verify) | ✅ | ✅ | ✅ |
| Append `RECEIVED_AT_RETAIL`, `INSPECTED` | ❌ | ✅ (only twins dispatched to them) | ❌ |
| First sale (`IN_RETAIL` → `SOLD`) | ❌ | ✅ (only their own inventory) | ❌ |
| Edit MRP / specs after creation | ✅ | ❌ | ❌ |
| Transfer ownership after `SOLD` | ❌ | ❌ | ✅ owner only, via P2P handshake |
| View vault (owned twins) | ❌ | ❌ | ✅ |
| Read-only timeline of a scanned twin | ✅ | ✅ | ✅ (identities masked) |

> Public signup creates only `CONSUMER`. `MANUFACTURER` / `RETAILER` signup requires an `invite_code` (configured in backend `.env`) so judges can't self-promote.

---

## 3. Enums & State Machine

### 3.1 Enums (exact strings, used in JSON)

```
user_role:            MANUFACTURER | RETAILER | CONSUMER
product_category:     WATCH | APPAREL | FOOTWEAR | ACCESSORY | OTHER
twin_status:          MANUFACTURED | QA_PASSED | IN_TRANSIT | IN_RETAIL | SOLD
lifecycle_event_type: MANUFACTURED | QA_PASSED | DISPATCHED_TO_RETAIL | RECEIVED_AT_RETAIL
                      | INSPECTED | FIRST_SALE | RESOLD
verification_method:  WATERMARK | QR
scan_verdict:         GENUINE | FAKE | ALREADY_CLAIMED          (LOW_CONFIDENCE is an error response, see 7.5)
transfer_status:      PENDING | CLAIMED | EXPIRED | CANCELLED
allowed_action:       APPEND_EVENT | RECEIVE | INSPECT | SELL | INITIATE_TRANSFER
```

### 3.2 Twin state machine

```
 (create twin) ──► MANUFACTURED ──QA_PASSED──► QA_PASSED ──DISPATCHED_TO_RETAIL──► IN_TRANSIT
                                                                                      │
                                                                         RECEIVED_AT_RETAIL (retailer)
                                                                                      ▼
                                              INSPECTED (no state change) ◄──────► IN_RETAIL
                                                                                      │
                                                                             FIRST_SALE (retailer)
                                                                                      ▼
                                                           SOLD ◄──RESOLD (P2P, owner changes, status stays SOLD)
```

| Event | Allowed when status is | Actor role | New status | Side effects |
|---|---|---|---|---|
| `MANUFACTURED` | (auto on creation) | system/MANUFACTURER | `MANUFACTURED` | — |
| `QA_PASSED` | `MANUFACTURED` | MANUFACTURER | `QA_PASSED` | — |
| `DISPATCHED_TO_RETAIL` | `QA_PASSED` | MANUFACTURER | `IN_TRANSIT` | sets `current_retailer_id` (required) |
| `RECEIVED_AT_RETAIL` | `IN_TRANSIT` and `current_retailer_id == actor` | RETAILER | `IN_RETAIL` | — |
| `INSPECTED` | `IN_RETAIL` and assigned to actor | RETAILER | unchanged | — |
| `FIRST_SALE` | `IN_RETAIL` and assigned to actor | RETAILER | `SOLD` | sets `current_owner_id`, clears nothing else |
| `RESOLD` | `SOLD` | system (P2P claim) | `SOLD` | `current_owner_id` swapped atomically |

Anything else → `409 INVALID_STATE_TRANSITION`.

---

## 4. System Architecture (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACT NATIVE (EXPO) MOBILE APP                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                      │
│  │ MANUFACTURER │ │   RETAILER   │ │   CONSUMER   │  ← role dashboards   │
│  │  dashboard   │ │  dashboard   │ │  dashboard   │                      │
│  └──────────────┘ └──────────────┘ └──────────────┘                      │
│  Dual-mode Scanner: [Logo Capture w/ square guide] ⇄ [QR scan toggle]    │
│  P2P: Transfer QR generator (seller) · Transfer QR scanner (buyer)       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS · JSON / multipart · JWT Bearer
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  NODE.JS (EXPRESS) CORE API   :4000                      │
│  Auth/JWT ─ RBAC guards ─ Zod validation ─ Rate limiting                 │
│  Twin state machine ─ Append-only hash-chained event log                 │
│  QR signer/verifier (HMAC-SHA256) ─ P2P transfer tokens (TTL, 1-use)     │
│  Scan logger ─ Analytics ─ Asset storage ─ FastAPI client                │
└───────┬──────────────────────┬────────────────────────┬─────────────────┘
        │ SQL (tx)             │ files                  │ HTTP multipart
        ▼                      ▼                        │ + X-Internal-Key
┌───────────────┐   ┌─────────────────────┐             ▼
│  PostgreSQL   │   │  Object storage     │   ┌────────────────────────────┐
│ users         │   │  /storage/originals │   │ PYTHON FASTAPI + OPENCV    │
│ products      │   │  /storage/watermarked│  │            :8000 (internal)│
│ batches       │   │  /storage/qr        │   │ POST /internal/watermark/  │
│ digital_twins │   └─────────────────────┘   │      encode  (embed code)  │
│ lifecycle_ev. │                             │ POST /internal/watermark/  │
│ transfer_tok. │                             │      decode  (extract code)│
│ scan_logs     │                             │ GET  /health               │
└───────────────┘                             └────────────────────────────┘
```

---

## 5. Data Flows

### 5.1 Twin creation (Manufacturer) — encode path + QR path
```
App ──POST /manufacturer/twins (multipart: product_id, batch_id, quantity, logo)──► Node
Node: RBAC(MANUFACTURER) → validate product/batch
  for each unit (inside one DB tx):
    1. insert digital_twins row → twin_id (UUID), twin_code (unique 32-bit hex), serial_number
    2. Node ──POST /internal/watermark/encode (image, twin_code)──► FastAPI
       FastAPI embeds imperceptible watermark → returns PNG
    3. Node saves PNG → watermarked_logo_url
    4. Node builds signed QR payload  VT1.<twin_id_b64url>.<HMAC_SHA256_b64url>
       renders QR PNG → fallback_qr_url, stores fallback_qr_payload
    5. append lifecycle event MANUFACTURED (hash chain genesis)
Node ──201 { twins:[{ twin_id, watermarked_logo_url, fallback_qr_url, ...}] }──► App
```

### 5.2 Primary verification — watermark scan
```
App camera (square guide) → crop square → JPEG(q≥0.9, ~1024px)
App ──POST /products/scan-logo (multipart: image)──► Node
Node ──POST /internal/watermark/decode (image)──► FastAPI
FastAPI: perspective fix → denoise → multi-variant decode → CRC + majority vote
         ◄── { decoded, twin_code, confidence }
Node:
  if !decoded OR confidence < THRESHOLD → 422 WATERMARK_LOW_CONFIDENCE (fallback_required=true) [log scan]
  lookup twin by twin_code → none → verdict FAKE
  evaluate twin + caller (see 5.4) → GENUINE | ALREADY_CLAIMED
  log scan_logs, return role-filtered twin view
App: shows verdict; on low-confidence auto-offers "Switch to QR"
```

### 5.3 Fallback verification — signed QR scan
```
App QR mode (expo-camera barcode scanner) → raw string
App ──POST /products/scan-qr { qr_payload }──► Node
Node: parse "VT1.<twin_id>.<sig>" → recompute HMAC → timing-safe compare
  bad format → 422 INVALID_QR_FORMAT
  sig mismatch / unknown twin → verdict FAKE
  else → SAME evaluation as 5.2 (identical twin record, rules, response DTO)
```

### 5.4 Verdict evaluation (shared by both scan paths)
```
twin not found / bad signature            → FAKE
twin.status != SOLD                       → GENUINE
twin.status == SOLD and caller == owner   → GENUINE (is_owner = true)
twin.status == SOLD and caller != owner   → ALREADY_CLAIMED  (limited view, no owner identity, no timeline)
 • Manufacturer role scanning a SOLD item → GENUINE (full view; admin visibility)
 • Retailer who made the first sale        → ALREADY_CLAIMED (retailers cannot override)
```
Every evaluation writes a `scan_logs` row (method, verdict, confidence, scanner, twin).

### 5.5 First sale (Retailer POS)
```
Retailer scans product → twin_id (IN_RETAIL, assigned to them) → allowed_actions includes SELL
Retailer looks up consumer by email → consumer_id
App ──POST /retailer/twins/:id/sell { consumer_id, ... }──► Node
Node tx: lock twin row → check status==IN_RETAIL & retailer match → set SOLD, current_owner_id
         append FIRST_SALE event → commit
```

### 5.6 P2P resale handshake
```
SELLER (owner) ──POST /consumer/transfers { twin_id }──► Node
   Node: verify ownership & no active PENDING token → generate 32-byte random token
         store sha256(token) + expires_at (now+120s), single-use
   ◄── { transfer_id, qr_payload: "VTX1.<token>", expires_at }
   Seller app renders QR + countdown, polls GET /consumer/transfers/:id every 2s

BUYER ──POST /consumer/transfers/claim { qr_payload }──► Node
   Node tx: SELECT token FOR UPDATE → check PENDING, not expired, buyer != seller
            twin.current_owner_id = buyer; token.status = CLAIMED
            append RESOLD event (from_owner, to_owner) → commit
   ◄── { twin, transferred_at }
Seller poll sees status = CLAIMED → closes QR screen, vault refreshes
```

---

## 6. API Conventions

- **Base URL:** `http://<host>:4000/api` (JSON, UTF-8). Uploads use `multipart/form-data`.
- **Auth header:** `Authorization: Bearer <access_token>` on every endpoint except `/auth/register`, `/auth/login`, `/auth/refresh`, `/health`.
- **Tokens:** access JWT 15 min, refresh token 7 days (opaque, rotated on use).
- **IDs:** UUID v4 strings. **Timestamps:** ISO-8601 UTC (`2026-11-17T10:30:00.000Z`). **Money:** number with 2 decimals, `currency` = `"INR"`.
- **Pagination (list endpoints):** query `?page=1&limit=20` (max 100). Response `meta`: `{ "page":1, "limit":20, "total":134, "total_pages":7 }`.

### 6.1 Success envelope
```json
{ "success": true, "data": { }, "meta": { } }
```
(`meta` only on lists.)

### 6.2 Error envelope
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Your role cannot perform this action.",
    "details": { }
  }
}
```

### 6.3 Error codes

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body/query invalid (`details.fields = [{field,message}]`) |
| 400 | `CANNOT_CLAIM_OWN` | buyer == seller on transfer claim |
| 401 | `UNAUTHENTICATED` | missing/invalid token |
| 401 | `TOKEN_EXPIRED` | access token expired → frontend calls `/auth/refresh` once then retries |
| 403 | `FORBIDDEN` | role guard failed |
| 403 | `NOT_ASSIGNED` | retailer acting on twin not assigned to them |
| 403 | `NOT_OWNER` | consumer acting on twin they don't own |
| 404 | `NOT_FOUND` | resource missing (or hidden by ownership rules) |
| 404 | `TRANSFER_INVALID` | unknown transfer token |
| 409 | `CONFLICT` | duplicate SKU / email / batch_no |
| 409 | `INVALID_STATE_TRANSITION` | violates state machine (`details.current_status`, `details.allowed_from`) |
| 409 | `TRANSFER_ALREADY_USED` | token already claimed/cancelled |
| 410 | `TRANSFER_EXPIRED` | token past `expires_at` |
| 413 | `PAYLOAD_TOO_LARGE` | image > 8 MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | not jpeg/png |
| 422 | `WATERMARK_LOW_CONFIDENCE` | decode confidence below threshold → **fallback trigger** |
| 422 | `INVALID_QR_FORMAT` | scanned string is not a VeriTwin QR |
| 429 | `RATE_LIMITED` | too many requests |
| 503 | `IMAGE_SERVICE_UNAVAILABLE` | FastAPI down/timeout |
| 500 | `INTERNAL_ERROR` | unexpected |

### 6.4 Shared object shapes

**User**
```json
{ "user_id":"uuid", "full_name":"Aman Kumar", "email":"a@x.com", "role":"CONSUMER",
  "organization_name":null, "created_at":"2026-11-17T10:00:00.000Z" }
```

**Product** (master)
```json
{ "product_id":"uuid", "sku":"WCH-CHR-001", "name":"Chrono Classic 42", "brand":"Aurelia",
  "category":"WATCH", "mrp":24999.00, "currency":"INR", "material":"316L steel, sapphire glass",
  "specs":{ "case_mm":42, "movement":"Automatic", "water_resistance_m":100 },
  "description":"...", "created_at":"..." }
```

**Batch**
```json
{ "batch_id":"uuid", "batch_no":"B-2026-11-A", "product_id":"uuid", "planned_quantity":100,
  "manufactured_on":"2026-11-10", "factory_location":"Jodhpur, IN", "notes":"", "created_at":"..." }
```

**TimelineEvent**
```json
{ "event_id":"123", "event_type":"FIRST_SALE", "from_status":"IN_RETAIL", "to_status":"SOLD",
  "actor":{ "user_id":"uuid|null", "display":"TimeHouse Retail", "role":"RETAILER" },
  "notes":"Invoice INV-221", "metadata":{ "invoice_no":"INV-221" },
  "created_at":"2026-11-17T10:30:00.000Z", "event_hash":"9be1…" }
```
> **Masking rule:** for `CONSUMER` viewers, actors with role `CONSUMER` appear as `display: "Owner"` / `"Previous owner"` and `user_id: null`. Manufacturer/retailer actors show organization name.

**TwinView** (full view; fields marked † are role-dependent)
```json
{
  "twin_id":"uuid",
  "serial_number":"VT-WCH-2026-000123",
  "twin_code":"9F3A27C1",                 // † MANUFACTURER only
  "status":"IN_RETAIL",
  "product":{ "product_id":"uuid","sku":"WCH-CHR-001","name":"Chrono Classic 42","brand":"Aurelia",
              "category":"WATCH","mrp":24999.00,"currency":"INR","material":"...","specs":{} },
  "batch":{ "batch_id":"uuid","batch_no":"B-2026-11-A","manufactured_on":"2026-11-10","factory_location":"Jodhpur, IN" },
  "current_retailer":{ "user_id":"uuid","organization_name":"TimeHouse Retail" },   // † null for consumers
  "owner":{ "user_id":"uuid","full_name":"Riya S." },                              // † MANUFACTURER, or the owner themself; else null
  "claimed_at":null,
  "timeline":[ /* TimelineEvent[] oldest → newest */ ]
}
```

**LimitedTwinView** (returned for `ALREADY_CLAIMED` to non-owners)
```json
{ "serial_number":"VT-WCH-2026-000123", "status":"SOLD", "claimed_at":"2026-11-17T10:30:00.000Z",
  "product":{ "name":"Chrono Classic 42","brand":"Aurelia","sku":"WCH-CHR-001" } }
```

---

## 7. REST API Specification

Legend: 🔓 public · 🔐 any logged-in role · 🏭 MANUFACTURER · 🏬 RETAILER · 🛍️ CONSUMER

### 7.0 Health

#### `GET /api/health` 🔓
```json
{ "success":true, "data":{ "api":"ok", "db":"ok", "image_service":"ok", "time":"2026-11-17T10:00:00.000Z" } }
```

---

### 7.1 Auth

#### `POST /api/auth/register` 🔓
Request
```json
{
  "full_name":"Riya Sharma",
  "email":"riya@example.com",
  "password":"Str0ngPass!",            // min 8 chars
  "role":"CONSUMER",                    // optional, default CONSUMER
  "organization_name":"TimeHouse Retail", // required if role RETAILER/MANUFACTURER
  "invite_code":"RETAIL-2026"           // required if role RETAILER/MANUFACTURER
}
```
`201`
```json
{ "success":true, "data":{
  "user":{ /* User */ },
  "tokens":{ "access_token":"eyJ…","refresh_token":"d41f…","expires_in":900 }
} }
```
Errors: `400 VALIDATION_ERROR`, `409 CONFLICT` (email exists), `403 FORBIDDEN` (bad invite code).

#### `POST /api/auth/login` 🔓
Request `{ "email":"riya@example.com", "password":"Str0ngPass!" }`
`200` → same shape as register. Errors: `401 UNAUTHENTICATED` (`message: "Invalid email or password"`).

#### `POST /api/auth/refresh` 🔓
Request `{ "refresh_token":"d41f…" }`
`200` → `{ "success":true, "data":{ "tokens":{ "access_token":"…","refresh_token":"…(rotated)","expires_in":900 } } }`
Errors: `401 UNAUTHENTICATED`.

#### `POST /api/auth/logout` 🔐
Request `{ "refresh_token":"d41f…" }` → `200 { "success":true, "data":{ "logged_out":true } }`

#### `GET /api/auth/me` 🔐
`200 { "success":true, "data":{ "user": { /* User */ } } }`

---

### 7.2 Manufacturer (`/api/manufacturer/*`, all 🏭)

#### `POST /api/manufacturer/products`
Request
```json
{ "sku":"WCH-CHR-001","name":"Chrono Classic 42","brand":"Aurelia","category":"WATCH",
  "mrp":24999.00,"currency":"INR","material":"316L steel, sapphire glass",
  "specs":{ "case_mm":42,"movement":"Automatic" },"description":"Limited edition" }
```
`201 { "success":true, "data":{ "product":{ /* Product */ } } }` · Errors: `409 CONFLICT` (SKU exists)

#### `GET /api/manufacturer/products?page=1&limit=20&q=chrono&category=WATCH`
`200 { data:{ "products":[ Product ] }, meta }`

#### `GET /api/manufacturer/products/:productId`
`200 { data:{ "product":Product, "stats":{ "twins_total":120,"sold":40,"in_retail":30 } } }`

#### `PATCH /api/manufacturer/products/:productId`
Request (any subset): `{ "name":"…","mrp":26999.00,"material":"…","specs":{…},"description":"…" }`
`200 { data:{ "product":Product } }` (MRP/spec edits are written to `product_audit` and don't alter old events.)

#### `POST /api/manufacturer/batches`
Request
```json
{ "product_id":"uuid","batch_no":"B-2026-11-A","planned_quantity":100,
  "manufactured_on":"2026-11-10","factory_location":"Jodhpur, IN","notes":"First run" }
```
`201 { data:{ "batch":Batch } }` · Errors: `404 NOT_FOUND` (product), `409 CONFLICT` (batch_no)

#### `GET /api/manufacturer/batches?page=1&limit=20&product_id=uuid`
`200 { data:{ "batches":[ Batch & { "twins_count":25 } ] }, meta }`

#### `POST /api/manufacturer/twins` — create Digital Twins + assets
`multipart/form-data`

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `product_id` | uuid | ✅ | |
| `batch_id` | uuid | ✅ | must belong to product |
| `quantity` | int 1–25 | ❌ default 1 | one twin + watermarked logo + QR per unit |
| `logo` | file (png/jpg, ≥512×512, ≤8MB) | ✅ | base brand logo |

`201`
```json
{ "success":true, "data":{
  "count":2,
  "twins":[
    { "twin_id":"uuid","serial_number":"VT-WCH-2026-000123","twin_code":"9F3A27C1","status":"MANUFACTURED",
      "watermarked_logo_url":"http://host:4000/api/assets/watermarked/uuid.png",
      "fallback_qr_url":"http://host:4000/api/assets/qr/uuid.png",
      "fallback_qr_payload":"VT1.Zm9v….c2ln",
      "created_at":"2026-11-17T10:00:00.000Z" }
  ]
} }
```
Errors: `400 VALIDATION_ERROR`, `413`, `415`, `503 IMAGE_SERVICE_UNAVAILABLE`.
(Asset URLs require `Authorization` header as MANUFACTURER — see `GET /api/assets/...`.)

#### `GET /api/manufacturer/twins?page=1&limit=20&status=IN_RETAIL&product_id=&batch_id=&q=VT-WCH`
`200 { data:{ "twins":[ { "twin_id","serial_number","status","product":{"name","sku"},"batch_no","current_retailer_name","owner_name","created_at" } ] }, meta }`

#### `GET /api/manufacturer/twins/:twinId`
`200 { data:{ "twin":TwinView, "assets":{ "watermarked_logo_url":"…","fallback_qr_url":"…","fallback_qr_payload":"VT1…" } } }`

#### `POST /api/manufacturer/twins/:twinId/events`
Request
```json
{ "event_type":"DISPATCHED_TO_RETAIL",       // QA_PASSED | DISPATCHED_TO_RETAIL
  "notes":"Shipment #S-102",
  "metadata":{ "retailer_id":"uuid" } }       // retailer_id REQUIRED for DISPATCHED_TO_RETAIL
```
`201 { data:{ "event":TimelineEvent, "twin_status":"IN_TRANSIT" } }`
Errors: `409 INVALID_STATE_TRANSITION`, `404 NOT_FOUND` (retailer), `400 VALIDATION_ERROR`.

#### `POST /api/manufacturer/batches/:batchId/events` — bulk
Request `{ "event_type":"QA_PASSED", "notes":"Batch QA OK", "retailer_id":"uuid|omit" }`
`200`
```json
{ "success":true, "data":{ "updated":23, "skipped":[ { "twin_id":"uuid","reason":"INVALID_STATE_TRANSITION","current_status":"IN_RETAIL" } ] } }
```

#### `GET /api/manufacturer/retailers`
`200 { data:{ "retailers":[ { "user_id":"uuid","organization_name":"TimeHouse Retail","email":"…" } ] } }`

#### `GET /api/manufacturer/analytics/overview?days=30`
`200`
```json
{ "success":true, "data":{
  "totals":{ "products":4,"batches":6,"twins":240,"scans":812 },
  "status_breakdown":{ "MANUFACTURED":20,"QA_PASSED":30,"IN_TRANSIT":40,"IN_RETAIL":90,"SOLD":60 },
  "verification_methods":{ "WATERMARK":600,"QR":212,"fallback_rate":0.26 },
  "verdicts":{ "GENUINE":700,"FAKE":45,"ALREADY_CLAIMED":67 },
  "clone_alerts":[ { "twin_id":"uuid","serial_number":"VT-…","already_claimed_scans":6,"last_seen":"…" } ],
  "scans_per_day":[ { "date":"2026-11-16","watermark":22,"qr":8,"fake":1 } ]
} }
```

#### `GET /api/manufacturer/audit?page=1&limit=50&twin_id=&event_type=`
Global events feed. `200 { data:{ "events":[ TimelineEvent & { "twin_id","serial_number" } ] }, meta }`

#### `GET /api/manufacturer/twins/:twinId/integrity`
Re-computes the hash chain.
`200 { data:{ "valid":true, "events_checked":5, "broken_at_event_id":null } }`

#### `GET /api/assets/:kind/:filename` 🏭 (`kind` = `originals` | `watermarked` | `qr`)
Streams image bytes (needs `Authorization`). In React Native use `<Image source={{ uri, headers:{ Authorization } }} />`; for saving use `FileSystem.downloadAsync(uri, path, { headers })`.

---

### 7.3 Retailer (`/api/retailer/*`, all 🏬)

#### `GET /api/retailer/inventory?status=IN_TRANSIT|IN_RETAIL&page=1&limit=20&q=`
Twins assigned to this retailer. `200`
```json
{ "success":true, "data":{ "twins":[
  { "twin_id":"uuid","serial_number":"VT-…","status":"IN_RETAIL","product":{ "name":"Chrono Classic 42","sku":"WCH-CHR-001","mrp":24999.00 },
    "dispatched_at":"…","received_at":"…" } ],
  "counts":{ "IN_TRANSIT":12,"IN_RETAIL":30 } }, "meta":{ } }
```

#### `POST /api/retailer/twins/:twinId/events`
Request
```json
{ "event_type":"RECEIVED_AT_RETAIL",          // RECEIVED_AT_RETAIL | INSPECTED
  "notes":"Box intact",
  "metadata":{ "condition":"OK" } }            // INSPECTED: condition = OK | DAMAGED | SUSPICIOUS
```
`201 { data:{ "event":TimelineEvent, "twin_status":"IN_RETAIL" } }`
Errors: `403 NOT_ASSIGNED`, `409 INVALID_STATE_TRANSITION`.

#### `GET /api/retailer/consumers/lookup?email=riya@example.com`
`200 { data:{ "consumer":{ "user_id":"uuid","full_name":"Riya Sharma","email_masked":"r***@example.com" } } }` · `404 NOT_FOUND`

#### `POST /api/retailer/twins/:twinId/sell` — first-hand POS handover
Request
```json
{ "consumer_id":"uuid","sale_price":24999.00,"invoice_no":"INV-221","notes":"Warranty card given" }
```
`200`
```json
{ "success":true, "data":{
  "twin_id":"uuid","status":"SOLD",
  "owner":{ "user_id":"uuid","full_name":"Riya Sharma" },
  "event":{ /* TimelineEvent FIRST_SALE */ } } }
```
Errors: `403 NOT_ASSIGNED`, `409 INVALID_STATE_TRANSITION` (not `IN_RETAIL`), `404 NOT_FOUND` (consumer must have role CONSUMER).

#### `GET /api/retailer/sales?page=1&limit=20`
`200 { data:{ "sales":[ { "twin_id","serial_number","product_name","consumer_name","sale_price","invoice_no","sold_at" } ] }, meta }`

---

### 7.4 Consumer (`/api/consumer/*`, all 🛍️)

#### `GET /api/consumer/vault?page=1&limit=20`
`200`
```json
{ "success":true, "data":{ "items":[
  { "twin_id":"uuid","serial_number":"VT-…","product":{ "name":"Chrono Classic 42","brand":"Aurelia","mrp":24999.00 },
    "acquired_at":"2026-11-17T10:30:00.000Z","acquired_via":"FIRST_SALE|RESOLD","has_active_transfer":false } ] }, "meta":{ } }
```

#### `GET /api/consumer/vault/:twinId`
`200 { data:{ "twin":TwinView } }` · `403 NOT_OWNER`

#### `POST /api/consumer/transfers` — seller starts handshake
Request `{ "twin_id":"uuid" }`
`201`
```json
{ "success":true, "data":{
  "transfer_id":"uuid","twin_id":"uuid",
  "qr_payload":"VTX1.q3Vf…43chars",
  "status":"PENDING","ttl_seconds":120,
  "expires_at":"2026-11-17T10:32:00.000Z" } }
```
Errors: `403 NOT_OWNER`, `409 CONFLICT` (active transfer exists → backend cancels old one and issues new; frontend never sees this unless race).

#### `GET /api/consumer/transfers/:transferId` — seller polls
`200 { data:{ "transfer_id":"uuid","status":"PENDING|CLAIMED|EXPIRED|CANCELLED","expires_at":"…","claimed_at":null } }`

#### `DELETE /api/consumer/transfers/:transferId` — seller cancels
`200 { data:{ "transfer_id":"uuid","status":"CANCELLED" } }`

#### `POST /api/consumer/transfers/claim` — buyer scans QR
Request `{ "qr_payload":"VTX1.q3Vf…" }`
`200`
```json
{ "success":true, "data":{
  "twin":{ /* TwinView, now owned by caller */ },
  "transferred_at":"2026-11-17T10:31:10.000Z",
  "event":{ /* TimelineEvent RESOLD */ } } }
```
Errors: `404 TRANSFER_INVALID`, `410 TRANSFER_EXPIRED`, `409 TRANSFER_ALREADY_USED`, `400 CANNOT_CLAIM_OWN`, `422 INVALID_QR_FORMAT` (payload doesn't start with `VTX1.`).

---

### 7.5 Dual-Mode Scanning (all roles 🔐)

#### `POST /api/products/scan-logo` — PRIMARY (watermark)
`multipart/form-data`

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `image` | file jpeg/png ≤ 8 MB | ✅ | square crop from guide, JPEG quality ≥ 0.9, ~1024 px |

**Success `200` — GENUINE**
```json
{ "success":true, "data":{
  "scan_id":"uuid",
  "verdict":"GENUINE",
  "verification_method":"WATERMARK",
  "confidence":0.94,
  "is_owner":false,
  "role_view":"FULL",
  "allowed_actions":["RECEIVE","INSPECT","SELL"],
  "twin":{ /* TwinView (role-filtered) */ },
  "message":"Authentic product verified."
} }
```

**Success `200` — ALREADY_CLAIMED**
```json
{ "success":true, "data":{
  "scan_id":"uuid",
  "verdict":"ALREADY_CLAIMED",
  "verification_method":"WATERMARK",
  "confidence":0.91,
  "is_owner":false,
  "role_view":"LIMITED",
  "allowed_actions":[],
  "twin":{ /* LimitedTwinView */ },
  "message":"This item is already claimed and locked. If you are buying it second-hand, ask the owner to start an in-app transfer."
} }
```

**Success `200` — FAKE**
```json
{ "success":true, "data":{
  "scan_id":"uuid",
  "verdict":"FAKE",
  "verification_method":"WATERMARK",
  "confidence":0.93,
  "is_owner":false,
  "role_view":"NONE",
  "allowed_actions":[],
  "twin":null,
  "reason":"TWIN_NOT_FOUND",
  "message":"No matching Digital Twin exists. This product may be counterfeit."
} }
```

**Low-confidence fallback trigger `422`**
```json
{ "success":false, "error":{
  "code":"WATERMARK_LOW_CONFIDENCE",
  "message":"We couldn't read the hidden logo mark reliably. Try better lighting or scan the QR code instead.",
  "details":{ "confidence":0.41, "threshold":0.75, "fallback_required":true,
              "suggested_action":"SWITCH_TO_QR", "scan_id":"uuid" } } }
```

**Other errors:** `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `503 IMAGE_SERVICE_UNAVAILABLE`, `429 RATE_LIMITED`.

#### `POST /api/products/scan-qr` — FALLBACK (signed QR)
Request `{ "qr_payload":"VT1.Zm9v….c2ln" }`

Responses: **identical DTOs** to `scan-logo` with `"verification_method":"QR"` and `"confidence":1.0`.
- Signature mismatch → `200` with `verdict:"FAKE"`, `reason:"INVALID_SIGNATURE"`.
- Unknown twin id → `200` with `verdict:"FAKE"`, `reason:"TWIN_NOT_FOUND"`.
- Not a VeriTwin QR (doesn't start with `VT1.`) → `422 INVALID_QR_FORMAT`.
  (A `VTX1.` transfer QR scanned in verify mode → `422 INVALID_QR_FORMAT` with `details.hint:"TRANSFER_QR"`.)

#### `GET /api/products/twins/:twinId` 🔐
Refresh a twin after a scan (same role filtering). `200 { data:{ "twin":TwinView|LimitedTwinView, "role_view":"FULL|LIMITED", "allowed_actions":[…] } }`

#### `allowed_actions` computation (backend responsibility, frontend just renders buttons)

| Caller | Twin state | `allowed_actions` |
|---|---|---|
| MANUFACTURER | any | `["APPEND_EVENT"]` |
| RETAILER (assigned) | `IN_TRANSIT` | `["RECEIVE"]` |
| RETAILER (assigned) | `IN_RETAIL` | `["INSPECT","SELL"]` |
| CONSUMER owner | `SOLD` | `["INITIATE_TRANSFER"]` |
| anyone else | any | `[]` |

---

## 8. Demo Seed Accounts (backend must seed these; frontend uses them)

| Role | Email | Password | Extra |
|---|---|---|---|
| MANUFACTURER | `maker@veritwin.dev` | `Maker@123` | org "Aurelia Watches" |
| RETAILER | `retail@veritwin.dev` | `Retail@123` | org "TimeHouse Retail" |
| CONSUMER | `riya@veritwin.dev` | `Riya@123` | — |
| CONSUMER | `arjun@veritwin.dev` | `Arjun@123` | second user for P2P demo |

Invite codes (backend `.env`): `MANUFACTURER_INVITE_CODE=MAKER-2026`, `RETAILER_INVITE_CODE=RETAIL-2026`.

---

## 9. Contract Change Protocol

1. Propose change in chat/PR touching only this file.
2. Both approve → bump `Contract version` below.
3. Backend updates API; frontend updates `src/types/api.ts` + mocks.

**Contract version:** `1.0.0`
