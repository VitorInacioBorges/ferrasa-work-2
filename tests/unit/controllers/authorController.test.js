import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createAuthorController } from '../../../src/controllers/authorController.js';
import { createFakeResponse } from '../../helpers/fakeResponse.js';

const PUBLIC_URL = 'http://localhost:3000';
const author = { id: 5, name: 'Ana', nationality: 'Brasileira' };
const book = {
  id: 1,
  title: 'Livro',
  coverPath: 'books/a.jpg',
  author: { id: 5, name: 'Ana' },
};

let authorService;
let controller;
let res;

beforeEach(() => {
  authorService = {
    list: jest.fn(),
    getById: jest.fn(),
    listBooks: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  controller = createAuthorController({ authorService, publicUrl: PUBLIC_URL });
  res = createFakeResponse();
});

describe('authorController', () => {
  test('author list responds paginated with meta', async () => {
    authorService.list.mockResolvedValue({ items: [author], total: 42 });
    const req = { validated: { query: { page: 1, limit: 10 } } };

    await controller.list(req, res);

    expect(authorService.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [author],
      meta: { page: 1, limit: 10, total: 42, totalPages: 5 },
    });
  });

  test('author getById responds 200', async () => {
    authorService.getById.mockResolvedValue(author);

    await controller.getById({ validated: { params: { id: 5 } } }, res);

    expect(authorService.getById).toHaveBeenCalledWith(5);
    expect(res.body).toEqual({ success: true, data: author });
  });

  test('author create responds 201 with Location', async () => {
    authorService.create.mockResolvedValue(author);
    const body = { name: 'Ana', nationality: 'Brasileira' };

    await controller.create({ validated: { body } }, res);

    expect(authorService.create).toHaveBeenCalledWith(body);
    expect(res.statusCode).toBe(201);
    expect(res.headers.Location).toBe('/api/authors/5');
  });

  test('author update responds 200', async () => {
    authorService.update.mockResolvedValue(author);
    const body = { name: 'Ana', nationality: 'Brasileira' };

    await controller.update({ validated: { params: { id: 5 }, body } }, res);

    expect(authorService.update).toHaveBeenCalledWith(5, body);
    expect(res.statusCode).toBe(200);
  });

  test('author remove responds 204', async () => {
    await controller.remove({ validated: { params: { id: 5 } } }, res);

    expect(authorService.remove).toHaveBeenCalledWith(5);
    expect(res.statusCode).toBe(204);
  });

  test('author listBooks presents books with coverUrl', async () => {
    authorService.listBooks.mockResolvedValue({ items: [book], total: 1 });
    const req = { validated: { params: { id: 5 }, query: { page: 1, limit: 10 } } };

    await controller.listBooks(req, res);

    expect(authorService.listBooks).toHaveBeenCalledWith(5, { page: 1, limit: 10 });
    expect(res.body.data[0].coverUrl).toBe('http://localhost:3000/uploads/books/a.jpg');
    expect(res.body.data[0]).not.toHaveProperty('coverPath');
    expect(res.body.meta.total).toBe(1);
  });
});
