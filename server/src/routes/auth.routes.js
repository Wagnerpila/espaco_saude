import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { loadPermissions } from '../middleware/rbac.js';
import { prismaToResponse } from '../utils/case.js';

export const authRouter = Router();

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
};

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

async function userWithPermissions(user) {
  const permission = await prisma.userPermission.findUnique({ where: { userEmail: user.email } });
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return {
    ...prismaToResponse(safeUser),
    is_admin: user.role === 'admin' || permission?.isAdmin === true,
    permissions: permission?.permissions || null,
    user_role: permission?.userRole || (user.role === 'admin' ? 'admin' : null),
  };
}

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email e senha são obrigatórios' });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !user.passwordHash || !user.active) {
    return res.status(401).json({ error: 'credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'credenciais inválidas' });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);

  res.json({ access_token: accessToken, refresh_token: refreshToken, user: await userWithPermissions(user) });
});

authRouter.post('/refresh', async (req, res) => {
  const token = req.body?.refresh_token || req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'auth_required' });

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'auth_required' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ access_token: accessToken, refresh_token: refreshToken });
  } catch (_err) {
    res.status(401).json({ error: 'auth_required' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('access_token', COOKIE_OPTS);
  res.clearCookie('refresh_token', COOKIE_OPTS);
  res.json({ success: true });
});

authRouter.get('/me', requireAuth, loadPermissions, async (req, res) => {
  res.json(await userWithPermissions(req.user));
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const { full_name, avatar_url } = req.body || {};
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(full_name !== undefined ? { fullName: full_name } : {}),
      ...(avatar_url !== undefined ? { avatarUrl: avatar_url } : {}),
    },
  });
  res.json(await userWithPermissions(user));
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter ao menos 8 caracteres' });
  }
  if (req.user.passwordHash) {
    const valid = await bcrypt.compare(current_password || '', req.user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  const passwordHash = await bcrypt.hash(new_password, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  res.json({ success: true });
});

// Fluxo de convite (substitui base44 InviteLink + base44.users.inviteUser):
// admin cria um InviteLink (fora deste router, ver functions.routes.js),
// o convidado define a senha aqui para virar um User de verdade.
authRouter.get('/invite/:token', async (req, res) => {
  const invite = await prisma.inviteLink.findUnique({ where: { token: req.params.token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: 'Convite inválido ou expirado' });
  }
  res.json({ email: invite.email, role: invite.role });
});

authRouter.post('/invite/:token/accept', async (req, res) => {
  const { full_name, password } = req.body || {};
  if (!full_name || !password || password.length < 8) {
    return res.status(400).json({ error: 'Nome e senha (mín. 8 caracteres) são obrigatórios' });
  }

  const invite = await prisma.inviteLink.findUnique({ where: { token: req.params.token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: 'Convite inválido ou expirado' });
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  const passwordHash = await bcrypt.hash(password, 10);

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, fullName: full_name } })
    : await prisma.user.create({ data: { email: invite.email, passwordHash, fullName: full_name, role: 'user' } });

  await prisma.inviteLink.update({ where: { id: invite.id }, data: { used: true, usedAt: new Date() } });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ access_token: accessToken, refresh_token: refreshToken, user: await userWithPermissions(user), invited_role: invite.role });
});

// Compat: alguns componentes chamam algo equivalente a base44 checkAppState
// sem token — devolve 200 "não autenticado" em vez de erro de rede.
authRouter.get('/session', optionalAuth, loadPermissions, async (req, res) => {
  if (!req.user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: await userWithPermissions(req.user) });
});
