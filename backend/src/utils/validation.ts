// RFC-5322-ish pragmatic email regex — good enough for real-world form validation,
// not attempting full RFC 5322 compliance (which is famously absurd to match exactly).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password complexity per REQUIREMENTS.md §2 Step 2:
 * - min 8 chars
 * - at least 1 uppercase, 1 lowercase, 1 number, 1 special char
 * - must not contain the account number or any part of the customer's name
 *   (case-insensitive substring check)
 */
export function validatePassword(
  password: string,
  accountNumber: string,
  customerName: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number.');
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=~`[\];'/\\]/.test(password)) {
    errors.push('Password must contain at least 1 special character.');
  }

  const lowerPassword = password.toLowerCase();

  if (accountNumber && lowerPassword.includes(accountNumber.toLowerCase())) {
    errors.push('Password cannot contain your account number or name.');
  } else if (customerName) {
    // Check each "part" of the name (split on whitespace) as a substring,
    // ignoring very short fragments (e.g. middle initials) to avoid
    // pathological false positives like a name containing "a".
    const nameParts = customerName
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 3);

    const containsNamePart = nameParts.some((part) => lowerPassword.includes(part));
    if (containsNamePart) {
      errors.push('Password cannot contain your account number or name.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
