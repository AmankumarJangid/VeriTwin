# VeriTwin Frontend — Comprehensive Failure Report & Remediation Plan

**Generated On:** November 18, 2026  
**Audience:** Full-Stack & Mobile Development Team  
**Workspace:** `D:\mini_project\VeriTwin\frontend`  
**Reference Contracts:** `00_SHARED_CONTRACT.md`, `02_FRONTEND.md`

---

## 1. Executive Summary

A deep audit of recent git changes, frontend architecture, and API integration points ("both ends") was conducted across the VeriTwin mobile application (Expo SDK 52, React Native 0.76, TypeScript, `@tanstack/react-query`, `zustand`, `expo-router`).

While Metro bundles and exports the web distribution without packaging errors, **several critical failures prevent the frontend from functioning properly**, especially when transitioning from the mock layer (`EXPO_PUBLIC_USE_MOCKS=true`) to the live backend API (`EXPO_PUBLIC_USE_MOCKS=false`).

### Summary of Identified Issues:
1. **TypeScript Typecheck Failure**: `npm run type-check` fails due to an erroneous non-existent type import.
2. **Broken Linter Tooling**: `npm run lint` fails because `eslint` binary is missing from `devDependencies`.
3. **Broken Twin Minting Flow (Blocker)**: `CreateTwinsScreen` sends a plain JavaScript object without attaching the brand logo file; the real backend multer controller strictly requires `upload.single('logo')` (min 512x512px).
4. **Broken Asset Viewing & Saving (401 Unauthorized)**: Authentication artifacts (`/api/assets/*`) require `Authorization: Bearer <token>`, but `<Image>` components and web download links make unauthenticated GET requests.
5. **Web Multi-Part Upload Incompatibility**: React Native `{ uri, name, type }` FormData objects fail on React Native Web, breaking watermark scanning in browser environments.
6. **Dev Tools Token Invalidation**: Impersonating demo users in the Dev Menu injects mock JWTs that immediately break live backend endpoints with `401 Invalid Token`.
7. **Missing Server Session Termination**: Logout clears local state but never notifies the server (`POST /api/auth/logout`), leaking active refresh tokens.
8. **Startup Session Verification Gap**: Token initialization reads local storage without validating against `GET /api/auth/me`.
9. **Volatile Global Scan State**: Scan results are stored on `global.__VERITWIN_SCAN_RESULT__`, which is wiped on browser refresh or OS memory eviction.
10. **Timer Infinite Callback Loop**: `CountdownRing` fails to cancel its interval when time expires, repeatedly invoking `onExpire()`.
11. **Silent Stock Photo Fallback in Scanner**: Camera capture failures silently fall back to an Unsplash watch URL instead of prompting the user.
12. **Floating Dev Pill Obscures Header Navigation**: The dev badge's fixed coordinates (`top: 44, right: 16, zIndex: 9999`) overlay primary screen header buttons.

---

## 2. Detailed Failure Catalog & Technical Analysis

---

### Failure 1: TypeScript Build Failure (`TS2305: AuditFeedResponse`)
- **Severity**: 🔴 Blocker / Compile-Time Error
- **File**: `frontend/src/api/manufacturer.ts` (Line 20)
- **Error Message**:
  ```text
  src/api/manufacturer.ts(20,3): error TS2305: Module '"../types/api"' has no exported member 'AuditFeedResponse'.
  ```
- **Root Cause**:
  `src/api/manufacturer.ts` imports `AuditFeedResponse` from `../types/api`. However, `src/types/api.ts` exports `AuditFeedItem` (line 371), not `AuditFeedResponse`. In fact, `AuditFeedResponse` is not used anywhere in the file.
- **Fix Needed**:
  Remove `AuditFeedResponse` from the import statement in `src/api/manufacturer.ts`.

---

### Failure 2: Missing Linter Dependency Breaks `npm run lint`
- **Severity**: 🟡 Tooling / Developer Experience
- **File**: `frontend/package.json` (Line 12)
- **Error Message**:
  ```text
  'eslint' is not recognized as an internal or external command, operable program or batch file.
  ```
- **Root Cause**:
  `"scripts": { "lint": "eslint ." }` is present in `package.json`, but neither `eslint` nor any React Native/Expo eslint plugin is installed in `devDependencies`.
- **Fix Needed**:
  Install eslint dev dependencies:
  ```bash
  npm install --save-dev eslint eslint-config-expo
  ```
  Or update `package.json` scripts to run `expo lint`.

