-- 001_init.sql
-- Loan Servicing Notification Validator — initial schema
-- Tables: accounts, customers, otp_codes, payments, config
-- Source of truth: REQUIREMENTS.md §1 (Account Data Model), §1.3 (Config Table)

-- ---------------------------------------------------------------------------
-- ENUM: account_type
-- Only 'active' accounts may register (REQUIREMENTS.md §1.1).
-- The other three exist purely as negative-test fixtures.
-- ---------------------------------------------------------------------------
CREATE TYPE account_type AS ENUM ('active', 'deceased', 'charge_off', 'repo');

-- ---------------------------------------------------------------------------
-- ENUM: ownership_type
-- "Lease or Purchase flag" per REQUIREMENTS.md §1.2
-- ---------------------------------------------------------------------------
CREATE TYPE ownership_type AS ENUM ('lease', 'purchase');

-- ---------------------------------------------------------------------------
-- accounts
-- Pre-seeded "bank side" data. Must exist before any customer registers.
-- customer_email is NULL until registration (it's the column registration
-- writes to, and the email-uniqueness check in §2 Step 2 reads from it).
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
    id                          SERIAL PRIMARY KEY,
    account_number              VARCHAR(10) NOT NULL UNIQUE,
    last_4_ssn                  VARCHAR(4)  NOT NULL,
    account_type                 account_type NOT NULL,
    customer_name                VARCHAR(255) NOT NULL,

    -- Vehicle details
    vehicle_make                 VARCHAR(100) NOT NULL,
    vehicle_model                VARCHAR(100) NOT NULL,
    vehicle_year                 INTEGER NOT NULL,
    ownership_type                ownership_type NOT NULL,

    -- Loan/lease financials
    total_amount                  NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    tenure_months                  INTEGER NOT NULL CHECK (tenure_months > 0),
    installment_amount              NUMERIC(12, 2) NOT NULL CHECK (installment_amount > 0),
    installments_paid               INTEGER NOT NULL DEFAULT 0 CHECK (installments_paid >= 0),

    -- Due date tracking
    current_due_date               DATE NOT NULL,
    due_date_changes_used           INTEGER NOT NULL DEFAULT 0 CHECK (due_date_changes_used >= 0),

    address                       TEXT NOT NULL,

    -- Set during registration; NULL until then. Drives the "already
    -- registered" check in §2 Step 1 and the uniqueness check in Step 2.
    customer_email                 VARCHAR(255) UNIQUE,

    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_account_number ON accounts (account_number);

-- ---------------------------------------------------------------------------
-- customers
-- Created only on successful registration. 1:1 with accounts
-- (REQUIREMENTS.md §1.3 "Relationship: 1 customer : 1 account").
-- Holds login credentials, which is why it's split from accounts rather
-- than just adding columns there — keeps "bank-fed" data separate from
-- "customer-provided" data.
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id                SERIAL PRIMARY KEY,
    account_id         INTEGER NOT NULL UNIQUE REFERENCES accounts (id) ON DELETE CASCADE,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    registered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_account_id ON customers (account_id);

-- ---------------------------------------------------------------------------
-- otp_codes
-- Tracks registration-session OTPs (§2 Step 3). Tied to account_id, not
-- customer_id, because the customer record doesn't exist yet at this stage.
-- locked_until enforces the server-side 15-min cooldown after 3 resends —
-- "not bypassable by refresh" per the requirements, hence stored server-side
-- rather than relying on client state.
-- ---------------------------------------------------------------------------
CREATE TABLE otp_codes (
    id              SERIAL PRIMARY KEY,
    account_id        INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    code               VARCHAR(6) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    resend_count         INTEGER NOT NULL DEFAULT 0 CHECK (resend_count >= 0),
    locked_until         TIMESTAMPTZ,
    used                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_account_id ON otp_codes (account_id);

-- ---------------------------------------------------------------------------
-- payments
-- Append-only ledger — one row per payment (§5 Payment Flow). Simulated
-- success only; no real gateway, so no status column for failures.
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id                       SERIAL PRIMARY KEY,
    account_id                 INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    amount                     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    bank_account_number          VARCHAR(50) NOT NULL,
    bank_last_4                 VARCHAR(4) NOT NULL,
    paid_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_account_id ON payments (account_id);

-- ---------------------------------------------------------------------------
-- config
-- Key/value business-rule table (§1.3). Lets tests change a rule's value
-- in the DB and assert behavior follows, without touching app code.
-- ---------------------------------------------------------------------------
CREATE TABLE config (
    key            VARCHAR(100) PRIMARY KEY,
    value           VARCHAR(100) NOT NULL,
    description      TEXT
);
