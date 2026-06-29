import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface RegistrationSetupPayload {
  purpose: 'registration_setup';
  accountId: number;
}

export interface RegistrationOtpPayload {
  purpose: 'registration_otp';
  accountId: number;
  otpId: number;
}

export interface LoginPayload {
  purpose: 'login';
  customerId: number;
  accountId: number;
}

export type AppJwtPayload = RegistrationSetupPayload | RegistrationOtpPayload | LoginPayload;

// @types/jsonwebtoken types `expiresIn` as `number | StringValue` (a template
// literal type like "15m" | "24h" | ...) rather than a plain `string`, since
// our env vars are validated strings at runtime but not at the type level,
// we cast through SignOptions['expiresIn'] at the single point where the
// env value crosses into the jwt library, rather than weakening env.ts's
// typing or scattering `as any` across every call site.
const registrationExpiresIn = env.REGISTRATION_JWT_EXPIRES_IN as SignOptions['expiresIn'];
const loginExpiresIn = env.LOGIN_JWT_EXPIRES_IN as SignOptions['expiresIn'];

export function signRegistrationSetupToken(accountId: number): string {
  const payload: RegistrationSetupPayload = { purpose: 'registration_setup', accountId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: registrationExpiresIn });
}

export function signRegistrationOtpToken(accountId: number, otpId: number): string {
  const payload: RegistrationOtpPayload = { purpose: 'registration_otp', accountId, otpId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: registrationExpiresIn });
}

export function signLoginToken(customerId: number, accountId: number): string {
  const payload: LoginPayload = { purpose: 'login', customerId, accountId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: loginExpiresIn });
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AppJwtPayload;
}
