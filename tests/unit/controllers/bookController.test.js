import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createBookController } from '../../../src/controllers/bookController.js';
import { InvalidFileError } from '../../../src/errors/AppError.js';
import { createFakeResponse } from '../../helpers/fakeResponse.js';

const PUBLIC_URL = 'http://localhost:3000';
const book = { id: 7, title: 'Livro', coverPath: 'books/a.jpg', author: { id: 1, name: 'Ana' } };

let bookService;
let controller;
let res;

beforeEach(() => {
  bookService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateCover: jest.fn(),
    remove: jest.fn(),
  };
  controller = createBookController({ bookService, publicUrl: PUBLIC_URL });
  res = createFakeResponse();
});

describe('bookController', () => {
  test('book list responds paginated with presented books', async () => {
    bookService.list.mockResolvedValue({ items: [book], total: 1 });

    await controller.list({ validated: { query: { page: 1, limit: 10, title: 'liv' } } }, res);

    expect(bookService.list).toHaveBeenCalledWith({ page: 1, limit: 10, title: 'liv' });
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(res.body.data[0].coverUrl).toBe('http://localhost:3000/uploads/books/a.jpg');
  });

  test('book getById presents coverUrl and hides coverPath', async () => {
    bookService.getById.mockResolvedValue(book);

    await controller.getById({ validated: { params: { id: 7 } } }, res);

    expect(res.body.data.coverUrl).toBe('http://localhost:3000/uploads/books/a.jpg');
    expect(res.body.data).not.toHaveProperty('coverPath');
  });

  test('book create responds 201 with Location', async () => {
    bookService.create.mockResolvedValue(book);

    await controller.create({ validated: { body: { title: 'Livro' } } }, res);

    expect(res.statusCode).toBe(201);
    expect(res.headers.Location).toBe('/api/books/7');
  });

  test('book update responds 200', async () => {
    bookService.update.mockResolvedValue(book);

    await controller.update({ validated: { params: { id: 7 }, body: { title: 'Livro' } } }, res);

    expect(bookService.update).toHaveBeenCalledWith(7, { title: 'Livro' });
    expect(res.statusCode).toBe(200);
  });

  test('book remove responds 204', async () => {
    await controller.remove({ validated: { params: { id: 7 } } }, res);

    expect(bookService.remove).toHaveBeenCalledWith(7);
    expect(res.statusCode).toBe(204);
  });

  test('book uploadCover throws InvalidFileError without file', async () => {
    await expect(controller.uploadCover({ validated: { params: { id: 7 } } }, res)).rejects.toBeInstanceOf(
      InvalidFileError,
    );
    expect(bookService.updateCover).not.toHaveBeenCalled();
  });

  test('book uploadCover passes books/<filename> to service', async () => {
    bookService.updateCover.mockResolvedValue(book);
    const req = { validated: { params: { id: 7 } }, file: { filename: 'abc.png' } };

    await controller.uploadCover(req, res);

    expect(bookService.updateCover).toHaveBeenCalledWith(7, 'books/abc.png');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.coverUrl).toBe('http://localhost:3000/uploads/books/a.jpg');
  });
});
