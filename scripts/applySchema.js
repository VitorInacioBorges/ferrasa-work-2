import fs from 'node:fs/promises';
import path from 'node:path';

const SCHEMA_PATH = path.join(import.meta.dirname, '..', 'database', 'schema.sql');

export async function applySchema(db) {
  const sql = await fs.readFile(SCHEMA_PATH, 'utf8');
  await db.query(sql);
}
