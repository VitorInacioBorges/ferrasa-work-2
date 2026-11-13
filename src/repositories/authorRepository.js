import { toAuthor } from '../models/authorModel.js';
import { escapeLike, offsetOf } from './sqlUtils.js';

// Só SQL parametrizado. Nenhuma regra de negócio aqui.
export function createAuthorRepository(db) {
  return {
    async findAll({ page, limit, name }) {
      const params = [];
      let where = '';
      if (name) {
        params.push(`%${escapeLike(name)}%`);
        where = `WHERE name ILIKE $${params.length} ESCAPE '\\'`;
      }

      // O total vem de um COUNT separado, para continuar certo mesmo em páginas vazias.
      const countResult = await db.query(`SELECT COUNT(*) AS total FROM authors ${where}`, params);

      const pageParams = [...params, limit, offsetOf({ page, limit })];
      // DECISAO: ordem padrão das listagens — escolhido: alfabética com desempate por id; alternativas: id crescente, mais recente primeiro
      const { rows } = await db.query(
        `SELECT * FROM authors ${where}
         ORDER BY name, id
         LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
        pageParams,
      );

      return { items: rows.map(toAuthor), total: Number(countResult.rows[0].total) };
    },

    async findById(id) {
      const { rows } = await db.query('SELECT * FROM authors WHERE id = $1', [id]);
      return rows[0] ? toAuthor(rows[0]) : null;
    },

    async create({ name, nationality }) {
      const { rows } = await db.query(
        'INSERT INTO authors (name, nationality) VALUES ($1, $2) RETURNING *',
        [name, nationality],
      );
      return toAuthor(rows[0]);
    },

    async update(id, { name, nationality }) {
      // DECISAO: como manter updated_at — escolhido: atualizar na própria query (updated_at = NOW()); alternativas: trigger no banco
      const { rows } = await db.query(
        `UPDATE authors SET name = $1, nationality = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [name, nationality, id],
      );
      return rows[0] ? toAuthor(rows[0]) : null;
    },

    async remove(id) {
      const { rowCount } = await db.query('DELETE FROM authors WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
