import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, tokenVersion: user.tokenVersion || 0 }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
