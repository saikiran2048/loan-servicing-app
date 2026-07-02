import 'dotenv/config';

function required(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    const missingName = fallbackName ? `${name} or ${fallbackName}` : name;
    throw new Error(`Missing required environment variable: ${missingName}`);
  }
  return value;
}

export const env = {
  PORT: process.env.PORT ?? '4000',
  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  REGISTRATION_JWT_EXPIRES_IN: process.env.REGISTRATION_JWT_EXPIRES_IN ?? '15m',
  LOGIN_JWT_EXPIRES_IN: process.env.LOGIN_JWT_EXPIRES_IN ?? '24h',

  MAILTRAP_HOST: required('MAILTRAP_HOST', 'SMTP_HOST'),
  MAILTRAP_PORT: Number(process.env.MAILTRAP_PORT ?? process.env.SMTP_PORT ?? '2525'),
  MAILTRAP_USER: required('MAILTRAP_USER', 'SMTP_USER'),
  MAILTRAP_PASS: required('MAILTRAP_PASS', 'SMTP_PASS'),

  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Loan Servicing <no-reply@loanservicing.demo>',

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
};
