import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { setupTestApp } from '../helpers/testApp.js';
import { resetDb } from '../helpers/testDb.js';
import { createAuthor, createBook, validBook } from '../helpers/factories.js';

let ctx;
let author;

beforeAll(async () => {
  ctx = await setupTestApp();
});

beforeEach(async () => {
  await resetDb(ctx.db);
  author = await createAuthor(ctx.app);
});

afterAll(async () => {
  await ctx.teardown();
});

const post = (body) => request(ctx.app).post('/api/books').send(body);
const fields = (response) => response.body.error.details.map((d) => d.field);

describe('POST /api/books', () => {
  test('POST /api/books → 201 with author embedded and coverUrl null', async () => {
    const body = validBook(author.id);

    const response = await post(body);

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/books/${response.body.data.id}`);
    expect(response.body.data).toEqual({
      id: expect.any(Number),
      title: body.title,
      isbn: body.isbn,
      publicationYear: body.publicationYear,
      genre: body.genre,
      pageCount: body.pageCount,
      coverUrl: null,
      author: { id: author.id, name: author.name },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test('POST normalizes ISBN with hyphens', async () => {
    const response = await post(validBook(author.id, { isbn: '978-85-359-1066-3' }));

    expect(response.status).toBe(201);
    expect(response.body.data.isbn).toBe('9788535910663');
  });

  test('POST with missing title → 400 details field title', async () => {
    const { title, ...body } = validBook(author.id);

    const response = await post(body);

    expect(response.status).toBe(400);
    expect(fields(response)).toEqual(['title']);
  });

  test.each([
    ['pageCount "256"', { pageCount: '256' }, 'pageCount'],
    ['publicationYear 1449', { publicationYear: 1449 }, 'publicationYear'],
    ['ISBN with 11 digits', { isbn: '97885359106' }, 'isbn'],
  ])('POST with %s → 400', async (label, override, field) => {
    const response = await post(validBook(author.id, override));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(fields(response)).toEqual([field]);
  });

  test('POST duplicated ISBN → 409 ISBN_ALREADY_EXISTS', async () => {
    const body = validBook(author.id);
    await post(body).expect(201);

    const response = await post({ ...body, title: 'Outro' });

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({ code: 'ISBN_ALREADY_EXISTS', message: 'ISBN já cadastrado' });
  });

  test('POST with authorId 999 → 422 AUTHOR_NOT_FOUND', async () => {
    const response = await post(validBook(999));

    expect(response.status).toBe(422);
    expect(response.body.error).toEqual({ code: 'AUTHOR_NOT_FOUND', message: 'Autor informado não existe' });
  });
});

describe('PUT /api/books/:id', () => {
  test('PUT keeping its own ISBN → 200', async () => {
    const book = await createBook(ctx.app, author.id);

    const response = await request(ctx.app)
      .put(`/api/books/${book.id}`)
      .send(validBook(author.id, { isbn: book.isbn, title: 'Novo título' }));

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Novo título');
  });

  test("PUT with another book's ISBN → 409", async () => {
    const first = await createBook(ctx.app, author.id);
    const second = await createBook(ctx.app, author.id);

    const response = await request(ctx.app)
      .put(`/api/books/${second.id}`)
      .send(validBook(author.id, { isbn: first.isbn }));

    expect(response.status).toBe(409);
  });

  test('PUT with authorId 999 → 422', async () => {
    const book = await createBook(ctx.app, author.id);

    const response = await request(ctx.app).put(`/api/books/${book.id}`).send(validBook(999));

    expect(response.status).toBe(422);
  });

  test('PUT missing book → 404', async () => {
    const response = await request(ctx.app).put('/api/books/999').send(validBook(author.id));

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({ code: 'NOT_FOUND', message: 'Livro não encontrado' });
  });
});

describe('GET /api/books', () => {
  test('GET /api/books/99999999999 → 400 VALIDATION_ERROR', async () => {
    const response = await request(ctx.app).get('/api/books/99999999999');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('GET /api/books?authorId=99999999999 → 400', async () => {
    await request(ctx.app).get('/api/books?authorId=99999999999').expect(400);
  });

  test('GET /api/books/:id → 200 and missing → 404', async () => {
    const book = await createBook(ctx.app, author.id);

    await request(ctx.app).get(`/api/books/${book.id}`).expect(200);
    await request(ctx.app).get('/api/books/999').expect(404);
  });

  describe('filters and pagination', () => {
    let clarice;

    beforeEach(async () => {
      clarice = await createAuthor(ctx.app, { name: 'Clarice Lispector' });
      await createBook(ctx.app, author.id, { title: 'Quincas Borba', genre: 'Romance' });
      await createBook(ctx.app, clarice.id, { title: 'A Hora da Estrela', genre: 'Novela' });
      await createBook(ctx.app, author.id, { title: 'Contos Fluminenses', genre: 'Contos' });
    });

    const titles = (response) => response.body.data.map((b) => b.title);

    test('GET /api/books filters by title', async () => {
      const response = await request(ctx.app).get('/api/books?title=HORA');

      expect(titles(response)).toEqual(['A Hora da Estrela']);
    });

    test('GET /api/books filters by genre', async () => {
      const response = await request(ctx.app).get('/api/books?genre=contos');

      expect(titles(response)).toEqual(['Contos Fluminenses']);
    });

    test('GET /api/books filters by authorId', async () => {
      const response = await request(ctx.app).get(`/api/books?authorId=${clarice.id}`);

      expect(titles(response)).toEqual(['A Hora da Estrela']);
      expect(response.body.data[0].author).toEqual({ id: clarice.id, name: 'Clarice Lispector' });
    });

    test('GET ?authorId=999 → 200 data [] total 0', async () => {
      const response = await request(ctx.app).get('/api/books?authorId=999');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    test('GET /api/books?page=99 → 200 data [] and real total', async () => {
      const response = await request(ctx.app).get('/api/books?page=99');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta).toEqual({ page: 99, limit: 10, total: 3, totalPages: 1 });
    });

    test('GET /api/books?page=2&limit=2 returns the rest', async () => {
      const response = await request(ctx.app).get('/api/books?page=2&limit=2');

      expect(titles(response)).toEqual(['Quincas Borba']);
      expect(response.body.meta.totalPages).toBe(2);
    });
  });

  test('GET /api/books?page=0 → 400', async () => {
    await request(ctx.app).get('/api/books?page=0').expect(400);
  });
});

describe('DELETE /api/books/:id', () => {
  test('DELETE /api/books/:id → 204, then GET → 404', async () => {
    const book = await createBook(ctx.app, author.id);

    await request(ctx.app).delete(`/api/books/${book.id}`).expect(204);
    await request(ctx.app).get(`/api/books/${book.id}`).expect(404);
  });

  test('DELETE missing → 404', async () => {
    await request(ctx.app).delete('/api/books/999').expect(404);
  });
});
