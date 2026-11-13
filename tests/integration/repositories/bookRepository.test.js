import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { createBookRepository } from '../../../src/repositories/bookRepository.js';
import { createAuthorRepository } from '../../../src/repositories/authorRepository.js';
import { createTestDb, resetDb } from '../../helpers/testDb.js';

let db;
let books;
let authors;
let machado;
let clarice;
let isbnCounter = 0;

function bookData(overrides = {}) {
  isbnCounter += 1;
  return {
    title: 'Dom Casmurro',
    isbn: String(9780000000000 + isbnCounter),
    publicationYear: 1899,
    genre: 'Romance',
    pageCount: 256,
    authorId: machado.id,
    ...overrides,
  };
}

beforeAll(async () => {
  db = await createTestDb();
  books = createBookRepository(db);
  authors = createAuthorRepository(db);
});

beforeEach(async () => {
  await resetDb(db);
  machado = await authors.create({ name: 'Machado de Assis', nationality: 'Brasileira' });
  clarice = await authors.create({ name: 'Clarice Lispector', nationality: 'Brasileira' });
});

afterAll(async () => {
  await db.close();
});

const titles = (items) => items.map((book) => book.title);

describe('bookRepository', () => {
  test('create returns book with embedded author and null coverPath', async () => {
    const data = bookData();

    const book = await books.create(data);

    expect(book).toEqual({
      id: 1,
      title: 'Dom Casmurro',
      isbn: data.isbn,
      publicationYear: 1899,
      genre: 'Romance',
      pageCount: 256,
      coverPath: null,
      author: { id: machado.id, name: 'Machado de Assis' },
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  test('findById returns null when missing', async () => {
    await expect(books.findById(999)).resolves.toBeNull();
  });

  test('findByIsbn finds normalized isbn', async () => {
    const created = await books.create(bookData({ isbn: '853590277X' }));

    await expect(books.findByIsbn('853590277X')).resolves.toEqual(created);
    await expect(books.findByIsbn('0000000000')).resolves.toBeNull();
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await books.create(bookData({ title: 'Quincas Borba', genre: 'Romance' }));
      await books.create(bookData({ title: 'A Hora da Estrela', genre: 'Novela', authorId: clarice.id }));
      await books.create(bookData({ title: 'Contos Fluminenses', genre: 'Contos' }));
    });

    test('findAll orders by title then id', async () => {
      const { items, total } = await books.findAll({ page: 1, limit: 10 });

      expect(titles(items)).toEqual(['A Hora da Estrela', 'Contos Fluminenses', 'Quincas Borba']);
      expect(total).toBe(3);
    });

    test('findAll paginates with real total', async () => {
      const { items, total } = await books.findAll({ page: 2, limit: 2 });

      expect(titles(items)).toEqual(['Quincas Borba']);
      expect(total).toBe(3);
    });

    test('findAll filters by title', async () => {
      const { items } = await books.findAll({ page: 1, limit: 10, title: 'hora' });

      expect(titles(items)).toEqual(['A Hora da Estrela']);
    });

    test('findAll filters by genre', async () => {
      const { items } = await books.findAll({ page: 1, limit: 10, genre: 'contos' });

      expect(titles(items)).toEqual(['Contos Fluminenses']);
    });

    test('findAll filters by authorId', async () => {
      const { items, total } = await books.findAll({ page: 1, limit: 10, authorId: machado.id });

      expect(titles(items)).toEqual(['Contos Fluminenses', 'Quincas Borba']);
      expect(total).toBe(2);
    });

    test('findAll combines filters', async () => {
      const { total } = await books.findAll({ page: 1, limit: 10, authorId: machado.id, genre: 'novela' });

      expect(total).toBe(0);
    });
  });

  test('findAll treats % and _ literally', async () => {
    await books.create(bookData({ title: '100% Jovem' }));
    await books.create(bookData({ title: '1000 Dias' }));
    await books.create(bookData({ title: 'A_B' }));

    expect(titles((await books.findAll({ page: 1, limit: 10, title: '100%' })).items)).toEqual(['100% Jovem']);
    expect(titles((await books.findAll({ page: 1, limit: 10, title: '_' })).items)).toEqual(['A_B']);
  });

  test('update changes fields, author and bumps updatedAt', async () => {
    const created = await books.create(bookData());
    await db.query("UPDATE books SET updated_at = NOW() - INTERVAL '1 day' WHERE id = $1", [created.id]);
    const before = await books.findById(created.id);

    const updated = await books.update(created.id, bookData({ title: 'Novo', authorId: clarice.id }));

    expect(updated).toMatchObject({ id: created.id, title: 'Novo', author: { id: clarice.id, name: 'Clarice Lispector' } });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  test('update returns null when missing', async () => {
    await expect(books.update(999, bookData())).resolves.toBeNull();
  });

  test('updateCoverPath stores path', async () => {
    const created = await books.create(bookData());

    const updated = await books.updateCoverPath(created.id, 'books/a.png');

    expect(updated.coverPath).toBe('books/a.png');
    await expect(books.updateCoverPath(999, 'books/b.png')).resolves.toBeNull();
  });

  test('findCoverPathsByAuthorId returns only non-null paths', async () => {
    const withCover = await books.create(bookData());
    await books.create(bookData());
    const otherAuthor = await books.create(bookData({ authorId: clarice.id }));
    await books.updateCoverPath(withCover.id, 'books/a.png');
    await books.updateCoverPath(otherAuthor.id, 'books/c.png');

    await expect(books.findCoverPathsByAuthorId(machado.id)).resolves.toEqual(['books/a.png']);
  });

  test('remove returns true then false', async () => {
    const created = await books.create(bookData());

    await expect(books.remove(created.id)).resolves.toBe(true);
    await expect(books.remove(created.id)).resolves.toBe(false);
  });
});
