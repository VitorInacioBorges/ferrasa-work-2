import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createAuthorService } from '../../../src/services/authorService.js';
import { NotFoundError } from '../../../src/errors/AppError.js';

const author = { id: 3, name: 'Ana', nationality: 'Brasileira' };

let authorRepository;
let bookRepository;
let fileStorage;
let service;

beforeEach(() => {
  authorRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  bookRepository = {
    findAll: jest.fn(),
    findCoverPathsByAuthorId: jest.fn(),
  };
  fileStorage = { remove: jest.fn() };
  service = createAuthorService({ authorRepository, bookRepository, fileStorage });
});

describe('authorService', () => {
  test('list delegates to repository', async () => {
    authorRepository.findAll.mockResolvedValue({ items: [author], total: 1 });

    await expect(service.list({ page: 1, limit: 10 })).resolves.toEqual({ items: [author], total: 1 });
    expect(authorRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  test('getById returns the author', async () => {
    authorRepository.findById.mockResolvedValue(author);

    await expect(service.getById(3)).resolves.toEqual(author);
  });

  test('getById throws NotFoundError when missing', async () => {
    authorRepository.findById.mockResolvedValue(null);

    await expect(service.getById(3)).rejects.toThrow(new NotFoundError('Autor não encontrado'));
  });

  test('listBooks throws 404 when author missing and does not query books', async () => {
    authorRepository.findById.mockResolvedValue(null);

    await expect(service.listBooks(3, { page: 1, limit: 10 })).rejects.toBeInstanceOf(NotFoundError);
    expect(bookRepository.findAll).not.toHaveBeenCalled();
  });

  test('listBooks delegates with authorId', async () => {
    authorRepository.findById.mockResolvedValue(author);
    bookRepository.findAll.mockResolvedValue({ items: [], total: 0 });

    await service.listBooks(3, { page: 2, limit: 5 });

    expect(bookRepository.findAll).toHaveBeenCalledWith({ page: 2, limit: 5, authorId: 3 });
  });

  test('create returns created author', async () => {
    authorRepository.create.mockResolvedValue(author);

    await expect(service.create({ name: 'Ana', nationality: 'Brasileira' })).resolves.toEqual(author);
  });

  test('update throws 404 when repository returns null', async () => {
    authorRepository.update.mockResolvedValue(null);

    await expect(service.update(3, { name: 'Ana', nationality: 'Brasileira' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test('remove deletes author then removes each cover', async () => {
    authorRepository.findById.mockResolvedValue(author);
    bookRepository.findCoverPathsByAuthorId.mockResolvedValue(['books/a.jpg', 'books/b.png']);
    authorRepository.remove.mockResolvedValue(true);

    await service.remove(3);

    expect(authorRepository.remove).toHaveBeenCalledWith(3);
    expect(fileStorage.remove).toHaveBeenCalledTimes(2);
    expect(fileStorage.remove).toHaveBeenCalledWith('books/a.jpg');
    expect(fileStorage.remove).toHaveBeenCalledWith('books/b.png');
    const removeOrder = authorRepository.remove.mock.invocationCallOrder[0];
    expect(fileStorage.remove.mock.invocationCallOrder.every((order) => order > removeOrder)).toBe(true);
  });

  test('remove throws 404 and removes nothing when author missing', async () => {
    authorRepository.findById.mockResolvedValue(null);

    await expect(service.remove(3)).rejects.toBeInstanceOf(NotFoundError);
    expect(authorRepository.remove).not.toHaveBeenCalled();
    expect(fileStorage.remove).not.toHaveBeenCalled();
  });
});
