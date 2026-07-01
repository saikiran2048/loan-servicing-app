import { transporter } from './transporter';
import { env } from '../config/env';
import { renderOtpEmail } from './templates/otpEmail';
import { renderRegistrationConfirmationEmail } from './templates/registrationConfirmationEmail';
import { renderPaymentConfirmationEmail, PaymentConfirmationEmailParams } from './templates/paymentConfirmationEmail';
import {
  renderDueDateChangeConfirmationEmail,
  DueDateChangeConfirmationEmailParams,
} from './templates/dueDateChangeConfirmationEmail';

export async function sendOtpEmail(to: string, otp: string, expiryMinutes: number) {
  const { html, text } = renderOtpEmail(otp, expiryMinutes);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Your verification code',
    text,
    html,
  });
}

export async function sendRegistrationConfirmationEmail(
  to: string,
  customerName: string,
  accountNumber: string
) {
  const { html, text } = renderRegistrationConfirmationEmail(customerName, accountNumber);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Welcome \u2014 Your account is registered',
    text,
    html,
  });
}

export async function sendPaymentConfirmationEmail(
  params: PaymentConfirmationEmailParams & { to: string }
) {
  const { to, ...templateParams } = params;
  const { html, text } = renderPaymentConfirmationEmail(templateParams);
  const last4 = params.accountNumber.slice(-4);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `Payment Received \u2014 Account ${last4}`,
    text,
    html,
  });
}

export async function sendDueDateChangeConfirmationEmail(
  params: DueDateChangeConfirmationEmailParams & { to: string }
) {
  const { to, ...templateParams } = params;
  const { html, text } = renderDueDateChangeConfirmationEmail(templateParams);
  const last4 = params.accountNumber.slice(-4);
  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `Due Date Updated \u2014 Account ${last4}`,
    text,
    html,
  });
}
