# VeriTwin — Frontend Work Spec (React Native / Expo)

> **Owner:** Frontend developer. **Read first:** `00_SHARED_CONTRACT.md` (API URLs, DTOs, enums). This file covers *what to build and how*.
> **Rule:** never invent endpoints/fields. If the backend DTO is missing something you need, raise it and update the contract together.
> You can build **everything against mocks** (§8) before the backend is ready.

## 0. Prompt for Antigravity / AI agent

```
You are building the mobile app of VeriTwin (Expo, React Native, TypeScript).
Read 00_SHARED_CONTRACT.md and 02_FRONTEND.md fully.
Build one app with three role-based dashboards (MANUFACTURER, RETAILER, CONSUMER) chosen after login,
a dual-mode scanner (guided logo capture + QR fallback), and a P2P transfer QR generator/scanner.
Use the exact DTOs from the contract to write src/types/api.ts, then build an API layer with a mock adapter
(EXPO_PUBLIC_USE_MOCKS=true) so the UI works without the backend.
Follow the folder structure, screen list, and milestones in 02_FRONTEND.md. Build milestone by milestone.
```

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK (latest stable), React Native, **TypeScript** |
| Navigation | `expo-router` (file-based), role-based route groups |
| Server state | `@tanstack/react-query` |
| Client state | `zustand` (auth/session only) |
| HTTP | `axios` with interceptors (auth header, refresh-on-401) |
| Secure storage | `expo-secure-store` (tokens) |
| Camera + QR scan | `expo-camera` (`CameraView` with `onBarcodeScanned`, `barcodeScannerSettings={{ barcodeTypes:['qr'] }}`) |
| Image crop/resize | `expo-image-manipulator` |
| QR render | `react-native-qrcode-svg` + `react-native-svg` |
| Save/share assets | `expo-file-system`, `expo-sharing`, `expo-media-library` |
| Forms | `react-hook-form` + `zod` |
| Charts | `react-native-gifted-charts` (or simple bar views) |
| Mocks | `axios-mock-adapter` |
| UI kit | `react-native-paper` **or** hand-rolled components (pick one, be consistent) |
| Icons | `@expo/vector-icons` |

## 2. Project Structure

```
mobile/
├─ app/                                   # expo-router
│  ├─ _layout.tsx                         # providers, auth gate
│  ├─ index.tsx                           # redirect by role
│  ├─ (auth)/ login.tsx · register.tsx
│  ├─ (manufacturer)/
│  │   ├─ _layout.tsx                     # tabs: Dashboard · Twins · Create · Scan · Profile
│  │   ├─ index.tsx                       # dashboard / analytics
│  │   ├─ products/ index.tsx · new.tsx · [id].tsx
│  │   ├─ batches/ index.tsx · new.tsx
│  │   ├─ twins/ index.tsx · create.tsx · [id].tsx
│  │   ├─ audit.tsx
│  │   ├─ scan.tsx
│  │   └─ profile.tsx
│  ├─ (retailer)/
│  │   ├─ _layout.tsx                     # tabs: Inventory · Scan · Sales · Profile
│  │   ├─ index.tsx · scan.tsx · sell/[twinId].tsx · sales.tsx · profile.tsx
│  ├─ (consumer)/
│  │   ├─ _layout.tsx                     # tabs: Verify · My Vault · Scan Transfer · Profile
│  │   ├─ index.tsx (Verify/scan) · vault/index.tsx · vault/[twinId].tsx
│  │   ├─ transfer/[twinId].tsx           # seller: show QR
│  │   ├─ transfer/claim.tsx              # buyer: scan QR
│  │   └─ profile.tsx
│  └─ scan-result.tsx                     # shared verdict screen (modal)
├─ src/
│  ├─ api/ client.ts · auth.ts · manufacturer.ts · retailer.ts · consumer.ts · scan.ts · mocks/
│  ├─ types/api.ts                        # 1:1 with contract DTOs & enums
│  ├─ store/ authStore.ts
│  ├─ hooks/ useScanner.ts · useCountdown.ts · useRoleGuard.ts
│  ├─ components/
│  │   ├─ ScannerView.tsx                 # dual-mode camera
│  │   ├─ VerdictBanner.tsx · StatusBadge.tsx · TwinCard.tsx · Timeline.tsx · SpecList.tsx
│  │   ├─ QRCodeCard.tsx · CountdownRing.tsx · EmptyState.tsx · ErrorState.tsx · FormField.tsx
│  │   └─ RoleGuard.tsx · Button.tsx · Screen.tsx
│  ├─ theme/ colors.ts · spacing.ts · typography.ts
│  └─ utils/ format.ts · errors.ts · files.ts
└─ app.json                               # camera/media permission strings
```

