-- 004_pending_registration.sql
-- Adds staging columns to accounts for in-progress registration (Step 2 -> 3).
--
-- Design rationale: accounts.customer_email is the single source of truth
-- for "is this account registered" (NULL = no, NOT NULL = yes). We don't
-- want to write to customer_email until OTP verification actually succeeds,
-- so the email + password hash submitted at Step 2 are staged here and only
-- promoted to accounts.customer_email / a new customers row once Step 3
-- completes. A failed or abandoned registration attempt simply leaves stale
-- pending_* values that get overwritten on the next attempt — harmless,
-- since they're never read except during active OTP verification.

ALTER TABLE accounts
    ADD COLUMN pending_email         VARCHAR(255),
    ADD COLUMN pending_password_hash   VARCHAR(255);
