// Exporta todas as entidades do app base44 atual para arquivos JSON em
// server/migration-data/, para depois serem importados no Postgres pelo
// import-postgres.js.
//
// IMPORTANTE — leia antes de rodar em produção:
// Este script só pode se autenticar como um USUÁRIO normal (via
// loginViaEmailPassword ou um access_token existente). O modo
// `asServiceRole` do SDK do base44 (que ignora as regras de acesso/RLS de
// cada entidade) só está disponível *dentro* de uma function hospedada no
// próprio base44 — não é possível usá-lo a partir de um script externo.
// Isso significa que, se alguma entidade tiver regra de RLS restritiva
// (ex.: MedicalRecord, cujo schema documenta "profissional/paciente só vê o
// próprio"), o admin pode não receber TODAS as linhas via list()/filter().
// Depois de rodar, confira a contagem de cada entidade contra o painel do
// base44 (Data → cada entidade mostra o total de registros). Se algo bater
// menor que o esperado, use o botão de exportar CSV do próprio base44 para
// aquela entidade específica como alternativa.
//
// Uso:
//   BASE44_APP_ID=xxx BASE44_TOKEN=xxx node scripts/export-base44.js
// ou, com login/senha de um usuário admin:
//   BASE44_APP_ID=xxx BASE44_ADMIN_EMAIL=admin@x.com BASE44_ADMIN_PASSWORD=xxx node scripts/export-base44.js
//
// Para obter um BASE44_TOKEN sem senha: logue no app base44 atual como admin
// no navegador, abra o DevTools → Application → Local Storage, e copie o
// valor da chave `base44_access_token`.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@base44/sdk';

const ENTITY_NAMES = [
  'Patient',
  'Professional',
  'Appointment',
  'Commission',
  'MonthlyClosing',
  'FinancialRecord',
  'MedicalRecord',
  'MedicalRecordTemplate',
  'Equipment',
  'ExerciseItem',
  'Room',
  'ScheduleBlock',
  'ServicePlan',
  'ServicePackage',
  'Notification',
  'ProfessionalRequest',
  'InviteLink',
  'UserPermission',
  'WhatsAppConversation',
];

const OUTPUT_DIR = path.resolve('migration-data');
const PAGE_SIZE = 1000; // abaixo do máximo de 5000 do base44, margem de segurança

async function exportEntity(base44, name) {
  const handler = base44.entities[name];
  if (!handler) {
    console.warn(`[export] Entidade "${name}" não existe neste app base44 — pulando.`);
    return [];
  }

  const all = [];
  let skip = 0;
  for (;;) {
    const page = await handler.list('-created_date', PAGE_SIZE, skip);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

async function main() {
  const appId = process.env.BASE44_APP_ID;
  if (!appId) {
    console.error('BASE44_APP_ID não definido no .env');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const base44 = createClient({ appId, token: process.env.BASE44_TOKEN || undefined });

  if (!process.env.BASE44_TOKEN) {
    const email = process.env.BASE44_ADMIN_EMAIL;
    const password = process.env.BASE44_ADMIN_PASSWORD;
    if (!email || !password) {
      console.error('Defina BASE44_TOKEN ou BASE44_ADMIN_EMAIL + BASE44_ADMIN_PASSWORD no .env');
      process.exit(1);
    }
    await base44.auth.loginViaEmailPassword(email, password);
  }

  const me = await base44.auth.me();
  console.log(`[export] Autenticado como ${me.email} (role=${me.role}). Iniciando exportação...`);

  const summary = [];
  for (const name of ENTITY_NAMES) {
    process.stdout.write(`[export] ${name}... `);
    const rows = await exportEntity(base44, name);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.json`), JSON.stringify(rows, null, 2), 'utf8');
    console.log(`${rows.length} registro(s)`);
    summary.push({ name, count: rows.length });
  }

  console.log('\n[export] Resumo:');
  console.table(summary);
  console.log(
    `\n[export] Arquivos salvos em ${OUTPUT_DIR}\n` +
    '[export] ⚠️  Confira as contagens acima contra o painel do base44 antes de importar — ' +
    'ver aviso de RLS no topo deste script.'
  );
}

main().catch((err) => {
  console.error('[export] Falhou:', err);
  process.exit(1);
});