## 3. Config

`.env`
```
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api     # your laptop's LAN IP (phone & laptop on same Wi-Fi)
EXPO_PUBLIC_USE_MOCKS=false
```
`app.json` → add permission strings:
- iOS `NSCameraUsageDescription`: "VeriTwin uses the camera to verify products."
- iOS `NSPhotoLibraryAddUsageDescription`: "Save generated logos and QR codes."
- Android permissions: `CAMERA`, `READ_MEDIA_IMAGES`.

## 4. Architecture Rules

### 4.1 Auth & routing
- On app start: read tokens from SecureStore → `GET /auth/me` → route by `user.role` to `(manufacturer)` / `(retailer)` / `(consumer)`. No token → `(auth)/login`.
- `RoleGuard`: if a user lands in the wrong group (deep link), redirect to their own.
- Logout: call `/auth/logout`, wipe SecureStore + React Query cache.

### 4.2 API client (`src/api/client.ts`)
- Axios instance with `baseURL`. Request interceptor attaches `Authorization: Bearer`.
- Response interceptor: on `401 TOKEN_EXPIRED` → call `/auth/refresh` **once** (queue concurrent requests), store rotated tokens, retry. If refresh fails → logout.
- Unwrap `{ success, data, meta }`. On `success:false` throw an `ApiError { code, message, details, status }`. All screens branch on `error.code`, never on message text.
- Multipart helper for uploads: `FormData` with `{ uri, name:'scan.jpg', type:'image/jpeg' }`.

### 4.3 UI states (every screen)
Loading skeleton/spinner · empty state · error state with Retry · pull-to-refresh on lists · disabled button + spinner during mutations · toast on success/failure.

### 4.4 Visual language
- Verdict colours: `GENUINE` green `#16A34A` ✓ · `FAKE` red `#DC2626` ✕ · `ALREADY_CLAIMED` amber `#D97706` 🔒 · low-confidence neutral/blue `#2563EB`.
- Status badge colours per `twin_status` (MANUFACTURED grey, QA_PASSED blue, IN_TRANSIT purple, IN_RETAIL teal, SOLD green).
- Role accent colour in the header (Manufacturer indigo, Retailer orange, Consumer teal) so each dashboard feels distinct.
- Large, readable verdict screen with haptic feedback (`expo-haptics`) — success/warning/error.

---

## 5. Scanner (the most important component)

### 5.1 `ScannerView` props
```ts
type Props = {
  mode: 'LOGO' | 'QR';
  onModeChange(mode: 'LOGO'|'QR'): void;
  onLogoCaptured(uri: string): void;        // already cropped + resized JPEG
  onQrScanned(payload: string): void;
  busy?: boolean;
  hint?: string;
};
```

### 5.2 Logo mode behaviour
1. `CameraView` full screen + **square alignment guide** overlay (≈ 70 % of screen width, corner brackets, text "Align the logo inside the square").
2. Capture button → `takePictureAsync({ quality: 1, skipProcessing: false })`.
3. Compute crop rect from guide position relative to the captured image size (account for camera aspect ratio vs. screen; keep it simple by using a center square of side = `min(width,height) * 0.7`).
4. `ImageManipulator.manipulateAsync(uri, [{ crop }, { resize:{ width:1024 } }], { compress:0.92, format: JPEG })`.
5. Call `POST /products/scan-logo` (multipart field name **`image`**). Show "Analyzing…" overlay.
6. Do **not** over-compress (watermark is subtle). Do not apply filters.
7. Also offer "Pick from gallery" (`expo-image-picker`) for testing with saved photos.

### 5.3 QR mode behaviour
- `onBarcodeScanned` fires repeatedly → debounce: ignore events while `busy` or within 2 s of the last scan; lock after first valid read.
- Send the raw string to `POST /products/scan-qr` as `{ qr_payload }`.

