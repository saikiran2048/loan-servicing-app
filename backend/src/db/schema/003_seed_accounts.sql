-- 003_seed_accounts.sql
-- Sample accounts covering all 4 account types plus the key financial-state
-- scenarios needed for negative/boundary testing (REQUIREMENTS.md §8.1).
--
-- account_number / last_4_ssn / customer_email are believable-fake — not
-- real PII, just realistic-looking formats for demo/screenshot purposes.
--
-- NOTE: installment_amount is calculated here in SQL for seed convenience
-- only. In the app, this calculation happens in TypeScript at account
-- creation time (per Stage 1 decision) — the DB does not auto-derive it.

-- ---------------------------------------------------------------------------
-- 1. Non-active accounts — registration must be blocked for all three
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES
(
    '4471098230', '5521', 'deceased', 'Margaret Holloway',
    'Honda', 'Accord', 2021, 'purchase',
    28800.00, 48, 600.00, 12,
    CURRENT_DATE + INTERVAL '15 days', 0,
    '142 Birchwood Ln, Springfield, IL 62704', NULL
),
(
    '4471098231', '5522', 'charge_off', 'Derek Vance',
    'Ford', 'Escape', 2019, 'lease',
    21600.00, 36, 600.00, 30,
    CURRENT_DATE - INTERVAL '90 days', 0,
    '88 Crestline Dr, Tulsa, OK 74103', NULL
),
(
    '4471098232', '5523', 'repo', 'Janelle Marsh',
    'Toyota', 'Camry', 2020, 'purchase',
    24000.00, 48, 500.00, 9,
    CURRENT_DATE - INTERVAL '45 days', 0,
    '317 Oakhurst Ave, Reno, NV 89501', NULL
);

-- ---------------------------------------------------------------------------
-- 2. Active, unregistered, fresh — primary happy-path registration target
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837461', '7734', 'active', 'Aaron Whitfield',
    'Chevrolet', 'Equinox', 2022, 'lease',
    27000.00, 36, 750.00, 0,
    CURRENT_DATE + INTERVAL '20 days', 0,
    '56 Maplewood Ct, Denver, CO 80202', NULL
);

-- ---------------------------------------------------------------------------
-- 3. Active, already registered — "already registered" negative test
--    (account + linked customer row, customer_email set)
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837462', '7735', 'active', 'Priya Natarajan',
    'Subaru', 'Outback', 2021, 'purchase',
    32000.00, 60, 533.33, 14,
    CURRENT_DATE + INTERVAL '12 days', 0,
    '901 Lakeview Dr, Austin, TX 78701', 'priya.natarajan.demo@example.com'
);

INSERT INTO customers (account_id, email, password_hash, registered_at)
SELECT id, 'priya.natarajan.demo@example.com', '$2b$10$placeholderHashForSeedDataOnly00000000000000000000000', now() - INTERVAL '30 days'
FROM accounts WHERE account_number = '5102837462';

-- ---------------------------------------------------------------------------
-- 4. Active, unregistered, near payoff — overpayment-cap test target
--    Remaining balance is small relative to installment amount.
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837463', '7736', 'active', 'Marcus Bell',
    'Nissan', 'Altima', 2018, 'purchase',
    18000.00, 36, 500.00, 34,
    CURRENT_DATE + INTERVAL '8 days', 0,
    '24 Ridgewood St, Charlotte, NC 28202', NULL
);

-- ---------------------------------------------------------------------------
-- 5. Active, unregistered, delinquent — late-fee calculation test target
--    current_due_date is in the past relative to seed time.
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837464', '7737', 'active', 'Lauren Castillo',
    'Mazda', 'CX-5', 2020, 'lease',
    25200.00, 36, 700.00, 18,
    CURRENT_DATE - INTERVAL '10 days', 0,
    '610 Hillcrest Ave, Sacramento, CA 95814', NULL
);

-- ---------------------------------------------------------------------------
-- 6. Active, unregistered, DDC cap at 1/2 used — boundary test target
--    One more successful change should hit the lifetime cap of 2.
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837465', '7738', 'active', 'Trevor Banks',
    'Hyundai', 'Tucson', 2022, 'lease',
    23400.00, 36, 650.00, 6,
    CURRENT_DATE + INTERVAL '18 days', 1,
    '77 Sunset Blvd, Phoenix, AZ 85003', NULL
);

-- ---------------------------------------------------------------------------
-- 7. Active, unregistered, vanilla — general-purpose spare account so
--    other happy-path tests don't collide with the targeted ones above.
-- ---------------------------------------------------------------------------
INSERT INTO accounts (
    account_number, last_4_ssn, account_type, customer_name,
    vehicle_make, vehicle_model, vehicle_year, ownership_type,
    total_amount, tenure_months, installment_amount, installments_paid,
    current_due_date, due_date_changes_used, address, customer_email
) VALUES (
    '5102837466', '7739', 'active', 'Olivia Reyes',
    'Kia', 'Sportage', 2023, 'purchase',
    29000.00, 48, 604.17, 2,
    CURRENT_DATE + INTERVAL '25 days', 0,
    '405 Brookside Rd, Columbus, OH 43215', NULL
);
