import path from 'node:path';
import dotenv from 'dotenv';
import { loadEnv } from '../../src/config/env.js';
import { createDb } from '../../src/db.js';
import { applySchema } from '../../scripts/applySchema.js';

const ENV_TEST_PATH = path.join(import.meta.dirname, '..', '..', '.env.test');

function readEnvTestFile() {
  const values = {};
  dotenv.config({ path: ENV_TEST_PATH, processEnv: values, quiet: true });
  return values;
}

// Trava de segurança: os testes apagam tabelas, então só rodam num banco *_test.
export function loadTestEnv(source = readEnvTestFile()) {
  const env = loadEnv(source);
  if (env.NODE_ENV !== 'test' || !env.DB_NAME.endsWith('_test')) {
    throw new Error('Testes de integração exigem NODE_ENV=test e DB_NAME terminando em _test');
  }
  return env;
}

export async function createTestDb(env = loadTestEnv()) {
  const db = createDb(env);
  await applySchema(db);
  return db;
}

export async function resetDb(db) {
  await db.query('TRUNCATE books, authors RESTART IDENTITY CASCADE');
}
