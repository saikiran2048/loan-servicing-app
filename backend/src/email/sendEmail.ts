import { transporter } from './transporter';
import { env } from '../config/env';

// NOTE: Stage 2 placeholder — plain-text bodies only, just enough for the
// registration/payment/DDC flows to be functionally complete end-to-end.
// Full HTML templates with the common footer (logo, support info,
// disclaimer per REQUIREMENTS.md §7.1) are built in Stage 3.

export async function sendOtpEmail(to: string, otp: string, expiryMinutes: number) {
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Your verification code',
    text: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
  });
}

export async function sendRegistrationConfirmationEmail(
  to: string,
  customerName: string,
  accountNumber: string
) {
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Welcome — Your account is registered',
    text: `Hi ${customerName}, your account ${accountNumber} has been successfully registered.`,
  });
}

export async function sendPaymentConfirmationEmail(params: {
  to: string;
  customerName: string;
  accountNumber: string;
  amount: number;
  paymentDate: Date;
  bankLast4: string;
  balanceRemaining: number;
}) {
  const last4 = params.accountNumber.slice(-4);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: `Payment Received — Account ${last4}`,
    text:
      `Hi ${params.customerName}, we received your payment of $${params.amount.toFixed(2)} ` +
      `on ${params.paymentDate.toDateString()} (bank account ending ${params.bankLast4}). ` +
      `Remaining balance: $${params.balanceRemaining.toFixed(2)}.`,
  });
}

export async function sendDueDateChangeConfirmationEmail(params: {
  to: string;
  customerName: string;
  accountNumber: string;
  previousDueDate: Date;
  newDueDate: Date;
  changesRemaining: number;
}) {
  const last4 = params.accountNumber.slice(-4);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: `Due Date Updated — Account ${last4}`,
    text:
      `Hi ${params.customerName}, your due date has been updated from ` +
      `${params.previousDueDate.toDateString()} to ${params.newDueDate.toDateString()}. ` +
      `You have ${params.changesRemaining} due date change(s) remaining.`,
  });
}
