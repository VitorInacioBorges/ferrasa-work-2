import { ConflictError, NotFoundError, UnprocessableEntityError } from '../errors/AppError.js';

export function createBookService({ bookRepository, authorRepository, fileStorage }) {
  async function getById(id) {
    const book = await bookRepository.findById(id);
    if (!book) throw new NotFoundError('Livro não encontrado');
    return book;
  }

  async function ensureAuthorExists(authorId) {
    const author = await authorRepository.findById(authorId);
    if (!author) throw new UnprocessableEntityError();
  }

  // O ISBN só conflita quando pertence a OUTRO livro (no PUT o livro pode manter o seu).
  async function ensureIsbnAvailable(isbn, currentBookId = null) {
    const existing = await bookRepository.findByIsbn(isbn);
    if (existing && existing.id !== currentBookId) throw new ConflictError();
  }

  return {
    list(query) {
      return bookRepository.findAll(query);
    },

    getById,

    async create(data) {
      await ensureAuthorExists(data.authorId);
      await ensureIsbnAvailable(data.isbn);
      return bookRepository.create(data);
    },

    async update(id, data) {
      await getById(id);
      await ensureAuthorExists(data.authorId);
      await ensureIsbnAvailable(data.isbn, id);
      return bookRepository.update(id, data);
    },

    async updateCover(id, coverPath) {
      const book = await bookRepository.findById(id);
      if (!book) {
        // O multer já gravou o arquivo: sem livro, ele não pode ficar órfão no disco.
        await fileStorage.remove(coverPath);
        throw new NotFoundError('Livro não encontrado');
      }

      const updated = await bookRepository.updateCoverPath(id, coverPath);
      if (book.coverPath) await fileStorage.remove(book.coverPath);
      return updated;
    },

    async remove(id) {
      const book = await getById(id);
      await bookRepository.remove(id);
      await fileStorage.remove(book.coverPath);
    },
  };
}
