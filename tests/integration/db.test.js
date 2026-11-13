import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { applySchema } from '../../scripts/applySchema.js';
import { createTestDb, loadTestEnv, resetDb } from '../helpers/testDb.js';

let db;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.close();
});

async function insertAuthor() {
  const { rows } = await db.query(
    "INSERT INTO authors (name, nationality) VALUES ('Ana', 'Brasileira') RETURNING id",
  );
  return rows[0].id;
}

async function insertBook(authorId, isbn = '9788535910663') {
  await db.query(
    `INSERT INTO books (title, isbn, publication_year, genre, page_count, author_id)
     VALUES ('Livro', $1, 1900, 'Romance', 100, $2)`,
    [isbn, authorId],
  );
}

describe('database schema', () => {
  test('applies schema twice without error', async () => {
    await expect(applySchema(db)).resolves.toBeUndefined();
    await expect(applySchema(db)).resolves.toBeUndefined();
  });

  test('creates authors and books tables with cascade', async () => {
    const authorId = await insertAuthor();
    await insertBook(authorId);

    await db.query('DELETE FROM authors WHERE id = $1', [authorId]);

    const { rows } = await db.query('SELECT count(*)::int AS count FROM books');
    expect(rows[0].count).toBe(0);
  });

  test('rejects duplicate isbn with code 23505', async () => {
    const authorId = await insertAuthor();
    await insertBook(authorId);

    await expect(insertBook(authorId)).rejects.toMatchObject({ code: '23505' });
  });

  test('fills created_at and updated_at by default', async () => {
    await insertAuthor();

    const { rows } = await db.query('SELECT created_at, updated_at FROM authors');
    expect(rows[0].created_at).toBeInstanceOf(Date);
    expect(rows[0].updated_at).toBeInstanceOf(Date);
  });
});

describe('loadTestEnv', () => {
  const base = {
    NODE_ENV: 'test',
    PUBLIC_URL: 'http://localhost:3001',
    DB_HOST: 'localhost',
    DB_PORT: '5433',
    DB_USER: 'postgres',
    DB_PASSWORD: 'x',
    DB_NAME: 'livros_test',
  };

  test('loadTestEnv refuses non _test database', () => {
    expect(() => loadTestEnv({ ...base, DB_NAME: 'livros_dev' })).toThrow(
      'Testes de integração exigem NODE_ENV=test e DB_NAME terminando em _test',
    );
  });

  test('loadTestEnv refuses NODE_ENV other than test', () => {
    expect(() => loadTestEnv({ ...base, NODE_ENV: 'development' })).toThrow(/NODE_ENV=test/);
  });

  test('loadTestEnv reads .env.test by default', () => {
    expect(loadTestEnv().DB_NAME).toMatch(/_test$/);
  });
});