---

### Failure 3: Digital Twin Minting Broken Against Real Backend (`POST /api/manufacturer/twins`)
- **Severity**: 🔴 Blocker / Core Feature Non-Functional
- **Files**:
  - `frontend/app/(manufacturer)/twins/create.tsx` (Lines 84–88)
  - `frontend/src/api/manufacturer.ts` (Lines 75–86)
  - `backend/api/src/modules/manufacturer/twins.controller.ts` (Line 40)
- **Symptom**:
  When clicking "Generate Digital Twins" with live backend (`EXPO_PUBLIC_USE_MOCKS=false`), the API responds with:
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Logo file is required" } }
  ```
- **Root Cause**:
  1. The backend endpoint `router.post('/twins', upload.single('logo'), twinsController.createTwins)` mandates an uploaded image file (`req.file`) with minimum 512x512 resolution.
  2. `CreateTwinsScreen` has a `logoUri` state (line 34) and an image picker `handlePickLogo`, but in `handleGenerate` (lines 84–88), it passes a plain JSON object:
     ```ts
     await manufacturerApi.createTwins({ product_id: prod, batch_id: batch, quantity });
     ```
     `logoUri` is completely omitted, and no `FormData` instance is created.
  3. `manufacturerApi.createTwins` hardcodes `'Content-Type': 'multipart/form-data'`, but Axios receives a plain JavaScript object. Without a `FormData` instance, boundaries are omitted and no file payload is transmitted.
  4. This bug was masked in mock mode because `mockAdapter.ts` parsed the JSON body and generated mock twins regardless of file presence.
- **Fix Needed**:
  - Construct a proper `FormData` object containing `product_id`, `batch_id`, `quantity`, and append `logo` with proper native/web platform handling.
  - Remove hardcoded `'Content-Type': 'multipart/form-data'` in Axios to allow the HTTP client to automatically generate the correct boundary.

---

### Failure 4: Authenticated Asset URLs Fail with HTTP 401 (`/api/assets/*`)
- **Severity**: 🔴 Major / Artifacts Broken
- **Files**:
  - `frontend/app/(manufacturer)/twins/[id].tsx` (Lines 214, 217, 229)
  - `frontend/src/utils/files.ts` (Lines 9–25)
  - `backend/api/src/modules/assets/assets.routes.ts` (Lines 11–15)
- **Symptom**:
  On the Twin Detail screen, the "Watermarked Logo" fails to display and renders as a blank image. Tapping "Save" to gallery fails with 401 Unauthorized.
- **Root Cause**:
  1. As defined in `00_SHARED_CONTRACT.md` (§7.2, Line 421, 470), the asset endpoint `GET /api/assets/:kind/:filename` enforces `requireAuth` and `requireRole('MANUFACTURER')`.
  2. In `twins/[id].tsx`:
     ```tsx
     <Image source={{ uri: assets.watermarked_logo_url }} style={styles.assetImg} />
     ```
     Standard `<Image source={{ uri }} />` executes an unauthenticated GET request. The backend rejects with `401 UNAUTHENTICATED`.
  3. Lines 217 and 229 call `saveAssetToGallery(assets.watermarked_logo_url, ...)` without passing the auth token.
  4. In `src/utils/files.ts`, web downloading uses `link.href = url; link.click();`. A standard browser anchor download cannot supply `Authorization: Bearer <token>`, causing the download to fail with 401.
- **Fix Needed**:
  - Pass authorization headers to the image component:
    ```tsx
    <Image source={{ uri: assets.watermarked_logo_url, headers: { Authorization: `Bearer ${tokens.access_token}` } }} />
    ```
  - For web downloads, fetch the file via authenticated `fetch()` with the Bearer header, convert the response into a `Blob`, and trigger download via `URL.createObjectURL(blob)`.

---

### Failure 5: Multipart Logo Upload Fails on React Native Web (`scanLogo`)
- **Severity**: 🟠 Major / Web Incompatibility
- **File**: `frontend/src/api/scan.ts` (Lines 5–26)
- **Symptom**:
  Scanning or uploading an image on Web fails with:
  ```text
  VALIDATION_ERROR: Image file is required
  ```
- **Root Cause**:
  In `scanApi.scanLogo`:
  ```ts
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as any);
  ```
  React Native native runtime polyfills `FormData` to interpret `{ uri, name, type }`. However, React Native Web runs on standard browser `window.FormData`, which only accepts a `Blob`, `File`, or `string`. Passing an object causes the browser to invoke `Object.prototype.toString()`, sending `[object Object]` as a text parameter. Multer receives `req.file === undefined` and rejects the request.
- **Fix Needed**:
  Check `Platform.OS === 'web'`. On web, fetch the image URI to obtain a `Blob`, then append the `Blob` to `FormData`:
  ```ts
  if (Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('image', blob, filename);
  } else {
    formData.append('image', { uri: imageUri, name: filename, type } as any);
  }
  ```

---

### Failure 6: Dev Tools Role Switcher Injects Mock JWTs into Live Backend
- **Severity**: 🔴 Critical / Session Invalidation
- **Files**:
  - `frontend/src/components/DevMenuModal.tsx` (Lines 31–37)
  - `frontend/src/store/authStore.ts` (Lines 116–154)
- **Symptom**:
  Tapping any user chip in the Dev Menu Modal ("Aurelia Manufacturer", "TimeHouse Retailer", "Riya Sharma") breaks the session with:
  ```text
  401 UNAUTHENTICATED: Invalid or expired token
  ```
- **Root Cause**:
  `switchDemoUser` sets hardcoded mock tokens:
  ```ts
  const mockTokens: AuthTokens = {
    access_token: `mock_jwt_access_${role.toLowerCase()}`,
    refresh_token: `mock_jwt_refresh_${role.toLowerCase()}`,
    expires_in: 900,
  };
  ```
  When `EXPO_PUBLIC_USE_MOCKS=false`, the client sends `Bearer mock_jwt_access_manufacturer` to the Node.js backend. The backend verifies the token using `jwt.verify(token, JWT_SECRET)`, which fails because the mock token is not a valid signed JWT.
- **Fix Needed**:
  If `EXPO_PUBLIC_USE_MOCKS === false`, the Dev Menu must log in through `authApi.login({ email, password })` using the contract's seeded passwords (`Maker@123`, `Retail@123`, `Riya@123`, `Arjun@123`) instead of setting dummy tokens.

---

### Failure 7: Logout Leaves Backend Refresh Tokens Active (Session Leak)
- **Severity**: 🟡 Moderate / Security Compliance
- **Files**:
  - `frontend/src/store/authStore.ts` (Lines 108–114)
  - `00_SHARED_CONTRACT.md` (§7.1)
- **Symptom**:
  When a user signs out, their refresh token remains valid in the PostgreSQL database.
- **Root Cause**:
  `authStore.logout()` removes local tokens from storage and resets Zustand state, but never executes `authApi.logout(refreshToken)`. In the backend, `POST /api/auth/logout` deletes the active refresh session from the database. Because this call is skipped, revoked sessions can continue to generate access tokens.
- **Fix Needed**:
  Call `authApi.logout(tokens?.refresh_token)` in `authStore.logout()` before wiping local storage.

---

### Failure 8: Startup Initialization Skips Token Validation
- **Severity**: 🟡 Moderate / Architectural Alignment
- **Files**:
  - `frontend/src/store/authStore.ts` (Lines 67–87)
  - `frontend/02_FRONTEND.md` (§4.1)
- **Symptom**:
  If a user's session was revoked or expired server-side, the app boots into authenticated state until an API request fails.
- **Root Cause**:
  `02_FRONTEND.md` (§4.1) mandates:
  > *On app start: read tokens from SecureStore -> GET /auth/me -> route by user.role to (manufacturer) / (retailer) / (consumer). No token -> (auth)/login.*
  
  The current implementation reads `vt_user_profile` from SecureStore and blindly assumes authentication is valid without querying `GET /auth/me`.
- **Fix Needed**:
  During `authStore.initialize()`, if tokens exist, call `authApi.getMe()`. If successful, update user state; if 401 or invalid, trigger token refresh or clear storage and redirect to login.

---

### Failure 9: Volatile Global Scan State
- **Severity**: 🟠 Moderate / Reliability
- **Files**:
  - `frontend/src/hooks/useScanner.ts` (Lines 82–89)
  - `frontend/app/scan-result.tsx` (Lines 27, 32–47)
- **Symptom**:
  After verifying a product, if the user reloads the web page or the mobile OS recycles the process in background, the screen displays:
  ```text
  No scan record available. Return Home
  ```
- **Root Cause**:
  `useScanner` writes scan data to a volatile global variable:
  ```ts
  (global as any).__VERITWIN_SCAN_RESULT__ = data;
  ```
  `scan-result.tsx` reads directly from `global.__VERITWIN_SCAN_RESULT__`. When this memory reference is lost, the page cannot reconstruct the result, even though `scan_id` was passed in router params.
- **Fix Needed**:
  Store scan results in a Zustand scanner store or React Query cache by `scan_id` / `twin_id`, with a fallback to fetch the digital twin via `scanApi.getScannedTwin(twinId)` if available.

---

### Failure 10: Countdown Timer Interval Never Clears on Expiry
- **Severity**: 🟠 Moderate / Resource Leak & State Thrashing
- **File**: `frontend/src/components/CountdownRing.tsx` (Lines 20–34)
- **Symptom**:
  When a P2P transfer QR code reaches 00:00, `onExpire` is triggered every second in an infinite loop.
- **Root Cause**:
  ```ts
  const calculateRemaining = () => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const sec = Math.max(0, Math.floor(diffMs / 1000));
    setRemaining(sec);

    if (sec === 0 && onExpire) {
      onExpire();
    }
  };
  ```
  When `sec === 0`, `calculateRemaining` calls `onExpire()`, but the interval created by `setInterval(calculateRemaining, 1000)` continues ticking every 1000ms, repeatedly invoking `onExpire()` and triggering unnecessary re-renders.
- **Fix Needed**:
  Clear the interval as soon as `sec <= 0`:
  ```ts
  if (sec <= 0) {
    clearInterval(interval);
    onExpire?.();
  }
  ```

---

### Failure 11: Scanner Captures Silently Fall Back to Unsplash Image
- **Severity**: 🟡 Moderate / User Trust & Integrity
- **File**: `frontend/src/components/ScannerView.tsx` (Lines 83–87)
- **Symptom**:
  If camera capture fails, the app silently uploads a hardcoded stock watch image from Unsplash.
- **Root Cause**:
  ```ts
  } catch (e) {
    console.warn('Capture error:', e);
    // Fallback: pass direct or demo
    onLogoCaptured('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800');
  }
  ```
  This dummy fallback was added during early prototyping and was never removed. In production or live testing, an error in camera capture should notify the user to retry, not submit an arbitrary third-party image to the verification algorithm.
- **Fix Needed**:
  Remove the silent Unsplash fallback. Display an Alert prompting the user to steady the camera and capture again.

---

### Failure 12: Floating "MOCK DEV" Pill Overlays Primary Action Headers
- **Severity**: 🟡 Minor / UI Layout Conflict
- **File**: `frontend/app/_layout.tsx` (Lines 58–67, 81–95)
- **Symptom**:
  The floating "MOCK DEV" pill blocks header buttons (e.g. Scan button on Retailer dashboard, New Product button on Product Master, Audit Feed button on Manufacturer hub).
- **Root Cause**:
  The badge is styled with `position: 'absolute', top: 44, right: 16, zIndex: 9999`. Because most screen headers place action icons at `right: 16, top: 44–50`, the badge sits directly on top of them, intercepting all touch events.
- **Fix Needed**:
  Reposition the badge (e.g., bottom-right corner `bottom: 80, right: 16`, or inside the profile/settings screens) and hide it when `EXPO_PUBLIC_USE_MOCKS === 'false'`.

---

## 3. Prioritized Fix Implementation Guide

### Phase 1: Immediate Blockers (Must fix for code to compile & twins to mint)
1. **Fix `src/api/manufacturer.ts`**:
   Remove `AuditFeedResponse` from line 20.
2. **Fix `CreateTwinsScreen` & `manufacturerApi.createTwins`**:
   Construct `FormData` with `product_id`, `batch_id`, `quantity`, and append the `logo` file (handling `Blob` on web and `{ uri, name, type }` on native). Remove hardcoded `'Content-Type': 'multipart/form-data'` header to allow Axios auto-boundary generation.
3. **Fix `src/api/scan.ts` (`scanLogo`)**:
   Add Web `Blob` conversion support so watermark uploads work in web browsers.

### Phase 2: Security & Authentication Integrity
4. **Fix Authenticated Asset Display & Download**:
   Add `Authorization: Bearer <token>` to `<Image source={{ uri, headers: ... }}>` in `app/(manufacturer)/twins/[id].tsx`. Update `saveAssetToGallery` in `src/utils/files.ts` to perform authenticated blob downloads on web.
5. **Fix Dev Menu User Impersonation**:
   In `DevMenuModal.tsx`, perform actual API login via `authApi.login()` using contract seed credentials when `EXPO_PUBLIC_USE_MOCKS=false`.
6. **Fix Logout Session Invalidation**:
   Call `authApi.logout(refreshToken)` in `useAuthStore.logout()`.

### Phase 3: Reliability & UX Refinements
7. **Fix `CountdownRing.tsx` Interval**:
   Clear the timer interval once `remaining <= 0`.
8. **Remove Stock Photo Fallback in `ScannerView.tsx`**:
   Present an error dialog on capture failure rather than sending an Unsplash photo.
9. **Reposition Dev Badge in `app/_layout.tsx`**:
   Move badge to bottom-right or tie visibility strictly to `EXPO_PUBLIC_USE_MOCKS=true`.
10. **Install Linter Tooling**:
    Install `eslint` and `eslint-config-expo`.

---

## 4. Verification Checklist

Status of Sequential Fixes:
- [x] **Fix 1: TypeScript Build Failure (`src/api/manufacturer.ts`)** — Resolved & Verified (`npm run type-check` exit code 0).
- [x] **Fix 2: Broken Linter Tooling (`package.json`, `.eslintrc.js`)** — Resolved & Verified (`npm run lint` installed, hook cascading render & impurity resolved, 0 errors).
- [x] **Fix 3: Digital Twin Minting Multi-Part / File Upload (`twins/create.tsx`, `src/api/manufacturer.ts`)** — Resolved & Verified (`CreateTwinsScreen` attaches `logoUri`, `manufacturerApi.createTwins` constructs cross-platform `FormData` with native/web blob handling, and `mockAdapter.ts` handles both FormData and JSON).
- [x] **Fix 4: Authenticated Asset URLs & Downloads (`app/(manufacturer)/twins/[id].tsx`, `src/utils/files.ts`)** — Resolved & Verified (Added `Authorization: Bearer <token>` image headers, web blob fetch with auth headers for file download).
- [x] **Fix 5: Web Multi-Part Upload Incompatibility (`src/api/scan.ts`)** — Resolved & Verified (Image URIs on web/remote are converted into standard `Blob` before appending to `FormData`).
- [x] **Fix 6: Dev Tools Live Token Impersonation (`src/store/authStore.ts`)** — Resolved & Verified (In live mode `switchDemoUser` logs into the live backend via `authApi.login` using contract seed credentials).
- [x] **Fix 7: Server Session Revocation on Logout (`src/store/authStore.ts`)** — Resolved & Verified (Calls `authApi.logout(refreshToken)` to revoke session on backend before wiping client credentials).
- [x] **Fix 8: Startup Session Verification (`src/store/authStore.ts`)** — Resolved & Verified (`initialize` verifies stored tokens with `authApi.getMe()` when connecting to live backend API).
- [x] **Fix 9: Volatile Global Scan State (`src/hooks/useScanner.ts`, `app/scan-result.tsx`)** — Resolved & Verified (Caches scan results in `sessionStorage` and restores via `scanApi.getScannedTwin(twin_id)` if state is purged).
- [x] **Fix 10: Timer Infinite Interval Callback Loop (`src/components/CountdownRing.tsx`)** — Resolved & Verified (`clearInterval` halts timer once `sec <= 0`, ref updated inside effect to satisfy React compiler).
- [x] **Fix 11: Silent Unsplash Stock Photo Fallback (`src/components/ScannerView.tsx`)** — Resolved & Verified (Removed hardcoded Unsplash fallback; alerts user on camera capture failure).
- [x] **Fix 12: Floating Dev Pill Obscuring Header Navigation (`app/_layout.tsx`)** — Resolved & Verified (Relocated pill from top-right `top: 44` to bottom-right `bottom: 80, right: 16` and reflects MOCK DEV vs LIVE API mode).

Build & Export Verification:
- [x] `npm run type-check` (Clean 0 errors, exit code 0)
- [x] `npm run lint` (Clean 0 errors, exit code 0)
- [x] `npx expo export --platform web --no-minify` (Clean Web Bundling completed in dist, exit code 0)

---
*Report compiled, executed, and verified against codebase source of truth.*