### 5.4 Fallback logic (implements contract §7.5)
- Logo scan returns `422 WATERMARK_LOW_CONFIDENCE` (`details.fallback_required === true`) → show bottom sheet:
  - Title: "Couldn't read the logo mark"
  - Body: use `error.message`
  - Buttons: **Retry logo scan** · **Switch to QR scan** (sets mode to `QR`, keeps camera open)
- After 2 consecutive low-confidence failures → auto-switch to QR mode with a toast.
- `503 IMAGE_SERVICE_UNAVAILABLE` → same sheet but only offering QR.

### 5.5 Verdict screen (`/scan-result`, shared by all roles)
Input: the `data` object from the scan response (pass via router params/store).
- **GENUINE**: green banner, product name/brand, MRP, status badge, specs list, batch info, **Timeline**. If `is_owner` show "You own this item". Buttons come only from `allowed_actions`:
  - `RECEIVE` → "Mark received" (calls retailer events)
  - `INSPECT` → "Log inspection" (condition picker OK/DAMAGED/SUSPICIOUS + notes)
  - `SELL` → navigates to `(retailer)/sell/[twinId]`
  - `APPEND_EVENT` → navigates to manufacturer twin detail
  - `INITIATE_TRANSFER` → navigates to `(consumer)/transfer/[twinId]`
- **ALREADY_CLAIMED**: amber lock banner, `message` text, limited info (product name, brand, serial, claimed date). No timeline. Tip text about asking the owner for an in-app transfer.
- **FAKE**: red banner, `message`, `reason` shown in a small "technical detail" row, **Report** button (UI only, shows toast).
- Show `verification_method` chip (Watermark / QR) and confidence % (for WATERMARK).

---

## 6. Screens by Role (with API mapping)

### 6.1 Auth (all roles)
| Screen | UI | API |
|---|---|---|
| Login | email + password, show/hide, "Create account" link, **demo account quick-fill chips** (4 seeded accounts) | `POST /auth/login` |
| Register | name, email, password, role selector (Consumer / Retailer / Manufacturer); organization + invite code fields appear for non-consumer | `POST /auth/register` |

### 6.2 MANUFACTURER dashboard
| Screen | UI | API |
|---|---|---|
| **Dashboard** | KPI cards (products, batches, twins, scans), status breakdown (stacked bar), verification-method split (Watermark vs QR + fallback %), verdict counts, scans-per-day chart, **Clone alerts** list (tap → twin detail) | `GET /manufacturer/analytics/overview?days=` (range toggle 7/30/90) |
| Products list | search, category filter chips, FAB "New product" | `GET /manufacturer/products` |
| New / edit product | SKU, name, brand, category, MRP, material, description, **dynamic key-value specs editor** | `POST /manufacturer/products`, `PATCH …/:id` |
| Product detail | info + stats | `GET /manufacturer/products/:id` |
| Batches list / new | product picker, batch no, qty, date picker, location | `GET/POST /manufacturer/batches` |
| **Create twins** | stepper: 1) pick product → 2) pick batch → 3) quantity (1–25) → 4) pick base logo (gallery) with preview → 5) Generate (progress/spinner; may take several seconds). **Result screen:** per twin card with watermarked logo preview, QR preview, **Save to gallery / Share** buttons, serial number | `POST /manufacturer/twins` (multipart), assets via `GET /assets/...` with auth header |
| Twins list | status filter chips, search by serial, infinite scroll | `GET /manufacturer/twins` |
| Twin detail | full TwinView, assets (logo + QR with download), **Timeline**, owner, retailer, **"Verify integrity"** button → shows ✅ chain valid / ❌ broken at event X, **Append event** sheet (QA_PASSED, DISPATCHED_TO_RETAIL + retailer picker) | `GET /manufacturer/twins/:id`, `POST …/events`, `GET …/integrity`, `GET /manufacturer/retailers` |
| Bulk event | on batch detail: "Mark whole batch QA passed / dispatch to retailer", show `updated` and `skipped` result | `POST /manufacturer/batches/:id/events` |
| Audit feed | global events, filter by event type, tap → twin | `GET /manufacturer/audit` |
| Scan | shared ScannerView → verdict screen | scan endpoints |

