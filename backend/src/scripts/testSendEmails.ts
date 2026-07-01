/**
 * Manual Mailtrap delivery test — run this locally with your real .env
 * (Mailtrap Email Testing sandbox credentials) to confirm all 4 email
 * types actually land in your Mailtrap inbox with correct rendering.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/testSendEmails.ts
 *
 * This does NOT touch the database — it calls the email-sending functions
 * directly with hardcoded sample data, so it's safe to run anytime.
 */
import {
  sendOtpEmail,
  sendRegistrationConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendDueDateChangeConfirmationEmail,
} from '../email/sendEmail';

const TEST_RECIPIENT = 'test-recipient@example.com'; // Mailtrap sandbox ignores the real address

async function main() {
  console.log('Sending OTP email...');
  await sendOtpEmail(TEST_RECIPIENT, '482913', 5);
  console.log('  done.');

  console.log('Sending registration confirmation email...');
  await sendRegistrationConfirmationEmail(TEST_RECIPIENT, 'Aaron Whitfield', '5102837461');
  console.log('  done.');

  console.log('Sending payment confirmation email...');
  await sendPaymentConfirmationEmail({
    to: TEST_RECIPIENT,
    customerName: 'Aaron Whitfield',
    accountNumber: '5102837461',
    amount: 750,
    paymentDate: new Date(),
    bankLast4: '4321',
    balanceRemaining: 26250,
  });
  console.log('  done.');

  console.log('Sending due date change confirmation email...');
  await sendDueDateChangeConfirmationEmail({
    to: TEST_RECIPIENT,
    customerName: 'Aaron Whitfield',
    accountNumber: '5102837461',
    previousDueDate: new Date('2026-07-19'),
    newDueDate: new Date('2026-07-26'),
    changesRemaining: 1,
  });
  console.log('  done.');

  console.log('\nAll 4 emails sent. Check your Mailtrap Email Testing inbox.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to send test emails:', err);
  process.exit(1);
});
