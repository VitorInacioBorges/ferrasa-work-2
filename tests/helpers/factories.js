import request from 'supertest';

let isbnCounter = 0;

export function validAuthor(overrides = {}) {
  return { name: 'Machado de Assis', nationality: 'Brasileira', ...overrides };
}

// Cada chamada gera um ISBN-13 diferente, para não esbarrar no UNIQUE.
export function validBook(authorId, overrides = {}) {
  isbnCounter += 1;
  return {
    title: 'Dom Casmurro',
    isbn: String(9781000000000 + isbnCounter),
    publicationYear: 1899,
    genre: 'Romance',
    pageCount: 256,
    authorId,
    ...overrides,
  };
}

export async function createAuthor(app, overrides = {}) {
  const response = await request(app).post('/api/authors').send(validAuthor(overrides)).expect(201);
  return response.body.data;
}

export async function createBook(app, authorId, overrides = {}) {
  const response = await request(app).post('/api/books').send(validBook(authorId, overrides)).expect(201);
  return response.body.data;
}

// PNG 1x1 transparente.
export const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
