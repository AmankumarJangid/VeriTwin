-- ============================================================================
-- VeriTwin — Tamper Demo Script (For Viva Showcase)
-- Demonstrates the cryptographic hash-chain tamper evidence.
--
-- Scenario:
-- 1. Disables the append-only trigger on lifecycle_events
-- 2. Maliciously tampers with an event (e.g. alters metadata or notes)
-- 3. Re-enables the trigger
-- 4. Calling GET /api/manufacturer/twins/:twinId/integrity will detect the breach
--    and return { "valid": false, "broken_at_event_id": <id> }
-- ============================================================================

-- Step 1: Temporarily disable the append-only trigger to simulate direct DB tampering
ALTER TABLE lifecycle_events DISABLE TRIGGER lifecycle_events_no_update;

-- Step 2: Tamper with a lifecycle event's notes
-- (Replace '<TARGET_TWIN_ID>' with a real twin_id from digital_twins)
UPDATE lifecycle_events
SET notes = 'TAMPERED: Illegitimate price and condition modification'
WHERE id = (
  SELECT id FROM lifecycle_events
  ORDER BY id ASC
  LIMIT 1
);

-- Step 3: Re-enable the append-only trigger
ALTER TABLE lifecycle_events ENABLE TRIGGER lifecycle_events_no_update;

-- Now call:
-- curl -H "Authorization: Bearer <MANUFACTURER_TOKEN>" \
--      http://localhost:4000/api/manufacturer/twins/<TARGET_TWIN_ID>/integrity
--
-- Expected Output:
-- {
--   "success": true,
--   "data": {
--     "valid": false,
--     "events_checked": 1,
--     "broken_at_event_id": "1"
--   }
-- }
