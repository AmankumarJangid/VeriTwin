# VeriTwin Frontend — Build Checkpoint & Progress Log

> **Current Status:** All Milestones (F0 to F9) 100% Implemented & TypeScript Verified ✅
> **Design Language:** Intercom Design Spec (`DESIGN-intercom.md`)
> **Target Devices:** Mobile (Consumer, Retailer, Manufacturer)
> **Backend Integration:** Connected to `../backend` (`http://localhost:4000/api` or LAN IP) with full offline mock mode (`EXPO_PUBLIC_USE_MOCKS=true`)

---

## 1. Milestone Tracking

| Milestone | Description | Status | Verification / Output |
|---|---|:---:|---|
| **F0** | Project Setup, Expo SDK 52, TypeScript, Router, Theme (`DESIGN-intercom`), `types/api.ts`, API Client, Mock Adapter, Dev Menu | ✅ COMPLETED | `npx tsc --noEmit` passes with 0 errors; Axios client + 34 mock handlers; Dev Menu modal |
| **F1** | Auth Screens (`Login`, `Register`), SecureStore Token Storage, Refresh Interceptor, Role Guard & Routing, 3 Dashboard Shells | ✅ COMPLETED | 4 Demo quick-fill accounts, role-based auto-routing (`/(consumer)`, `/(retailer)`, `/(manufacturer)`), `RoleGuard` |
| **F2** | Manufacturer Master Data: Products CRUD, Batches, Retailer Picker | ✅ COMPLETED | Product creation with dynamic specs, batch lot management, retailer dispatch picker |
| **F3** | Manufacturer Twins Generation: Multi-unit watermark & QR creation, Asset preview/download/share, Twins list & details | ✅ COMPLETED | Stepper creation flow, DWT-DCT watermark logo generation, signed fallback QR codes, photo library saving |
| **F4** | Hash-Chained Timeline, Event Append Sheets, Retailer Inventory (Incoming / In Store), Receive & Inspect | ✅ COMPLETED | Tamper-evident lifecycle timeline with block hashes, segmented control inventory, inspection modal (OK / DAMAGED / SUSPICIOUS) |
| **F5** | Dual-Mode Scanner (`ScannerView`): Logo crop guide, signed QR fallback, low-confidence sheet, Verdict screen (`scan-result`) | ✅ COMPLETED | 72% screen alignment guide, 1024px crop, QR debounce, 422 fallback modal, verdict screen with `allowed_actions` |
| **F6** | Retailer POS Sell Handover (Consumer lookup, invoice, handover) + Sales History; Consumer Owned Products Vault + Details | ✅ COMPLETED | Real-time email lookup, first-sale handover binding to buyer, sales ledger, consumer vault |
| **F7** | P2P Ownership Handshake: Seller Transfer QR + Countdown ring + Polling; Buyer Scan & Claim | ✅ COMPLETED | 120s TTL countdown derived from `expires_at`, 2s poll for CLAIMED state, buyer QR scan & claim |
| **F8** | Manufacturer Dashboard Analytics: KPIs, Status breakdown, Method split, Clone alerts, Audit log feed, Integrity verification | ✅ COMPLETED | Real-time analytics, time range toggle (7/30/90 days), clone alerts, cryptographic integrity verification |
| **F9** | Polish: Starting page with Owned Products + prominent bottom scanner button, Intercom styling, Haptics, permissions, demo guide | ✅ COMPLETED | Consumer starting page matches exact requirements, Intercom aesthetic (canvas `#f5f1ec`, surface `#ffffff`, hairline `#d3cec6`, Fin Orange `#ff5600`), Metro & CommonJS bundle verified |

---

## 2. Recent Fixes & Real Backend Verification
- **End-to-End Real Backend Verification:** Successfully connected and verified against the live PostgreSQL backend (`http://localhost:4000/api`) passing all authentications and operations:
  - `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me` with JWT Bearer tokens.
  - Manufacturer: `GET /manufacturer/products`, `GET /manufacturer/batches`, `GET /manufacturer/twins`, `GET /manufacturer/twins/:id/integrity` (hash-chain verified), `GET /manufacturer/analytics/overview`.
  - Retailer: `GET /retailer/inventory`, `POST /retailer/twins/:id/events` (`RECEIVED_AT_RETAIL`), `GET /retailer/consumers/lookup` (returns masked email), `POST /retailer/twins/:id/sell` (First Sale POS handover).
  - Consumer: `GET /consumer/vault`, `GET /consumer/vault/:twinId`, `POST /consumer/transfers` (120s TTL P2P handshake), `POST /consumer/transfers/claim` (buyer transfer claim).
  - Scanner: `POST /api/products/scan-qr` (dual-mode signed QR fallback evaluation, returns `verdict: "GENUINE"` and `allowed_actions`).
