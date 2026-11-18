# VeriTwin — Automated Test Environment & Test Suites

This standalone directory contains the automated test environment for the VeriTwin platform, positioned alongside `backend` and `frontend`.

---

## 1. Directory Structure

```
testing/
├── package.json               # Test environment runner & dependencies
├── tsconfig.json              # TypeScript configuration for tests
├── vitest.config.ts           # Vitest configuration
├── .env.test                  # Test environment variables (API URL, credentials)
├── README.md                  # This guide
└── src/
    ├── client/
    │   └── apiClient.ts       # Typed HTTP client with Bearer auth & multipart uploads
    ├── helpers/
    │   └── testData.ts        # Test fixtures, demo accounts, and 512x512 logo generator
    ├── unit/                  # Special Unit Testing Suite (Fast, Isolated, Cryptographic)
    │   ├── qrSigner.test.ts          # HMAC-SHA256 signature, 1-char tampering, timing-safe compare
    │   ├── stateMachine.test.ts      # Strict state transition rules & role authorization
    │   ├── serialAndCodes.test.ts    # 32-bit hex twin codes & VT-<CAT3>-<YYYY>-<SEQ> formats
    │   ├── hashChain.test.ts         # Append-only SHA-256 hash chaining & tamper detection
    │   ├── twinViewMasking.test.ts   # Role-based masking of consumer/retailer/owner identities
    │   └── transferSecurity.test.ts  # Token hashing, 120s TTL, single-use logic
    └── integration/           # End-to-End API & Component Integration Tests
        ├── auth.test.ts              # Registration, invite codes, login, token refresh rotation
        ├── rbac.test.ts              # Permission matrix (401/403 guards across all roles)
        ├── lifecycle.test.ts         # Full product lifecycle: Create -> QA -> Dispatch -> Receive -> Inspect -> Sell
        ├── scanning.test.ts          # Dual-mode verification (Watermark & QR) with all verdicts
        ├── p2pTransfer.test.ts       # Resale handshake: Seller creates QR -> Buyer claims -> Vault updates
        └── integrityAudit.test.ts    # Hash chain re-verification & analytics feed
```

---

## 2. Running the Tests

### A. Run Special Unit Tests (Runs in isolation without needing running DB/services)
```bash
cd D:\mini_project\VeriTwin\testing
npm run test:unit
```
This runs 29 tests across 6 suites verifying:
- Cryptographic HMAC-SHA256 QR signing and tampering detection
- Twin state machine state transitions and role checks
- Deterministic SHA-256 hash chaining with canonical JSON serialization
- Role-based data masking and allowed actions computation
- Serial number and twin code generation
- P2P transfer token security and expiration rules

### B. Run Full Integration Tests (Against running VeriTwin backend API)
1. Ensure the backend API is running:
```bash
cd D:\mini_project\VeriTwin\backend\api
npm run dev
```
2. In a separate terminal, run the integration test suite:
```bash
cd D:\mini_project\VeriTwin\testing
npm run test:integration
```

### C. Run All Tests
```bash
cd D:\mini_project\VeriTwin\testing
npm test
```

---

## 3. Test Coverage Breakdown

| Test File | Type | Coverage Focus |
|---|---|---|
| `qrSigner.test.ts` | Unit | HMAC-SHA256 signing, timing-safe verify, tampering detection |
| `stateMachine.test.ts` | Unit | State transitions: `MANUFACTURED` -> `QA_PASSED` -> `IN_TRANSIT` -> `IN_RETAIL` -> `SOLD` -> `RESOLD` |
| `serialAndCodes.test.ts` | Unit | 8-char uppercase hex twin codes and `VT-<CAT3>-<YYYY>-<SEQ>` format |
| `hashChain.test.ts` | Unit | Deterministic SHA-256 event chaining, canonical JSON key sorting |
| `twinViewMasking.test.ts` | Unit | Identity protection for consumers & allowed_actions calculation |
| `transferSecurity.test.ts`| Unit | 32-byte base64url random tokens, 120s TTL, single-use, self-claim prevention |
| `auth.test.ts` | Integration | Public signup, invite code enforcement, login, refresh rotation, `/me` |
| `rbac.test.ts` | Integration | RBAC protection (401 unauthenticated, 403 forbidden across roles) |
| `lifecycle.test.ts` | Integration | Full 11-step factory-to-consumer handover lifecycle |
| `scanning.test.ts` | Integration | Dual-mode scanning (watermark + QR), verdicts (`GENUINE`, `FAKE`, `ALREADY_CLAIMED`, `422 LOW_CONFIDENCE`) |
| `p2pTransfer.test.ts` | Integration | Consumer P2P transfer handshake, double-claim prevention, vault updates |
| `integrityAudit.test.ts` | Integration | Tamper-evident hash chain check, global audit feed, analytics overview |