### 6.3 RETAILER dashboard
| Screen | UI | API |
|---|---|---|
| **Inventory** | segmented control "Incoming (IN_TRANSIT)" / "In store (IN_RETAIL)", counts as badges, rows with product, serial, status | `GET /retailer/inventory?status=` |
| **Scan** | ScannerView (default LOGO, toggle QR) → verdict screen with `allowed_actions` buttons | scan endpoints, `POST /retailer/twins/:id/events` |
| **Sell (POS)** | product summary card (MRP), consumer email field + "Find" → shows consumer name & masked email, sale price (prefilled with MRP, editable), invoice no, notes, **Confirm sale** with confirm dialog | `GET /retailer/consumers/lookup`, `POST /retailer/twins/:id/sell` |
| Sale success | green check, summary, "Scan next" | — |
| Sales history | list with date, product, buyer, price | `GET /retailer/sales` |
| Restriction UX | No create/edit UI anywhere; if a SOLD item is scanned show ALREADY_CLAIMED (no override button) | — |

### 6.4 CONSUMER dashboard
| Screen | UI | API |
|---|---|---|
| **Verify (home)** | big ScannerView with mode toggle (Logo default / QR) → verdict screen | scan endpoints |
| **My Vault** | grid/list of owned items (product, serial, acquired date, "Transfer pending" chip) | `GET /consumer/vault` |
| Vault item detail | TwinView, MRP, specs, read-only Timeline (identities masked), **"Sell / Transfer"** button | `GET /consumer/vault/:twinId` |
| **Transfer (seller)** | `POST /consumer/transfers` on open → shows large QR (`qr_payload`), **countdown ring** from `expires_at`, "Cancel transfer" button, **poll `GET /consumer/transfers/:id` every 2 s**; on `CLAIMED` → success animation → back to vault (invalidate vault query); on `EXPIRED` → "Expired, generate new" button | transfers endpoints |
| **Scan Transfer (buyer)** | QR-only scanner (no logo mode) → `POST /consumer/transfers/claim` → success screen with the item and "View in vault"; handle `TRANSFER_EXPIRED`, `TRANSFER_ALREADY_USED`, `CANNOT_CLAIM_OWN`, `INVALID_QR_FORMAT` with friendly messages | `POST /consumer/transfers/claim` |
| Restriction UX | Consumers see no edit controls; timeline read-only | — |

### 6.5 Error-code → UI message map (`utils/errors.ts`)
| Code | Message |
|---|---|
| `TOKEN_EXPIRED` / `UNAUTHENTICATED` | silent refresh → else "Session expired, please log in" |
| `FORBIDDEN` | "You don't have permission for that." |
| `NOT_ASSIGNED` | "This item isn't assigned to your store." |
| `NOT_OWNER` | "You don't own this item." |
| `INVALID_STATE_TRANSITION` | "That step isn't allowed right now (current status: {details.current_status})." |
| `TRANSFER_EXPIRED` | "This transfer QR has expired. Ask the seller to generate a new one." |
| `TRANSFER_ALREADY_USED` | "This transfer was already used or cancelled." |
| `CANNOT_CLAIM_OWN` | "You can't claim your own item." |
| `INVALID_QR_FORMAT` | "That isn't a VeriTwin QR code." (if `details.hint==='TRANSFER_QR'`: "That's a transfer QR — use Scan Transfer.") |
| `WATERMARK_LOW_CONFIDENCE` | bottom sheet (see §5.4) |
| `IMAGE_SERVICE_UNAVAILABLE` | "Logo scanning is unavailable, use QR." |
| `RATE_LIMITED` | "Too many attempts, wait a moment." |
| network error | "Can't reach server. Check Wi-Fi and API URL." |

---

## 7. Shared Components Spec

- **Timeline**: vertical list (oldest → newest); icon per `event_type`; shows `actor.display` + role chip, `created_at` (relative + absolute), notes; latest highlighted; expandable `event_hash` (short 8-char hash with "chain verified" lock icon).
- **StatusBadge**: pill by `twin_status`.
- **VerdictBanner**: icon + title + subtitle by verdict.
- **QRCodeCard**: `react-native-qrcode-svg` with white padding (quiet zone), size ≥ 260 for transfer.
- **CountdownRing**: derived from `expires_at` (not a local timer start) so it stays correct after app backgrounding.
- **SpecList**: renders `product.specs` object as key/value rows (prettify keys).

