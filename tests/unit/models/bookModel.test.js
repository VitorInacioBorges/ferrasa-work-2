import { describe, expect, test } from '@jest/globals';
import {
  bookBodySchema,
  bookListQuerySchema,
  normalizeIsbn,
  presentBook,
  toBook,
} from '../../../src/models/bookModel.js';
import { idParamsSchema } from '../../../src/models/commonSchemas.js';

const validBook = {
  title: 'Dom Casmurro',
  isbn: '9788535910663',
  publicationYear: 1899,
  genre: 'Romance',
  pageCount: 256,
  authorId: 1,
};

const parse = (overrides) => bookBodySchema.safeParse({ ...validBook, ...overrides });

describe('normalizeIsbn', () => {
  test('normalizes ISBN with hyphens', () => {
    expect(normalizeIsbn('978-85-359-1066-3')).toBe('9788535910663');
  });

  test('normalizes ISBN-10 with lowercase x and spaces', () => {
    expect(normalizeIsbn('85-359 0277-x')).toBe('853590277X');
  });
});

describe('bookBodySchema', () => {
  test('accepts a valid book and stores normalized ISBN', () => {
    const result = parse({ isbn: '978-85-359-1066-3', title: '  Dom Casmurro  ' });

    expect(result.success).toBe(true);
    expect(result.data.isbn).toBe('9788535910663');
    expect(result.data.title).toBe('Dom Casmurro');
  });

  test('accepts ISBN-10 ending in X', () => {
    expect(parse({ isbn: '85-359-0277-X' }).success).toBe(true);
  });

  test('rejects ISBN with 11 digits', () => {
    const result = parse({ isbn: '97885359106' });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      'ISBN deve ter 10 ou 13 caracteres (dígitos, e X no final do ISBN-10)',
    );
  });

  test('rejects letters in the middle of the ISBN', () => {
    expect(parse({ isbn: '978853A910663' }).success).toBe(false);
  });

  test('rejects publicationYear 1449 and next year', () => {
    expect(parse({ publicationYear: 1449 }).success).toBe(false);
    expect(parse({ publicationYear: new Date().getFullYear() + 1 }).success).toBe(false);
  });

  test('accepts the current year and 1450', () => {
    expect(parse({ publicationYear: new Date().getFullYear() }).success).toBe(true);
    expect(parse({ publicationYear: 1450 }).success).toBe(true);
  });

  test.each([[0], [10001], [256.5], ['256']])('rejects pageCount %p', (pageCount) => {
    expect(parse({ pageCount }).success).toBe(false);
  });

  test('rejects authorId as string "1"', () => {
    expect(parse({ authorId: '1' }).success).toBe(false);
  });

  test('rejects authorId 2147483648', () => {
    expect(parse({ authorId: 2147483648 }).success).toBe(false);
  });

  test('rejects NUL byte in title', () => {
    const result = parse({ title: 'Dom\u0000Casmurro' });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Texto contém caracteres inválidos');
  });

  test('rejects missing genre', () => {
    const { genre, ...withoutGenre } = validBook;

    expect(bookBodySchema.safeParse(withoutGenre).success).toBe(false);
  });
});

describe('bookListQuerySchema', () => {
  test('coerces authorId and keeps text filters', () => {
    expect(bookListQuerySchema.parse({ authorId: '3', title: 'dom', genre: 'rom' })).toEqual({
      page: 1,
      limit: 10,
      authorId: 3,
      title: 'dom',
      genre: 'rom',
    });
  });

  test('treats empty authorId as absent', () => {
    expect(bookListQuerySchema.parse({ title: '', genre: '', authorId: '' })).toEqual({ page: 1, limit: 10 });
  });

  test('rejects NUL byte in text filter', () => {
    expect(bookListQuerySchema.safeParse({ title: 'a\u0000b' }).success).toBe(false);
  });

  test('rejects authorId above INTEGER range', () => {
    expect(bookListQuerySchema.safeParse({ authorId: '99999999999' }).success).toBe(false);
  });
});

describe('idParamsSchema', () => {
  test('coerces numeric id', () => {
    expect(idParamsSchema.parse({ id: '7' })).toEqual({ id: 7 });
  });

  test.each([['99999999999'], ['abc'], ['0'], ['-1']])('rejects %p', (id) => {
    expect(idParamsSchema.safeParse({ id }).success).toBe(false);
  });
});

describe('toBook and presentBook', () => {
  const createdAt = new Date('2026-11-12T12:00:00Z');
  const row = {
    id: 7,
    title: 'Dom Casmurro',
    isbn: '9788535910663',
    publication_year: 1899,
    genre: 'Romance',
    page_count: 256,
    cover_path: 'books/a.jpg',
    author_id: 1,
    author_name: 'Machado de Assis',
    created_at: createdAt,
    updated_at: createdAt,
  };

  test('toBook maps row with embedded author', () => {
    expect(toBook(row)).toEqual({
      id: 7,
      title: 'Dom Casmurro',
      isbn: '9788535910663',
      publicationYear: 1899,
      genre: 'Romance',
      pageCount: 256,
      coverPath: 'books/a.jpg',
      author: { id: 1, name: 'Machado de Assis' },
      createdAt,
      updatedAt: createdAt,
    });
  });

  test('presentBook builds absolute coverUrl', () => {
    const presented = presentBook(toBook(row), 'http://localhost:3000');

    expect(presented.coverUrl).toBe('http://localhost:3000/uploads/books/a.jpg');
    expect(presented).not.toHaveProperty('coverPath');
  });

  test('presentBook returns null coverUrl without cover', () => {
    const presented = presentBook(toBook({ ...row, cover_path: null }), 'http://localhost:3000');

    expect(presented.coverUrl).toBeNull();
  });
});
