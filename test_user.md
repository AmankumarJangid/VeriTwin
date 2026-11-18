 You are completely right! When you ran npm run dev, server.ts
  automatically executed the seed insertion:

  • ✅ 4 Demo Accounts:
      • Manufacturer: maker@veritwin.dev (Maker@123)
      • Retailer: retail@veritwin.dev (Retail@123)
      • Consumer: riya@veritwin.dev (Riya@123)
      • Consumer: arjun@veritwin.dev (Arjun@123)
  • ✅ Product Master: WCH-CHR-001 (Chrono Classic 42 by Aurelia,
  MRP ₹24,999)
  • ✅ Initial Batch: B-2026-11-A (100 units)

  The database is primed and ready. We can now proceed to test
  the endpoints or move directly to the frontend whenever you
  want!

## TESTING

 ### 1. Special Unit Testing Suite (Runs in isolation)

  The unit testing suite executes in under 1.5 seconds without
  needing a running database or server. It verifies the
  cryptographic and architectural core:

  • HMAC-SHA256 QR Signer & Verifier (qrSigner.test.ts): Verifies
  timing-safe verification, rejection of single-character
  tampering, rejection of forged twin IDs, and rejection of wrong
  secrets.
  • State Machine Transitions (stateMachine.test.ts): Tests the
  transition rules from MANUFACTURED -> QA_PASSED -> IN_TRANSIT -
  > IN_RETAIL -> SOLD -> RESOLD, ensuring illegal jumps and
  unauthorized roles are blocked.
  • Twin Code & Serial Formats (serialAndCodes.test.ts):
  Validates 8-character uppercase hex twin codes and exact VT-
  <CAT3>-<YYYY>-<SEQ> formatting for all product categories.
  • Tamper-Evident SHA-256 Hash Chain (hashChain.test.ts):
  Verifies genesis prev_hash (0 × 64), deterministic canonical
  JSON key sorting, and tamper detection when previous events are
  modified.
  • Role-Based Masking (twinViewMasking.test.ts): Tests identity
  protection for consumers, masking of retailer organizations
  from consumers, and computation of the allowed_actions matrix.
  • P2P Transfer Security (transferSecurity.test.ts): Tests 32-
  byte base64url random tokens, storage hashing (raw tokens never
  saved), 120s TTL expiration, and self-claim prevention.

  Result: 29/29 tests passing.
  ──────
  ### 2. How to Run the Tests

  #### Run Unit Tests:

    cd D:\mini_project\VeriTwin\testing
    npm run test:unit

  #### Run Full Integration Tests (Against running backend API):

    # In terminal 1 (start API):
    cd D:\mini_project\VeriTwin\backend\api
    npm run dev
    
    # In terminal 2 (run integration suite):
    cd D:\mini_project\VeriTwin\testing
    npm run test:integration

  #### Run All Tests:

    cd D:\mini_project\VeriTwin\testing
    npm test

### Image service Running  

 Thought for 6s

  ### Why You Saw "image_service": "error"
  When you visited /api/health, the health check tried to send a
  request to http://localhost:8000/health (the Python watermark
  microservice).

  Because the Python service on port 8000 was not running yet, it
  reported "image_service": "error".
  ──────
  ### How It's Resolved
  #### 1. Instant Fix in Mock Mode (Already Applied)

  In backend/api/.env, IMAGE_SERVICE_MOCK=true is enabled so you
  can develop and test the API and frontend without needing
  Python running.

  I updated healthCheck() so that when mock mode is on, it
  recognizes this and returns "ok". Refresh your
  http://localhost:4000/api/health page and you will see:

    {
      "success": true,
      "data": {
        "api": "ok",
        "db": "ok",
        "image_service": "ok",
        "time": "..."
      }
    }
  ──────
  #### 2. Want to Run the Real Python Watermark Service (Port    
  8000)?
  If you want the real Python DWT-DCT watermark service running
  alongside Node:

  In a new terminal:

    cd D:\mini_project\VeriTwin\backend\image-service
    .\run.ps1

  (Or simply double-click run.bat in that folder).

  This automatically creates a Python virtual environment (venv),
  installs opencv, fastapi, and invisible-watermark, and boots
  the service on port 8000.