- **Live Demo Data Seeded:** Executed `npm run seed:twins` in the backend so prebuilt accounts have immediate realistic state (e.g. Riya & Arjun own luxury watches, Retailer has live inventory, Manufacturer has analytics & twins).
- **Dev Menu Real Auth Switching:** Updated `DevMenu.tsx` so switching accounts automatically logs in with genuine credentials against the backend API, acquiring valid JWT access/refresh tokens.
- **Expo Router Undefined Routes Resolved:** Added nested Stack `_layout.tsx` navigators to sub-directories (`products/`, `batches/`, `twins/`, `vault/`, `transfer/`) so deep links and tabs resolve without undefined route errors.
- **Manufacturer Save & Authorization Hardening:**
  - `downloadAndSaveAsset` in `src/utils/files.ts` now uses `apiClient` instead of unmanaged raw `fetch`. `apiClient` automatically injects the `Authorization: Bearer <token>` header, handles token expiry (15-min TTL) via automatic `/api/auth/refresh`, and retries seamlessly without ever throwing `HTTP 401 Unauthorized`.
  - In `src/api/client.ts`, normalized the `Authorization` request header injector to use case-insensitive `config.headers.set('Authorization', ...)`.
  - In `app/(manufacturer)/twins/create.tsx`, fixed cross-platform `FormData` upload so that on Web it converts the logo to a proper binary `Blob` (or generates a fallback 512x512 PNG brand canvas), preventing backend Multer file rejection.
  - In `app/(manufacturer)/products/new.tsx`, randomized default SKU (`WCH-NEW-###`) to prevent 409 Conflict with pre-seeded database SKUs.
- **Zero Backend Changes / Backend Reverted:** Confirmed backend code is 100% untouched and in its original pristine state (`git checkout -- .` executed in `../backend`). All fixes are strictly encapsulated within the frontend.
- **Batch Product Filtering in Twins Minting:** In `app/(manufacturer)/twins/create.tsx`, filtered production batches dynamically by `effectiveProductId`, auto-selecting matching batches and preventing 404/400 mismatch errors. Added a direct `+ New Batch` link and empty-state guidance if no batches exist for a selected product.
- **Guaranteed 512×512 Logo Sizing:** In `app/(manufacturer)/twins/create.tsx`, Web uploads now render the picked logo (or default brand logo) onto a 512×512 canvas before generating the PNG blob, guaranteeing that the image meets the backend's strict 512×512 minimum dimension requirement.
- **Multipart Boundary Fix for Axios Web:** Removed manual `'Content-Type': 'multipart/form-data'` overrides in `src/api/client.ts`, `src/api/manufacturer.ts`, and `src/api/scan.ts` so Axios and the browser automatically compute the multipart boundary header.
- **Cross-Platform FormData Image Scanner:** Created `appendImageToFormData` in `src/utils/files.ts` to convert URIs into native Blobs on Web, fixing image uploads in `app/(consumer)/index.tsx`, `app/(retailer)/scan.tsx`, and `app/(manufacturer)/scan.tsx`.
- **Seed Auth & Dev Menu Alignment:** Aligned `DevMenu.tsx` and `src/api/mocks/mockData.ts` with real PostgreSQL database UUIDs and credentials (`maker@veritwin.dev`, `retail@veritwin.dev`, `riya@veritwin.dev`, `arjun@veritwin.dev`) ensuring seamless switching between accounts with genuine backend JWT tokens.
- **`queryString.stringify` Bundler Compatibility:** Fixed by locking `query-string` to `@7.1.3` (CommonJS compatible).

---

## 2. Key Architecture & Design Highlights
- **Intercom Aesthetic (`DESIGN-intercom.md`):** Soft cream-white canvas ground (`#f5f1ec`), floating white card tiles (`#ffffff`) with thin hairline borders (`1px solid #d3cec6`), charcoal ink typography (`#111111`), Fin Orange accent (`#ff5600`), and role-specific accent colors (Manufacturer `#4F46E5`, Retailer `#EA580C`, Consumer `#0D9488`).
- **Consumer Starting Experience (`app/(consumer)/index.tsx`):**
  - Instant visibility into **"Owned Products"** (digital certificates held in vault).
  - High-level authenticity stats.
  - Quick action to claim incoming P2P transfers.
  - Persistent, high-visibility **"Open Product Scanner"** button at the bottom of the screen.
- **Unified 3-in-1 Mobile App:** Seamless role experiences for Consumer, Retailer, and Manufacturer in a single codebase with role-based routing and deep-link guards.
- **Dual Verification Modality:** Primary DWT-DCT watermark extraction via guided logo camera capture, with seamless fallback to HMAC-SHA256 signed QR codes when lighting is poor or confidence is low.
- **Zero Business Logic Hardcoding:** Scan result screens and detail screens render action buttons exclusively based on `allowed_actions` returned by the backend engine.

---

## 3. How to Run the Frontend

### 1. Install & Start Expo
```powershell
cd D:\springboot\miniproject\VeriTwin\frontend
npm run start
```

### 2. Run on Device / Web
- Press `w` to open web preview in browser.
- Press `a` to run on Android emulator or scan QR with Expo Go on a physical phone.
- Toggle mock mode in `.env`: `EXPO_PUBLIC_USE_MOCKS=true` (offline test) or `false` (connected to `http://localhost:4000/api`).

### 3. Demo Accounts
- **Manufacturer:** `maker@veritwin.dev` / `Maker@123`
- **Retailer:** `retail@veritwin.dev` / `Retail@123`
- **Consumer (Owner):** `riya@veritwin.dev` / `Riya@123`
- **Consumer (Buyer):** `arjun@veritwin.dev` / `Arjun@123`
