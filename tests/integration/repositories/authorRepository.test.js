import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { createAuthorRepository } from '../../../src/repositories/authorRepository.js';
import { createTestDb, resetDb } from '../../helpers/testDb.js';

let db;
let repository;

beforeAll(async () => {
  db = await createTestDb();
  repository = createAuthorRepository(db);
});

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.close();
});

const names = (items) => items.map((author) => author.name);

describe('authorRepository', () => {
  test('create returns mapped author with timestamps', async () => {
    const author = await repository.create({ name: 'Ana', nationality: 'Brasileira' });

    expect(author).toEqual({
      id: 1,
      name: 'Ana',
      nationality: 'Brasileira',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  test('findById returns the author', async () => {
    const created = await repository.create({ name: 'Ana', nationality: 'Brasileira' });

    await expect(repository.findById(created.id)).resolves.toEqual(created);
  });

  test('findById returns null when missing', async () => {
    await expect(repository.findById(999)).resolves.toBeNull();
  });

  describe('findAll', () => {
    beforeEach(async () => {
      for (const name of ['Clarice', 'Ana', 'Bruno']) {
        await repository.create({ name, nationality: 'Brasileira' });
      }
    });

    test('findAll orders by name then id and paginates', async () => {
      const { items, total } = await repository.findAll({ page: 1, limit: 2 });

      expect(names(items)).toEqual(['Ana', 'Bruno']);
      expect(total).toBe(3);
    });

    test('findAll returns second page', async () => {
      const { items } = await repository.findAll({ page: 2, limit: 2 });

      expect(names(items)).toEqual(['Clarice']);
    });

    test('findAll returns real total beyond last page', async () => {
      await expect(repository.findAll({ page: 99, limit: 10 })).resolves.toEqual({ items: [], total: 3 });
    });

    test('findAll filters by name case-insensitively', async () => {
      const { items, total } = await repository.findAll({ page: 1, limit: 10, name: 'ana' });

      expect(names(items)).toEqual(['Ana']);
      expect(total).toBe(1);
    });

    test('findAll treats % literally in name filter', async () => {
      const { total } = await repository.findAll({ page: 1, limit: 10, name: '%' });

      expect(total).toBe(0);
    });
  });

  test('update changes fields and bumps updatedAt', async () => {
    const created = await repository.create({ name: 'Ana', nationality: 'Brasileira' });
    await db.query("UPDATE authors SET updated_at = NOW() - INTERVAL '1 day' WHERE id = $1", [created.id]);
    const before = await repository.findById(created.id);

    const updated = await repository.update(created.id, { name: 'Ana Maria', nationality: 'Portuguesa' });

    expect(updated).toMatchObject({ id: created.id, name: 'Ana Maria', nationality: 'Portuguesa' });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(updated.createdAt).toEqual(created.createdAt);
  });

  test('update returns null when missing', async () => {
    await expect(repository.update(999, { name: 'X', nationality: 'Brasileira' })).resolves.toBeNull();
  });

  test('remove returns true then false', async () => {
    const created = await repository.create({ name: 'Ana', nationality: 'Brasileira' });

    await expect(repository.remove(created.id)).resolves.toBe(true);
    await expect(repository.remove(created.id)).resolves.toBe(false);
  });
});
