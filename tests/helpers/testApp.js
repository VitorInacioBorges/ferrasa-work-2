import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.js';
import { createTestDb, loadTestEnv } from './testDb.js';

export const silentLogger = { error: () => {} };

// Monta o app real contra o banco de teste, com uploads numa pasta temporária.
export async function setupTestApp() {
  const env = loadTestEnv();
  const db = await createTestDb(env);
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'livros-uploads-'));
  const config = { ...env, UPLOAD_DIR: uploadDir };
  const app = createApp({ db, config, logger: silentLogger });

  return {
    app,
    db,
    config,
    uploadDir,
    async teardown() {
      await db.close();
      await fs.rm(uploadDir, { recursive: true, force: true });
    },
  };
}
