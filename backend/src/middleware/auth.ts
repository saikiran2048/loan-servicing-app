import { Request, Response, NextFunction } from 'express';
import {
  verifyToken,
  RegistrationSetupPayload,
  RegistrationOtpPayload,
  LoginPayload,
} from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      registrationSetup?: RegistrationSetupPayload;
      registrationOtp?: RegistrationOtpPayload;
      auth?: LoginPayload;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export function requireRegistrationSetupToken(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid registration session.' });
  }
  try {
    const payload = verifyToken(token);
    if (payload.purpose !== 'registration_setup') {
      return res.status(401).json({ error: 'Missing or invalid registration session.' });
    }
    req.registrationSetup = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Your registration session has expired. Please start again.' });
  }
}

export function requireRegistrationOtpToken(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid registration session.' });
  }
  try {
    const payload = verifyToken(token);
    if (payload.purpose !== 'registration_otp') {
      return res.status(401).json({ error: 'Missing or invalid registration session.' });
    }
    req.registrationOtp = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Your registration session has expired. Please start again.' });
  }
}

export function requireLogin(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = verifyToken(token);
    if (payload.purpose !== 'login') {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
