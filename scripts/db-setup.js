// Uso: node scripts/db-setup.js <arquivo .env>
// Cria as tabelas no banco configurado no arquivo informado. O banco precisa existir.
import dotenv from 'dotenv';
import { loadEnv } from '../src/config/env.js';
import { createDb } from '../src/db.js';
import { applySchema } from './applySchema.js';

const envFile = process.argv[2] ?? '.env';
const values = {};
dotenv.config({ path: envFile, processEnv: values, quiet: true });

let db;
try {
  const env = loadEnv({ ...process.env, ...values });
  db = createDb(env);
  await applySchema(db);
  console.log(`Schema aplicado em ${env.DB_NAME}`);
} catch (err) {
  console.error(`Falha ao aplicar o schema: ${err.message}`);
  process.exitCode = 1;
} finally {
  await db?.close();
}
