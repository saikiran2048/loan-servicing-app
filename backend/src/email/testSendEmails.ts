/**
 * testSendEmails.ts
 * ------------------
 * Stage 3 manual verification script.
 * Sends ONE email type at a time to avoid Mailtrap free-tier rate limits.
 *
 * Usage:
 *   npx ts-node src/email/testSendEmails.ts <type> <recipient>
 *
 * Types:
 *   otp           "Your verification code"
 *   registration  "Welcome — Your account is registered"
 *   payment       "Payment Received — Account 7461"
 *   ddc           "Due Date Updated — Account 7461"
 *
 * Examples:
 *   npx ts-node src/email/testSendEmails.ts otp you@example.com
 *   npx ts-node src/email/testSendEmails.ts registration you@example.com
 *   npx ts-node src/email/testSendEmails.ts payment you@example.com
 *   npx ts-node src/email/testSendEmails.ts ddc you@example.com
 *
 * Run them one at a time — no need for delays between them since each
 * invocation is a fresh process. Check Mailtrap after each one.
 */

import 'dotenv/config';
import { sendOtpEmail } from './sendEmail';
import { sendRegistrationConfirmationEmail } from './sendEmail';
import { sendPaymentConfirmationEmail } from './sendEmail';
import { sendDueDateChangeConfirmationEmail } from './sendEmail';

const TYPE      = process.argv[2];
const RECIPIENT = process.argv[3] || process.env.TEST_EMAIL_TO;

const VALID_TYPES = ['otp', 'registration', 'payment', 'ddc'];

if (!TYPE || !VALID_TYPES.includes(TYPE)) {
  console.error(
    `Error: missing or invalid email type.\n\n` +
    `Usage: npx ts-node src/email/testSendEmails.ts <type> <recipient>\n\n` +
    `Valid types: ${VALID_TYPES.join(' | ')}\n\n` +
    `Example: npx ts-node src/email/testSendEmails.ts otp you@example.com`
  );
  process.exit(1);
}

if (!RECIPIENT) {
  console.error(
    `Error: no recipient address supplied.\n` +
    `Usage: npx ts-node src/email/testSendEmails.ts ${TYPE} your@email.com`
  );
  process.exit(1);
}

// Believable-fake test data matching the seed accounts.
const TEST_ACCOUNT_NUMBER = '5102837461';
const TEST_CUSTOMER_NAME  = 'Aaron Whitfield';

async function run() {
  switch (TYPE) {
    case 'otp': {
      console.log(`Sending OTP email to ${RECIPIENT}...`);
      await sendOtpEmail(RECIPIENT!, '482913', 5);
      console.log('✓ Sent.');
      console.log('\nVerify in Mailtrap:');
      console.log('  □ Subject: "Your verification code"');
      console.log('  □ OTP "482913" displayed clearly in the body');
      console.log('  □ Expiry copy says "5 minutes"');
      console.log('  □ "If you didn\'t request this code..." note present');
      console.log('  □ Footer: portal link, support phone/hours/email, disclaimer');
      break;
    }

    case 'registration': {
      console.log(`Sending Registration Confirmation email to ${RECIPIENT}...`);
      await sendRegistrationConfirmationEmail(RECIPIENT!, TEST_CUSTOMER_NAME, TEST_ACCOUNT_NUMBER);
      console.log('✓ Sent.');
      console.log('\nVerify in Mailtrap:');
      console.log('  □ Subject: "Welcome — Your account is registered"');
      console.log('  □ Greeting: "Hi Aaron Whitfield,"');
      console.log('  □ Account number shown as ••••••7461 (masked)');
      console.log('  □ Footer: portal link, support phone/hours/email, disclaimer');
      break;
    }

    case 'payment': {
      console.log(`Sending Payment Confirmation email to ${RECIPIENT}...`);
      await sendPaymentConfirmationEmail({
        to: RECIPIENT!,
        customerName: TEST_CUSTOMER_NAME,
        accountNumber: TEST_ACCOUNT_NUMBER,
        amount: 750.00,
        paymentDate: new Date(),
        bankLast4: '4321',
        balanceRemaining: 26250.00,
      });
      console.log('✓ Sent.');
      console.log('\nVerify in Mailtrap:');
      console.log('  □ Subject: "Payment Received — Account 7461"');
      console.log('  □ Amount paid: $750.00');
      console.log('  □ Bank account: •••• 4321');
      console.log('  □ Remaining balance: $26,250.00 (with comma separator)');
      console.log('  □ NO due date field in the email (per requirements decision log)');
      console.log('  □ "This payment does not change your scheduled due date." note present');
      console.log('  □ Footer: portal link, support phone/hours/email, disclaimer');
      break;
    }

    case 'ddc': {
      console.log(`Sending Due Date Change Confirmation email to ${RECIPIENT}...`);
      await sendDueDateChangeConfirmationEmail({
        to: RECIPIENT!,
        customerName: TEST_CUSTOMER_NAME,
        accountNumber: TEST_ACCOUNT_NUMBER,
        previousDueDate: new Date('2026-07-19'),
        newDueDate: new Date('2026-07-26'),
        changesRemaining: 1,
      });
      console.log('✓ Sent.');
      console.log('\nVerify in Mailtrap:');
      console.log('  □ Subject: "Due Date Updated — Account 7461"');
      console.log('  □ Previous due date: July 19, 2026 (shown with strikethrough)');
      console.log('  □ New due date: July 26, 2026 (highlighted in blue)');
      console.log('  □ "1 due date change remaining" (singular, not plural)');
      console.log('  □ Footer: portal link, support phone/hours/email, disclaimer');
      break;
    }
  }
}

run().catch((err) => {
  console.error('\nFailed to send:', err.message ?? err);
  process.exit(1);
});