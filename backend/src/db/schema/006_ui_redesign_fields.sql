-- 006_ui_redesign_fields.sql
-- Stage 4 UI redesign: adds fields needed for the redesigned dashboard
-- (vehicle detail card, APR/payoff calculator, autopay toggle, payment method)
-- Currency stays USD throughout — no locale/currency column needed.

BEGIN;

-- ---------------------------------------------------------------------
-- accounts: vehicle detail + APR + autopay
-- ---------------------------------------------------------------------
ALTER TABLE accounts
  ADD COLUMN vin              varchar(17),
  ADD COLUMN vehicle_color    varchar(30),
  ADD COLUMN phone            varchar(20),
  ADD COLUMN apr              numeric(4,2),      -- e.g. 6.75 = 6.75%
  ADD COLUMN autopay_enabled  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN accounts.apr IS
  'Annual percentage rate for the loan/lease, used by the dashboard payoff calculator. Not used in late-fee or installment math (those remain flat, config-driven per REQUIREMENTS.md).';

COMMENT ON COLUMN accounts.autopay_enabled IS
  'When true, GET /dashboard auto-processes a payment (method=autopay) if the account is past due. See PATCH /dashboard/autopay.';

-- ---------------------------------------------------------------------
-- payments: method (US-context options, replacing the old bank-only field)
-- ---------------------------------------------------------------------
CREATE TYPE payment_method AS ENUM (
  'autopay',
  'ach_transfer',
  'debit_card',
  'manual'
);

ALTER TABLE payments
  ADD COLUMN method payment_method NOT NULL DEFAULT 'manual';

-- Backfill: mark all existing seed/backfilled payments as 'manual'
-- since they predate the method field (already covered by DEFAULT above,
-- this UPDATE is just explicit for clarity/auditability).
UPDATE payments SET method = 'manual' WHERE method IS NULL;

COMMIT;