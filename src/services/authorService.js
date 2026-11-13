import { NotFoundError } from '../errors/AppError.js';

// DECISAO: como trocar dependências nos testes — escolhido: injeção por fábrica (a função recebe repositories e fileStorage); alternativas: jest.unstable_mockModule
export function createAuthorService({ authorRepository, bookRepository, fileStorage }) {
  async function getById(id) {
    const author = await authorRepository.findById(id);
    if (!author) throw new NotFoundError('Autor não encontrado');
    return author;
  }

  return {
    list(query) {
      return authorRepository.findAll(query);
    },

    getById,

    async listBooks(id, { page, limit }) {
      await getById(id);
      return bookRepository.findAll({ page, limit, authorId: id });
    },

    create(data) {
      return authorRepository.create(data);
    },

    async update(id, data) {
      const author = await authorRepository.update(id, data);
      if (!author) throw new NotFoundError('Autor não encontrado');
      return author;
    },

    // Os livros saem do banco em cascata (ON DELETE CASCADE); as capas precisam sair do disco aqui.
    async remove(id) {
      await getById(id);
      const coverPaths = await bookRepository.findCoverPathsByAuthorId(id);
      await authorRepository.remove(id);
      await Promise.all(coverPaths.map((coverPath) => fileStorage.remove(coverPath)));
    },
  };
}
