import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { setupTestApp } from '../helpers/testApp.js';
import { resetDb } from '../helpers/testDb.js';
import { createAuthor, createBook, pngBuffer } from '../helpers/factories.js';

let ctx;
let author;
let book;

beforeAll(async () => {
  ctx = await setupTestApp();
});

beforeEach(async () => {
  await resetDb(ctx.db);
  await fs.rm(path.join(ctx.uploadDir, 'books'), { recursive: true, force: true });
  await fs.mkdir(path.join(ctx.uploadDir, 'books'), { recursive: true });
  author = await createAuthor(ctx.app);
  book = await createBook(ctx.app, author.id);
});

afterAll(async () => {
  await ctx.teardown();
});

const filesInUploads = () => fs.readdir(path.join(ctx.uploadDir, 'books'));

function uploadCover(bookId, buffer = pngBuffer, { field = 'cover', filename = 'cover.png', contentType = 'image/png' } = {}) {
  return request(ctx.app).post(`/api/books/${bookId}/cover`).attach(field, buffer, { filename, contentType });
}

// Converte a coverUrl absoluta no caminho servido pelo app (/uploads/...).
const pathOf = (coverUrl) => new URL(coverUrl).pathname;

describe('POST /api/books/:id/cover', () => {
  test('POST /api/books/:id/cover with png → 200 and coverUrl absolute', async () => {
    const response = await uploadCover(book.id);

    expect(response.status).toBe(200);
    const { coverUrl } = response.body.data;
    expect(coverUrl.startsWith(`${ctx.config.PUBLIC_URL}/uploads/books/`)).toBe(true);
    expect(coverUrl.endsWith('.png')).toBe(true);
    expect(await filesInUploads()).toHaveLength(1);

    const image = await request(ctx.app).get(pathOf(coverUrl));
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/png');
  });

  test('replacing cover deletes previous file', async () => {
    const first = await uploadCover(book.id);
    const firstFile = path.basename(first.body.data.coverUrl);

    const second = await uploadCover(book.id);

    expect(second.status).toBe(200);
    const files = await filesInUploads();
    expect(files).toEqual([path.basename(second.body.data.coverUrl)]);
    expect(files).not.toContain(firstFile);
  });

  test('upload to missing book → 404 and no file left in uploadDir/books', async () => {
    const response = await uploadCover(999);

    expect(response.status).toBe(404);
    expect(await filesInUploads()).toEqual([]);
  });

  test('upload with invalid id → 400 and no file saved', async () => {
    const response = await uploadCover('abc');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await filesInUploads()).toEqual([]);
  });

  test('upload text file → 400 INVALID_FILE', async () => {
    const response = await uploadCover(book.id, Buffer.from('hello'), {
      filename: 'notes.txt',
      contentType: 'text/plain',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE');
    expect(await filesInUploads()).toEqual([]);
  });

  test('upload without file → 400 INVALID_FILE', async () => {
    const response = await request(ctx.app).post(`/api/books/${book.id}/cover`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE');
  });

  test('upload with wrong field name "image" → 400 INVALID_FILE', async () => {
    const response = await uploadCover(book.id, pngBuffer, { field: 'image' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE');
  });

  test('truncated multipart body → 400 INVALID_FILE', async () => {
    const response = await request(ctx.app)
      .post(`/api/books/${book.id}/cover`)
      .set('Content-Type', 'multipart/form-data; boundary=xyz')
      .send('--xyz\r\nContent-Disposition: form-data; name="cover"; filename="a.png"\r\nContent-Type: image/png\r\n\r\nabc');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE');
    expect(await filesInUploads()).toEqual([]);
  });

  test('multipart without boundary → 400 INVALID_FILE', async () => {
    const response = await request(ctx.app)
      .post(`/api/books/${book.id}/cover`)
      .set('Content-Type', 'multipart/form-data')
      .send('abc');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE');
  });

  test('upload larger than MAX_UPLOAD_SIZE_MB → 413 FILE_TOO_LARGE', async () => {
    const tooLarge = Buffer.alloc(ctx.config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 1);

    const response = await uploadCover(book.id, tooLarge);

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    expect(await filesInUploads()).toEqual([]);
  });
});

describe('cover cleanup on delete', () => {
  test('DELETE book removes its cover file', async () => {
    await uploadCover(book.id).expect(200);

    await request(ctx.app).delete(`/api/books/${book.id}`).expect(204);

    expect(await filesInUploads()).toEqual([]);
  });

  test('DELETE author removes its books and their cover files', async () => {
    const second = await createBook(ctx.app, author.id);
    await uploadCover(book.id).expect(200);
    const otherAuthor = await createAuthor(ctx.app, { name: 'Outro' });
    const otherBook = await createBook(ctx.app, otherAuthor.id);
    const otherCover = await uploadCover(otherBook.id);

    await request(ctx.app).delete(`/api/authors/${author.id}`).expect(204);

    const books = await request(ctx.app).get(`/api/books?authorId=${author.id}`);
    expect(books.body.meta.total).toBe(0);
    await request(ctx.app).get(`/api/books/${second.id}`).expect(404);
    expect(await filesInUploads()).toEqual([path.basename(otherCover.body.data.coverUrl)]);
  });
});
