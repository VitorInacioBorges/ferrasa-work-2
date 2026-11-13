import { buildMeta, created, noContent, ok, paginated } from '../utils/httpResponse.js';
import { presentBook } from '../models/bookModel.js';

// Controllers só traduzem HTTP: leem req.validated, chamam o service e respondem pelo helper.
// Erros sobem sozinhos para o errorHandler (Express 5 repassa rejeições de handlers async).
export function createAuthorController({ authorService, publicUrl }) {
  return {
    async list(req, res) {
      const { query } = req.validated;
      const { items, total } = await authorService.list(query);
      return paginated(res, items, buildMeta({ page: query.page, limit: query.limit, total }));
    },

    async getById(req, res) {
      return ok(res, await authorService.getById(req.validated.params.id));
    },

    async listBooks(req, res) {
      const { params, query } = req.validated;
      const { page, limit } = query;
      const { items, total } = await authorService.listBooks(params.id, { page, limit });
      const books = items.map((book) => presentBook(book, publicUrl));
      return paginated(res, books, buildMeta({ page, limit, total }));
    },

    async create(req, res) {
      const author = await authorService.create(req.validated.body);
      return created(res, author, `/api/authors/${author.id}`);
    },

    async update(req, res) {
      const { params, body } = req.validated;
      return ok(res, await authorService.update(params.id, body));
    },

    async remove(req, res) {
      await authorService.remove(req.validated.params.id);
      return noContent(res);
    },
  };
}
