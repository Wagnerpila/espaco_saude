// Cria (ou atualiza) o primeiro usuário admin do sistema.
// Necessário porque, sem o base44, não existe mais login hospedado externamente —
// alguém precisa existir no banco para conseguir entrar pela primeira vez.
//
// Uso: node scripts/create-admin.js "admin@clinica.com" "SenhaForte123" "Nome Completo"
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';

const [, , email, password, fullName] = process.argv;

if (!email || !password || !fullName) {
  console.error('Uso: node scripts/create-admin.js <email> <senha> "<nome completo>"');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const normalizedEmail = email.toLowerCase().trim();

const user = await prisma.user.upsert({
  where: { email: normalizedEmail },
  update: { passwordHash, fullName, role: 'admin', active: true },
  create: { email: normalizedEmail, passwordHash, fullName, role: 'admin' },
});

await prisma.userPermission.upsert({
  where: { userEmail: normalizedEmail },
  update: { isAdmin: true, active: true },
  create: {
    userEmail: normalizedEmail,
    userName: fullName,
    userRole: 'admin',
    isAdmin: true,
    permissions: {
      dashboard: true,
      schedule: true,
      patients: true,
      financial: true,
      medical_records: true,
      professionals: true,
      admin_panel: true,
      user_management: true,
      chat_assistant: true,
      my_patients: true,
      professional_financial: true,
    },
  },
});

console.log(`Admin pronto: ${user.email} (id ${user.id})`);
await prisma.$disconnect();
