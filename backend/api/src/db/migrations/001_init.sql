CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role            AS ENUM ('MANUFACTURER','RETAILER','CONSUMER');
CREATE TYPE product_category     AS ENUM ('WATCH','APPAREL','FOOTWEAR','ACCESSORY','OTHER');
CREATE TYPE twin_status          AS ENUM ('MANUFACTURED','QA_PASSED','IN_TRANSIT','IN_RETAIL','SOLD');
CREATE TYPE lifecycle_event_type AS ENUM ('MANUFACTURED','QA_PASSED','DISPATCHED_TO_RETAIL','RECEIVED_AT_RETAIL','INSPECTED','FIRST_SALE','RESOLD');
CREATE TYPE verification_method  AS ENUM ('WATERMARK','QR');
CREATE TYPE scan_verdict         AS ENUM ('GENUINE','FAKE','ALREADY_CLAIMED','LOW_CONFIDENCE');
CREATE TYPE transfer_status      AS ENUM ('PENDING','CLAIMED','EXPIRED','CANCELLED');

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
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);

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

CREATE TABLE product_audit (
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

CREATE SEQUENCE twin_serial_seq START 1;

CREATE TABLE digital_twins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_code             CHAR(8) NOT NULL UNIQUE,
  serial_number         VARCHAR(40) NOT NULL UNIQUE,
  product_id            UUID NOT NULL REFERENCES products(id),
  batch_id              UUID NOT NULL REFERENCES batches(id),
  status                twin_status NOT NULL DEFAULT 'MANUFACTURED',
  current_retailer_id   UUID REFERENCES users(id),
  current_owner_id      UUID REFERENCES users(id),
  claimed_at            TIMESTAMPTZ,
  original_logo_url     TEXT NOT NULL,
  watermarked_logo_url  TEXT NOT NULL,
  fallback_qr_payload   TEXT NOT NULL UNIQUE,
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
  prev_hash      CHAR(64) NOT NULL,
  event_hash     CHAR(64) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_twin_idx ON lifecycle_events(twin_id, id);
CREATE INDEX events_type_idx ON lifecycle_events(event_type, created_at DESC);

CREATE OR REPLACE FUNCTION forbid_event_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'lifecycle_events is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER lifecycle_events_no_update BEFORE UPDATE ON lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();
CREATE TRIGGER lifecycle_events_no_delete BEFORE DELETE ON lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();

CREATE TABLE transfer_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id       UUID NOT NULL REFERENCES digital_twins(id),
  seller_id     UUID NOT NULL REFERENCES users(id),
  buyer_id      UUID REFERENCES users(id),
  token_hash    CHAR(64) NOT NULL UNIQUE,
  status        transfer_status NOT NULL DEFAULT 'PENDING',
  expires_at    TIMESTAMPTZ NOT NULL,
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_pending_transfer_per_twin ON transfer_tokens(twin_id) WHERE status = 'PENDING';

CREATE TABLE scan_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id       UUID REFERENCES digital_twins(id),
  scanned_by    UUID NOT NULL REFERENCES users(id),
  scanner_role  user_role NOT NULL,
  method        verification_method NOT NULL,
  verdict       scan_verdict NOT NULL,
  confidence    NUMERIC(4,3),
  decoded_code  CHAR(8),
  reason        VARCHAR(40),
  ip            INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scans_twin_idx   ON scan_logs(twin_id, created_at DESC);
CREATE INDEX scans_time_idx   ON scan_logs(created_at DESC);
CREATE INDEX scans_verdict_idx ON scan_logs(verdict);
