-- 002_seed_config.sql
-- Default business-rule values per REQUIREMENTS.md §1.3
-- These are intentionally data-driven so tests can change a value here
-- and assert behavior follows, without a code change.

INSERT INTO config (key, value, description) VALUES
    ('late_fee_percent', '5', '% added to installment amount when delinquent'),
    ('max_due_date_shift_days', '10', 'Max forward shift per due date change'),
    ('max_due_date_changes_lifetime', '2', 'Lifetime cap on due date changes'),
    ('otp_expiry_minutes', '5', 'OTP validity window'),
    ('otp_max_resends', '3', 'Resend attempts before lockout'),
    ('otp_lockout_minutes', '15', 'Cooldown duration after exceeding resend limit');
