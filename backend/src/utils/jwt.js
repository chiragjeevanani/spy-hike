import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Token payload is intentionally small: subject id, role (customer|organizer|
// admin) for access control, and email for convenience/logging.
export const signToken = ({ sub, role, email }) =>
  jwt.sign({ sub, role, email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
