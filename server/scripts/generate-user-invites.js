// O base44 não expõe os usuários de autenticação pela API de entidades (só
// dá pra exportar as 18 entidades de dados) — e mesmo que desse, não teríamos
// como recuperar as senhas. Então, depois de importar UserPermission (que
// tem o email/nome/papel de cada pessoa), este script cria um User (sem
// senha) para cada um e gera um InviteLink de 7 dias para definir a nova
// senha em /accept-invite/:token.
//
// Uso: node scripts/generate-user-invites.js
// Roda depois de import-postgres.js.
import 'dotenv/config';
import crypto from 'node:crypto';
import { prisma } from '../src/db.js';

const INVITE_DAYS = 7;

async function main() {
  const permissions = await prisma.userPermission.findMany();
  if (permissions.length === 0) {
    console.log('[invites] Nenhum UserPermission encontrado — rode import-postgres.js primeiro.');
    await prisma.$disconnect();
    return;
  }

  const rows = [];

  for (const perm of permissions) {
    const email = perm.userEmail.toLowerCase().trim();

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: perm.userName,
          role: perm.isAdmin ? 'admin' : 'user',
        },
      });
    }

    if (user.passwordHash) {
      // já tem senha definida (ex.: reaproveitando de um admin criado manualmente) — pula
      continue;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.inviteLink.create({
      data: {
        email,
        token,
        role: perm.userRole === 'professional' ? 'professional' : 'patient',
        expiresAt,
        createdBy: 'migration-script',
        notes: 'Gerado automaticamente na migração do base44',
      },
    });

    rows.push({ email, name: perm.userName, role: perm.userRole, invite_path: `/accept-invite/${token}` });
  }

  console.log(`\n[invites] ${rows.length} convite(s) gerado(s) (usuários que já tinham senha foram pulados):\n`);
  console.table(rows);
  console.log(
    '\n[invites] Envie o link "<seu-domínio>" + invite_path para cada pessoa definir a senha nova. ' +
    `Os links expiram em ${INVITE_DAYS} dias — rode este script de novo para gerar novos se precisar.`
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[invites] Falhou:', err);
  await prisma.$disconnect();
  process.exit(1);
});
