# VeriTwin — Setup, Run & Testing Guide

This guide contains all requirements, startup commands, and testing procedures for the VeriTwin project.

---

## 1. Prerequisites & Requirements

Ensure the following are installed on your system:

| Tool | Version | Purpose | Current Status |
|---|---|---|---|
| **Node.js** | 20+ (v24 installed) | Backend API & Testing runtime | ✅ Installed |
| **PostgreSQL** | 15+ (v18 installed) | Primary relational database | ✅ Configured via pgAdmin 4 |
| **pgAdmin 4** | Any | Database administration UI | ✅ Running with `veritwin` DB |
| **Python** *(Optional)* | 3.11 / 3.12 | Image watermark microservice | ✅ Optional (Mock mode available) |

---

## 2. Database Configuration

Your database has already been configured in pgAdmin 4:
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `veritwin`
- **User:** `veritwin`
- **Password:** `veritwin`

Connection string in `backend/api/.env`:
```env
DATABASE_URL=postgresql://veritwin:veritwin@localhost:5432/veritwin
```

---

## 3. How to Run the Backend Server

### Step 1: Open Terminal in API Directory
```powershell
cd D:\mini_project\VeriTwin\backend\api
```

### Step 2: Start the Server in Development Mode
```powershell
npm run dev
```

### Expected Startup Output:
```text
✅ Migration 001_init.sql applied.
✅ Seed data inserted successfully.
🚀 VeriTwin API running on port 4000 [development]
```
*(On first run, the server automatically creates all database tables, triggers, and seeds the 4 demo accounts).*

---

### Step 3: Verify Server is Running
Open your browser or run:
```powershell
curl http://localhost:4000/api/health
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "api": "ok",
    "db": "ok",
    "image_service": "ok",
    "time": "2026-11-18T16:00:00.000Z"
  }
}
```

---

## 4. Pre-Seeded Demo Accounts

The database comes pre-seeded with these test credentials:

| Role | Email | Password | Organization / Notes |
|---|---|---|---|
| **MANUFACTURER** | `maker@veritwin.dev` | `Maker@123` | Aurelia Watches |
| **RETAILER** | `retail@veritwin.dev` | `Retail@123` | TimeHouse Retail |
| **CONSUMER** | `riya@veritwin.dev` | `Riya@123` | Primary Consumer (Riya Sharma) |
| **CONSUMER** | `arjun@veritwin.dev` | `Arjun@123` | Second Consumer for P2P Resale demo |

**Registration Invite Codes** *(configured in `.env`)*:
- Manufacturer Invite Code: `MAKER-2026`
- Retailer Invite Code: `RETAIL-2026`

---

## 5. (Optional) Python Watermark Service (Port 8000)

> **Note:** By default, `IMAGE_SERVICE_MOCK=true` is enabled in `backend/api/.env`, so you **do NOT need** to run Python for the API or Frontend to work.

If you wish to run the real Python DWT-DCT watermark service:

1. Open a new terminal:
   ```powershell
   cd D:\mini_project\VeriTwin\backend\image-service
   .\run.ps1
   ```
   *(Or double-click **`run.bat`** in that folder).*
2. In `backend/api/.env`, set:
   ```env
   IMAGE_SERVICE_MOCK=false
   ```
3. Restart the Node server (`npm run dev`).

---

## 6. Testing Section

The testing environment is located in the dedicated **`testing/`** folder.

### A. Run Special Unit Tests (Fast & Isolated)
These test the cryptographic and business logic (HMAC QR signatures, state machine transitions, SHA-256 hash chaining, role masking, and P2P tokens). **No running database or server required.**

```powershell
cd D:\mini_project\VeriTwin\testing
npm run test:unit
```

Expected Result:
```text
✓ src/unit/stateMachine.test.ts   (7 tests)
✓ src/unit/hashChain.test.ts      (3 tests)
✓ src/unit/qrSigner.test.ts       (6 tests)
✓ src/unit/twinViewMasking.test.ts (5 tests)
✓ src/unit/transferSecurity.test.ts (5 tests)
✓ src/unit/serialAndCodes.test.ts (3 tests)

Test Files  6 passed (6)
Tests       29 passed (29)
```

---

### B. Run API Integration Tests
These test live HTTP requests against your running backend API.

1. **Terminal 1:** Ensure your backend API is running:
   ```powershell
   cd D:\mini_project\VeriTwin\backend\api
   npm run dev
   ```
2. **Terminal 2:** Run the integration test suite:
   ```powershell
   cd D:\mini_project\VeriTwin\testing
   npm run test:integration
   ```

What this suite tests:
- `auth.test.ts`: Register, login, refresh token rotation, invite code enforcement.
- `rbac.test.ts`: Role-based access guards (401 unauthenticated & 403 forbidden).
- `lifecycle.test.ts`: Full product lifecycle from creation -> QA -> retail dispatch -> POS sale to consumer.
- `scanning.test.ts`: Dual-mode verification (Watermark & QR) returning `GENUINE`, `FAKE`, `ALREADY_CLAIMED`, and 422 fallback.
- `p2pTransfer.test.ts`: Consumer P2P transfer handshake, single-use token checks, and atomic ownership swap.
- `integrityAudit.test.ts`: Tamper-evident hash chain verification and analytics feed.

---

### C. Run All Tests Together
```powershell
cd D:\mini_project\VeriTwin\testing
npm test
```

---

## 7. Useful NPM Commands Reference

### In `backend/api/`:
- `npm run dev`: Starts the API server with nodemon auto-reload on port 4000.
- `npm run build`: Compiles TypeScript into JavaScript (`dist/`).
- `npm start`: Runs the compiled production server from `dist/server.js`.
- `npm test`: Runs the internal unit tests.

### In `testing/`:
- `npm run test:unit`: Runs the 29 unit tests.
- `npm run test:integration`: Runs the end-to-end integration tests.
- `npm test`: Runs both unit and integration suites.
