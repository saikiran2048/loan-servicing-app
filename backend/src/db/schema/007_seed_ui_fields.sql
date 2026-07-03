-- 007_seed_ui_fields.sql
-- Backfills vin / vehicle_color / phone / apr for the 9 seed accounts
-- created in 003_seed_accounts.sql, and sets autopay_enabled for a couple
-- of accounts so the redesigned dashboard has non-default states to show.
--
-- VINs are believable-format placeholders (17 chars), not decodable/real.
-- Phone numbers use each account's real area code (per its seeded address)
-- with a 555 exchange (reserved for fictional use).
-- APR values are realistic-range auto-loan rates, varied per account.

BEGIN;

-- 1. Margaret Holloway — Honda Accord 2021 (deceased, non-active)
UPDATE accounts SET
    vin = '1HGCV1F34MA123456',
    vehicle_color = 'Modern Steel Metallic',
    phone = '217-555-0142',
    apr = 6.49
WHERE account_number = '4471098230';

-- 2. Derek Vance — Ford Escape 2019 (charge_off, non-active)
UPDATE accounts SET
    vin = '1FMCU9G60KUA23456',
    vehicle_color = 'Oxford White',
    phone = '918-555-0177',
    apr = 7.25
WHERE account_number = '4471098231';

-- 3. Janelle Marsh — Toyota Camry 2020 (repo, non-active)
UPDATE accounts SET
    vin = '4T1BZ1HK5LU123456',
    vehicle_color = 'Celestial Silver Metallic',
    phone = '775-555-0134',
    apr = 6.99
WHERE account_number = '4471098232';

-- 4. Aaron Whitfield — Chevrolet Equinox 2022 (active, fresh/unregistered)
UPDATE accounts SET
    vin = '3GNAXUEV5NL123456',
    vehicle_color = 'Summit White',
    phone = '303-555-0198',
    apr = 5.49
WHERE account_number = '5102837461';

-- 5. Priya Natarajan — Subaru Outback 2021 (active, already registered)
UPDATE accounts SET
    vin = '4S4BTANC5M3123456',
    vehicle_color = 'Crystal Black Silica',
    phone = '512-555-0161',
    apr = 4.99,
    autopay_enabled = true
WHERE account_number = '5102837462';

-- 6. Marcus Bell — Nissan Altima 2018 (active, near payoff)
UPDATE accounts SET
    vin = '1N4AL3AP0JC123456',
    vehicle_color = 'Gun Metallic',
    phone = '704-555-0119',
    apr = 6.25
WHERE account_number = '5102837463';

-- 7. Lauren Castillo — Mazda CX-5 2020 (active, delinquent)
UPDATE accounts SET
    vin = 'JM3KFBCM8L0123456',
    vehicle_color = 'Soul Red Crystal Metallic',
    phone = '916-555-0183',
    apr = 7.75,
    autopay_enabled = true   -- delinquent + autopay on: exercises the
                              -- simulated auto-charge path on next
                              -- GET /dashboard call
WHERE account_number = '5102837464';

-- 8. Trevor Banks — Hyundai Tucson 2022 (active, DDC 1/2 used)
UPDATE accounts SET
    vin = 'KM8J3CAL5NU123456',
    vehicle_color = 'Amazon Gray',
    phone = '602-555-0155',
    apr = 5.99
WHERE account_number = '5102837465';

-- 9. Olivia Reyes — Kia Sportage 2023 (active, vanilla spare account)
UPDATE accounts SET
    vin = 'KNDPM3AC0P7123456',
    vehicle_color = 'Wolf Gray',
    phone = '614-555-0127',
    apr = 6.75
WHERE account_number = '5102837466';

COMMIT;