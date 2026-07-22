// Lê os JSONs gerados por export-base44.js (em server/migration-data/) e
// importa no Postgres via Prisma, preservando os IDs e datas originais do
// base44. Rodar depois de `npx prisma migrate deploy` (banco já com o schema
// aplicado).
//
// Uso: node scripts/import-postgres.js
//
// É seguro rodar mais de uma vez — usa upsert por id.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/db.js';
import { getEntityConfig } from '../src/entityMap.js';

const DATA_DIR = path.resolve('migration-data');

// Ordem de importação respeitando as foreign keys (pais antes dos filhos).
const IMPORT_ORDER = [
  'Patient',
  'Professional',
  'Room',
  'Equipment',
  'ExerciseItem',
  'MedicalRecordTemplate',
  'ServicePlan',
  'ServicePackage',
  'MonthlyClosing',
  'Appointment',
  'Commission',
  'FinancialRecord',
  'MedicalRecord',
  'ScheduleBlock',
  'Notification',
  'ProfessionalRequest',
  'InviteLink',
  'UserPermission',
  'WhatsAppConversation',
];

const snakeToCamel = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function toPrismaRow(entityName, raw, dateFields) {
  const data = {};
  for (const [key, value] of Object.entries(raw)) {
    if (['id', 'created_date', 'updated_date', 'created_by'].includes(key)) continue;
    data[snakeToCamel(key)] = value;
  }
  for (const field of dateFields) {
    const camelKey = snakeToCamel(field);
    const value = data[camelKey];
    if (value === undefined || value === null || value === '') continue;
    data[camelKey] = Array.isArray(value) ? value.map((v) => new Date(v)) : new Date(value);
  }
  return {
    id: raw.id,
    ...data,
    ...(raw.created_date ? { createdAt: new Date(raw.created_date) } : {}),
    ...(raw.updated_date ? { updatedAt: new Date(raw.updated_date) } : {}),
  };
}

async function importEntity(entityName) {
  const filePath = path.join(DATA_DIR, `${entityName}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[import] ${entityName}: arquivo não encontrado, pulando (${filePath})`);
    return { entity: entityName, imported: 0, failed: 0, failures: [] };
  }

  const config = getEntityConfig(entityName);
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let imported = 0;
  const failures = [];

  for (const raw of rows) {
    try {
      const data = toPrismaRow(entityName, raw, config.dateFields);
      await prisma[config.model].upsert({ where: { id: raw.id }, create: data, update: data });
      imported += 1;
    } catch (err) {
      failures.push({ id: raw.id, error: err.message });
    }
  }

  console.log(`[import] ${entityName}: ${imported}/${rows.length} importados${failures.length ? `, ${failures.length} falha(s)` : ''}`);
  return { entity: entityName, imported, failed: failures.length, failures };
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Diretório ${DATA_DIR} não existe. Rode export-base44.js primeiro.`);
    process.exit(1);
  }

  const results = [];
  for (const entityName of IMPORT_ORDER) {
    results.push(await importEntity(entityName));
  }

  const totalImported = results.reduce((s, r) => s + r.imported, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);

  console.log(`\n[import] Total: ${totalImported} importados, ${totalFailed} falhas.`);

  const withFailures = results.filter((r) => r.failed > 0);
  if (withFailures.length) {
    console.log('\n[import] Falhas por entidade (geralmente FK apontando para um registro que falhou/não existe — verifique a ordem e os dados de origem):');
    for (const r of withFailures) {
      console.log(`  ${r.entity}:`);
      for (const f of r.failures.slice(0, 10)) console.log(`    id=${f.id}: ${f.error}`);
      if (r.failures.length > 10) console.log(`    ...e mais ${r.failures.length - 10}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[import] Falhou:', err);
  await prisma.$disconnect();
  process.exit(1);
});
