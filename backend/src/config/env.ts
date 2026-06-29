import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: process.env.PORT ?? '4000',
  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  REGISTRATION_JWT_EXPIRES_IN: process.env.REGISTRATION_JWT_EXPIRES_IN ?? '15m',
  LOGIN_JWT_EXPIRES_IN: process.env.LOGIN_JWT_EXPIRES_IN ?? '24h',

  MAILTRAP_HOST: required('MAILTRAP_HOST'),
  MAILTRAP_PORT: Number(process.env.MAILTRAP_PORT ?? '2525'),
  MAILTRAP_USER: required('MAILTRAP_USER'),
  MAILTRAP_PASS: required('MAILTRAP_PASS'),

  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Loan Servicing <no-reply@loanservicing.demo>',

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
};