## 8. Mock Mode (so you're never blocked by the backend)

- `EXPO_PUBLIC_USE_MOCKS=true` installs `axios-mock-adapter` with handlers for **every** endpoint in the contract returning the exact example JSON from `00_SHARED_CONTRACT.md`.
- Add scenario switches in a hidden **Dev Menu** (long-press the logo on Login):
  - Scan outcome: `GENUINE` / `ALREADY_CLAIMED` / `FAKE` / `LOW_CONFIDENCE` / `SERVICE_DOWN`
  - Role to impersonate (swap seeded user)
  - Transfer behaviour: `CLAIMED_AFTER_5S` / `EXPIRES` / `ALREADY_USED`
  - Network latency (0 / 800 / 2500 ms)
- Stateful mock store (in-memory) so create → dispatch → sell flows visibly change data during UI testing.
- `src/types/api.ts` must mirror the contract **exactly** (enums as string-literal unions). When backend is ready, flip the env var and fix any drift — don't edit types silently.

## 9. Accessibility & Polish
- Minimum touch target 44 px; text contrast AA; support dark mode via `useColorScheme` (stretch).
- Haptics on verdict; sound optional.
- Keyboard-avoiding forms; `returnKeyType` next/done.
- Handle camera permission denied: friendly screen with "Open settings" button.
- Handle Android back button on scanner and result screens.
- Keep screen awake on transfer QR screen (`expo-keep-awake`) and raise brightness hint.

## 10. Milestones (frontend)

| # | Milestone | Done when | Needs from backend |
|---|---|---|---|
| **F0** | Expo + TS + router + theme + `types/api.ts` + API client + mock adapter + Dev Menu | app boots, mock login returns user | — |
| **F1** | Auth screens, token storage, refresh interceptor, role routing, 3 empty dashboard shells | log in as each seeded role → correct tabs | B1 (switch off mocks) |
| **F2** | Manufacturer: products, batches, retailers picker | CRUD forms validate and call API | B2 |
| **F3** | Manufacturer: **Create twins** flow + asset preview/save/share + twins list/detail | watermarked logo + QR visible and saveable | B3 |
| **F4** | Timeline + event append sheets + retailer inventory + receive/inspect | status changes reflect in UI | B4 |
| **F5** | **ScannerView (logo + QR) + fallback sheet + verdict screen** for all roles | all 4 outcomes render correctly; QR + logo both work on a real phone | B5 |
| **F6** | Retailer POS sell flow + sales history; Consumer vault + detail | sale then item appears in Riya's vault | B6 |
| **F7** | **P2P transfer** (seller QR + countdown + polling; buyer scan + claim) | two phones: transfer completes, both vaults update | B7 |
| **F8** | Manufacturer dashboard analytics + audit feed + integrity button | charts render from API | B8 |
| **F9** | Polish: empty/error states, haptics, permission screens, app icon/splash, demo mode, APK/Expo Go instructions | full demo script passes without dev menu | B9 |

**Sync points with backend:** after F1/B1, F3/B3, F5/B5, F7/B7. Test on a **real phone** from F3 onward (camera features don't work properly on simulators).

## 11. Definition of Done
- All screens in §6 implemented for the three roles with loading/empty/error states.
- Scanner supports both modes, correct crop, fallback sheet, debounce, permission handling.
- Zero hard-coded business rules — buttons rendered purely from `allowed_actions`, verdict/state from API.
- Works in mock mode and against the real API by flipping one env variable.
- README with setup (`npm i`, `npx expo start`, set `EXPO_PUBLIC_API_URL`), demo accounts, and screenshots.

## 12. Demo Checklist (matches backend §13)
- [ ] Manufacturer creates twins; saves watermarked logo + QR to phone; prints/shows them on a second screen.
- [ ] Retailer receives, inspects, sells to Riya (seeded consumer).
- [ ] Arjun scans the sold item → **ALREADY_CLAIMED** lock screen.
- [ ] Scan random image → **FAKE**.
- [ ] Bad lighting/blur → **low-confidence sheet → QR fallback** works.
- [ ] Riya shows transfer QR, Arjun scans it → ownership moves, timeline shows `RESOLD`.
- [ ] Manufacturer dashboard shows scans, fallback %, clone alert; integrity check ✅.
