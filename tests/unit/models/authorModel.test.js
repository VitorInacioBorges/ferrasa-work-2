import { describe, expect, test } from '@jest/globals';
import { authorBodySchema, authorListQuerySchema, toAuthor } from '../../../src/models/authorModel.js';

describe('authorBodySchema', () => {
  test('accepts valid author and trims', () => {
    const result = authorBodySchema.parse({ name: '  Machado ', nationality: 'Brasileira' });

    expect(result).toEqual({ name: 'Machado', nationality: 'Brasileira' });
  });

  test('drops unknown fields', () => {
    const result = authorBodySchema.parse({ name: 'Ana', nationality: 'Brasileira', id: 9 });

    expect(result).not.toHaveProperty('id');
  });

  test('rejects whitespace-only name', () => {
    expect(authorBodySchema.safeParse({ name: '   ', nationality: 'Brasileira' }).success).toBe(false);
  });

  test('rejects nationality shorter than 2', () => {
    expect(authorBodySchema.safeParse({ name: 'Ana', nationality: 'B' }).success).toBe(false);
  });

  test('rejects name longer than 150', () => {
    expect(authorBodySchema.safeParse({ name: 'a'.repeat(151), nationality: 'Brasileira' }).success).toBe(false);
  });
});

describe('authorListQuerySchema', () => {
  test('applies defaults', () => {
    expect(authorListQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
  });

  test('coerces numeric strings and keeps name filter', () => {
    expect(authorListQuerySchema.parse({ page: '2', limit: '5', name: 'ana' })).toEqual({
      page: 2,
      limit: 5,
      name: 'ana',
    });
  });

  test.each([[{ limit: '101' }], [{ limit: '0' }], [{ page: '0' }], [{ page: 'abc' }], [{ page: '1.5' }]])(
    'rejects invalid pagination %p',
    (query) => {
      expect(authorListQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe('toAuthor', () => {
  test('maps snake_case row', () => {
    const createdAt = new Date('2026-11-12T12:00:00Z');
    const updatedAt = new Date('2026-11-12T13:00:00Z');

    expect(
      toAuthor({ id: 1, name: 'Ana', nationality: 'Brasileira', created_at: createdAt, updated_at: updatedAt }),
    ).toEqual({ id: 1, name: 'Ana', nationality: 'Brasileira', createdAt, updatedAt });
  });
});
