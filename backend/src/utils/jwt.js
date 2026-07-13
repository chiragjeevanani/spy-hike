import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Token payload is intentionally small: subject id, role (customer|organizer|
// admin) for access control, and email for convenience/logging.
export const signToken = ({ sub, role, email }) =>
  jwt.sign({ sub, role, email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

// Short-lived proof that a phone number passed OTP verification. Issued by the
// phone-verify endpoint and consumed at registration to stamp mobileVerified,
// so the two-step (verify → register) flow can't be forged without the code.
export const signPhoneToken = (mobile) =>
  jwt.sign({ mobile, purpose: 'phone_verify' }, env.jwtSecret, { expiresIn: '15m' });

// Returns the verified mobile if the token is valid & purpose-scoped, else null.
export const verifyPhoneToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return payload.purpose === 'phone_verify' ? payload.mobile : null;
  } catch {
    return null;
  }
};
