import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain, hash) => {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
};
