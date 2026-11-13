import { toBook } from '../models/bookModel.js';
import { escapeLike, offsetOf } from './sqlUtils.js';

// Todo SELECT traz o nome do autor, para o livro sair com { author: { id, name } }.
const SELECT_BOOK = `
  SELECT b.*, a.name AS author_name
  FROM books b
  JOIN authors a ON a.id = b.author_id`;

function buildFilters({ title, genre, authorId }) {
  const conditions = [];
  const params = [];

  if (title) {
    params.push(`%${escapeLike(title)}%`);
    conditions.push(`b.title ILIKE $${params.length} ESCAPE '\\'`);
  }
  if (genre) {
    params.push(`%${escapeLike(genre)}%`);
    conditions.push(`b.genre ILIKE $${params.length} ESCAPE '\\'`);
  }
  if (authorId) {
    params.push(authorId);
    conditions.push(`b.author_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export function createBookRepository(db) {
  async function findById(id) {
    const { rows } = await db.query(`${SELECT_BOOK} WHERE b.id = $1`, [id]);
    return rows[0] ? toBook(rows[0]) : null;
  }

  return {
    async findAll({ page, limit, title, genre, authorId }) {
      const { where, params } = buildFilters({ title, genre, authorId });

      // O total vem de um COUNT separado, para continuar certo mesmo em páginas vazias.
      const countResult = await db.query(`SELECT COUNT(*) AS total FROM books b ${where}`, params);

      const pageParams = [...params, limit, offsetOf({ page, limit })];
      // DECISAO: ordem padrão das listagens — escolhido: alfabética com desempate por id; alternativas: id crescente, mais recente primeiro
      const { rows } = await db.query(
        `${SELECT_BOOK} ${where}
         ORDER BY b.title, b.id
         LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
        pageParams,
      );

      return { items: rows.map(toBook), total: Number(countResult.rows[0].total) };
    },

    findById,

    async findByIsbn(isbn) {
      const { rows } = await db.query(`${SELECT_BOOK} WHERE b.isbn = $1`, [isbn]);
      return rows[0] ? toBook(rows[0]) : null;
    },

    async create({ title, isbn, publicationYear, genre, pageCount, authorId }) {
      const { rows } = await db.query(
        `INSERT INTO books (title, isbn, publication_year, genre, page_count, author_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [title, isbn, publicationYear, genre, pageCount, authorId],
      );
      return findById(rows[0].id);
    },

    async update(id, { title, isbn, publicationYear, genre, pageCount, authorId }) {
      // DECISAO: como manter updated_at — escolhido: atualizar na própria query (updated_at = NOW()); alternativas: trigger no banco
      const { rowCount } = await db.query(
        `UPDATE books
         SET title = $1, isbn = $2, publication_year = $3, genre = $4, page_count = $5,
             author_id = $6, updated_at = NOW()
         WHERE id = $7`,
        [title, isbn, publicationYear, genre, pageCount, authorId, id],
      );
      return rowCount > 0 ? findById(id) : null;
    },

    async updateCoverPath(id, coverPath) {
      const { rowCount } = await db.query(
        'UPDATE books SET cover_path = $1, updated_at = NOW() WHERE id = $2',
        [coverPath, id],
      );
      return rowCount > 0 ? findById(id) : null;
    },

    async remove(id) {
      const { rowCount } = await db.query('DELETE FROM books WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async findCoverPathsByAuthorId(authorId) {
      const { rows } = await db.query(
        'SELECT cover_path FROM books WHERE author_id = $1 AND cover_path IS NOT NULL',
        [authorId],
      );
      return rows.map((row) => row.cover_path);
    },
  };
}
