import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../db.js';

// Exige um access token válido (header Authorization: Bearer <token> ou
// cookie `access_token`). Anexa req.user = { id, email, role, fullName }.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearerToken || req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({ error: 'auth_required' });
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'auth_required' });
    }

    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'auth_required' });
  }
}

// Não falha se não houver token — só popula req.user quando possível.
// Útil para rotas públicas que mudam de comportamento se o usuário está logado.
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearerToken || req.cookies?.access_token;
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user?.active) req.user = user;
  } catch (_err) {
    // ignora token inválido em rota opcional
  }
  next();
}
