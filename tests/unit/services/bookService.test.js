import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createBookService } from '../../../src/services/bookService.js';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../../../src/errors/AppError.js';

const data = {
  title: 'Dom Casmurro',
  isbn: '9788535910663',
  publicationYear: 1899,
  genre: 'Romance',
  pageCount: 256,
  authorId: 1,
};
const book = { id: 1, ...data, coverPath: null, author: { id: 1, name: 'Machado' } };
const author = { id: 1, name: 'Machado', nationality: 'Brasileira' };

let bookRepository;
let authorRepository;
let fileStorage;
let service;

beforeEach(() => {
  bookRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIsbn: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    updateCoverPath: jest.fn(),
    remove: jest.fn(),
  };
  authorRepository = { findById: jest.fn().mockResolvedValue(author) };
  fileStorage = { remove: jest.fn() };
  service = createBookService({ bookRepository, authorRepository, fileStorage });
});

describe('bookService.create', () => {
  test('create throws 422 when author does not exist', async () => {
    authorRepository.findById.mockResolvedValue(null);

    await expect(service.create(data)).rejects.toBeInstanceOf(UnprocessableEntityError);
    expect(bookRepository.findByIsbn).not.toHaveBeenCalled();
    expect(bookRepository.create).not.toHaveBeenCalled();
  });

  test('create throws 409 when ISBN exists', async () => {
    bookRepository.findByIsbn.mockResolvedValue({ ...book, id: 9 });

    await expect(service.create(data)).rejects.toBeInstanceOf(ConflictError);
    expect(bookRepository.create).not.toHaveBeenCalled();
  });

  test('create returns created book', async () => {
    bookRepository.create.mockResolvedValue(book);

    await expect(service.create(data)).resolves.toEqual(book);
    expect(bookRepository.create).toHaveBeenCalledWith(data);
  });
});

describe('bookService.getById and list', () => {
  test('getById throws 404 with book message', async () => {
    bookRepository.findById.mockResolvedValue(null);

    await expect(service.getById(1)).rejects.toThrow(new NotFoundError('Livro não encontrado'));
  });

  test('list delegates to repository', async () => {
    bookRepository.findAll.mockResolvedValue({ items: [book], total: 1 });

    await expect(service.list({ page: 1, limit: 10 })).resolves.toEqual({ items: [book], total: 1 });
  });
});

describe('bookService.update', () => {
  test('update throws 404 before checking author', async () => {
    bookRepository.findById.mockResolvedValue(null);

    await expect(service.update(1, data)).rejects.toBeInstanceOf(NotFoundError);
    expect(authorRepository.findById).not.toHaveBeenCalled();
  });

  test('update throws 422 when author does not exist', async () => {
    bookRepository.findById.mockResolvedValue(book);
    authorRepository.findById.mockResolvedValue(null);

    await expect(service.update(1, data)).rejects.toBeInstanceOf(UnprocessableEntityError);
  });

  test('update allows keeping its own ISBN', async () => {
    bookRepository.findById.mockResolvedValue(book);
    bookRepository.findByIsbn.mockResolvedValue(book);
    bookRepository.update.mockResolvedValue({ ...book, title: 'Novo' });

    await expect(service.update(1, { ...data, title: 'Novo' })).resolves.toMatchObject({ title: 'Novo' });
    expect(bookRepository.update).toHaveBeenCalledWith(1, { ...data, title: 'Novo' });
  });

  test('update throws 409 when ISBN belongs to another book', async () => {
    bookRepository.findById.mockResolvedValue(book);
    bookRepository.findByIsbn.mockResolvedValue({ ...book, id: 2 });

    await expect(service.update(1, data)).rejects.toBeInstanceOf(ConflictError);
    expect(bookRepository.update).not.toHaveBeenCalled();
  });
});

describe('bookService.updateCover', () => {
  test('updateCover removes uploaded file and throws 404 when book missing', async () => {
    bookRepository.findById.mockResolvedValue(null);

    await expect(service.updateCover(1, 'books/new.jpg')).rejects.toBeInstanceOf(NotFoundError);
    expect(fileStorage.remove).toHaveBeenCalledWith('books/new.jpg');
    expect(bookRepository.updateCoverPath).not.toHaveBeenCalled();
  });

  test('updateCover removes previous cover after saving', async () => {
    bookRepository.findById.mockResolvedValue({ ...book, coverPath: 'books/old.jpg' });
    bookRepository.updateCoverPath.mockResolvedValue({ ...book, coverPath: 'books/new.jpg' });

    const result = await service.updateCover(1, 'books/new.jpg');

    expect(result.coverPath).toBe('books/new.jpg');
    expect(bookRepository.updateCoverPath).toHaveBeenCalledWith(1, 'books/new.jpg');
    expect(fileStorage.remove).toHaveBeenCalledWith('books/old.jpg');
    expect(fileStorage.remove.mock.invocationCallOrder[0]).toBeGreaterThan(
      bookRepository.updateCoverPath.mock.invocationCallOrder[0],
    );
  });

  test('updateCover does not remove anything when there was no previous cover', async () => {
    bookRepository.findById.mockResolvedValue(book);
    bookRepository.updateCoverPath.mockResolvedValue({ ...book, coverPath: 'books/new.jpg' });

    await service.updateCover(1, 'books/new.jpg');

    expect(fileStorage.remove).not.toHaveBeenCalled();
  });
});

describe('bookService.remove', () => {
  test('remove deletes book and its cover', async () => {
    bookRepository.findById.mockResolvedValue({ ...book, coverPath: 'books/a.jpg' });
    bookRepository.remove.mockResolvedValue(true);

    await service.remove(1);

    expect(bookRepository.remove).toHaveBeenCalledWith(1);
    expect(fileStorage.remove).toHaveBeenCalledWith('books/a.jpg');
  });

  test('remove throws 404 when missing', async () => {
    bookRepository.findById.mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundError);
    expect(bookRepository.remove).not.toHaveBeenCalled();
  });
});
