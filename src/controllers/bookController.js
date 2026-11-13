import { buildMeta, created, noContent, ok, paginated } from '../utils/httpResponse.js';
import { presentBook } from '../models/bookModel.js';
import { InvalidFileError } from '../errors/AppError.js';

export function createBookController({ bookService, publicUrl }) {
  const present = (book) => presentBook(book, publicUrl);

  return {
    async list(req, res) {
      const { query } = req.validated;
      const { items, total } = await bookService.list(query);
      return paginated(res, items.map(present), buildMeta({ page: query.page, limit: query.limit, total }));
    },

    async getById(req, res) {
      return ok(res, present(await bookService.getById(req.validated.params.id)));
    },

    async create(req, res) {
      const book = await bookService.create(req.validated.body);
      return created(res, present(book), `/api/books/${book.id}`);
    },

    async update(req, res) {
      const { params, body } = req.validated;
      return ok(res, present(await bookService.update(params.id, body)));
    },

    async remove(req, res) {
      await bookService.remove(req.validated.params.id);
      return noContent(res);
    },

    async uploadCover(req, res) {
      if (!req.file) throw new InvalidFileError();
      const book = await bookService.updateCover(req.validated.params.id, `books/${req.file.filename}`);
      return ok(res, present(book));
    },
  };
}
