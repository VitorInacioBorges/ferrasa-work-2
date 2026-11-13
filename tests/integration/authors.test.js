import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { setupTestApp } from '../helpers/testApp.js';
import { resetDb } from '../helpers/testDb.js';
import { createAuthor, createBook, validAuthor } from '../helpers/factories.js';

let ctx;

beforeAll(async () => {
  ctx = await setupTestApp();
});

beforeEach(async () => {
  await resetDb(ctx.db);
});

afterAll(async () => {
  await ctx.teardown();
});

describe('POST /api/authors', () => {
  test('POST /api/authors → 201 with envelope and Location', async () => {
    const response = await request(ctx.app).post('/api/authors').send(validAuthor());

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe('/api/authors/1');
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 1,
        name: 'Machado de Assis',
        nationality: 'Brasileira',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
  });

  test('POST without body → 400 VALIDATION_ERROR with name and nationality in details', async () => {
    const response = await request(ctx.app).post('/api/authors');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['name', 'nationality']),
    );
  });

  test('POST with text/plain body → 400 VALIDATION_ERROR', async () => {
    const response = await request(ctx.app)
      .post('/api/authors')
      .set('Content-Type', 'text/plain')
      .send('name=Ana');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST with malformed JSON → 400 INVALID_JSON', async () => {
    const response = await request(ctx.app)
      .post('/api/authors')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'JSON malformado no corpo da requisição',
    });
  });
});

describe('GET /api/authors', () => {
  beforeEach(async () => {
    await createAuthor(ctx.app, { name: 'Machado de Assis' });
    await createAuthor(ctx.app, { name: 'Clarice Lispector' });
  });

  test('GET /api/authors → 200 paginated with meta', async () => {
    const response = await request(ctx.app).get('/api/authors?limit=1');

    expect(response.status).toBe(200);
    expect(response.body.data.map((a) => a.name)).toEqual(['Clarice Lispector']);
    expect(response.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  test('GET ?name=mach filters', async () => {
    const response = await request(ctx.app).get('/api/authors?name=mach');

    expect(response.body.data.map((a) => a.name)).toEqual(['Machado de Assis']);
    expect(response.body.meta.total).toBe(1);
  });

  test('GET /api/authors?limit=101 → 400', async () => {
    const response = await request(ctx.app).get('/api/authors?limit=101');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('limit');
  });
});

describe('GET /api/authors/:id', () => {
  test('GET /api/authors/:id → 200', async () => {
    const author = await createAuthor(ctx.app);

    const response = await request(ctx.app).get(`/api/authors/${author.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(author);
  });

  test('GET /api/authors/999 → 404 NOT_FOUND', async () => {
    const response = await request(ctx.app).get('/api/authors/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({ code: 'NOT_FOUND', message: 'Autor não encontrado' });
  });

  test('GET /api/authors/abc → 400 VALIDATION_ERROR', async () => {
    const response = await request(ctx.app).get('/api/authors/abc');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/authors/:id', () => {
  test('PUT /api/authors/:id → 200 updated', async () => {
    const author = await createAuthor(ctx.app);

    const response = await request(ctx.app)
      .put(`/api/authors/${author.id}`)
      .send({ name: 'Joaquim Maria', nationality: 'Brasileira' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Joaquim Maria');
  });

  test('PUT missing → 404', async () => {
    const response = await request(ctx.app).put('/api/authors/999').send(validAuthor());

    expect(response.status).toBe(404);
  });

  test('PUT with invalid body → 400', async () => {
    const author = await createAuthor(ctx.app);

    const response = await request(ctx.app).put(`/api/authors/${author.id}`).send({ name: '' });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/authors/:id', () => {
  test('DELETE /api/authors/:id → 204 with empty body', async () => {
    const author = await createAuthor(ctx.app);

    const response = await request(ctx.app).delete(`/api/authors/${author.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    await request(ctx.app).get(`/api/authors/${author.id}`).expect(404);
  });

  test('DELETE missing → 404', async () => {
    await request(ctx.app).delete('/api/authors/999').expect(404);
  });
});

describe('GET /api/authors/:id/books', () => {
  test('GET /api/authors/:id/books → 200 paginated', async () => {
    const author = await createAuthor(ctx.app);
    const other = await createAuthor(ctx.app, { name: 'Outro' });
    await createBook(ctx.app, author.id, { title: 'B' });
    await createBook(ctx.app, author.id, { title: 'A' });
    await createBook(ctx.app, other.id, { title: 'C' });

    const response = await request(ctx.app).get(`/api/authors/${author.id}/books`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((b) => b.title)).toEqual(['A', 'B']);
    expect(response.body.data[0]).toHaveProperty('coverUrl', null);
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
  });

  test('GET /api/authors/999/books → 404', async () => {
    const response = await request(ctx.app).get('/api/authors/999/books');

    expect(response.status).toBe(404);
  });
});

describe('app', () => {
  test('GET /api/unknown → 404 ROUTE_NOT_FOUND', async () => {
    const response = await request(ctx.app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada' },
    });
  });

  test('CORS header allows configured origin', async () => {
    const response = await request(ctx.app).get('/api/authors').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('CORS exposes the Location header to the browser', async () => {
    const response = await request(ctx.app)
      .post('/api/authors')
      .set('Origin', 'http://localhost:5173')
      .send(validAuthor());

    expect(response.headers['access-control-expose-headers']).toMatch(/Location/);
  });

  test('JSON body over the size limit → 413 PAYLOAD_TOO_LARGE', async () => {
    const response = await request(ctx.app)
      .post('/api/authors')
      .send({ name: 'a'.repeat(200 * 1024), nationality: 'Brasileira' });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  test('unsupported JSON charset → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const response = await request(ctx.app)
      .post('/api/authors')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"name":"Ana","nationality":"Brasileira"}');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  test('badly encoded path parameter → 400 BAD_REQUEST', async () => {
    const response = await request(ctx.app).get('/api/authors/%E0%A4%A');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  test('NUL byte in filter → 400 VALIDATION_ERROR', async () => {
    const response = await request(ctx.app).get('/api/authors?name=%00');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('empty filters from a form are ignored', async () => {
    await createAuthor(ctx.app);

    const response = await request(ctx.app).get('/api/books?title=&genre=&authorId=');

    expect(response.status).toBe(200);
  });
});
