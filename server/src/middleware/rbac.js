import { prisma } from '../db.js';

// Carrega o UserPermission do usuário autenticado e anexa em req.userPermission.
// UserPermission é a fonte de verdade do RBAC fino (dashboard/financeiro/etc.),
// igual ao comportamento atual do app (ver src/Layout.jsx).
export async function loadPermissions(req, _res, next) {
  if (!req.user) return next();
  req.userPermission = await prisma.userPermission.findUnique({
    where: { userEmail: req.user.email },
  });
  next();
}

export function isAdminUser(req) {
  return req.user?.role === 'admin' || req.userPermission?.isAdmin === true;
}

export function requireAdmin(req, res, next) {
  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

// Exige uma permissão específica (chave dentro de UserPermission.permissions),
// admins sempre passam.
export function requirePermission(key) {
  return (req, res, next) => {
    if (isAdminUser(req)) return next();
    const allowed = req.userPermission?.active && req.userPermission?.permissions?.[key];
    if (!allowed) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}
