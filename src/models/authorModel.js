import { z } from 'zod';
import { optionalTextFilter, paginationShape, trimmedText } from './commonSchemas.js';

export const authorBodySchema = z.object({
  name: trimmedText(1, 150),
  // DECISAO: nacionalidade obrigatória ou opcional — escolhido: obrigatória (2 a 100 caracteres); alternativas: opcional/nula
  nationality: trimmedText(2, 100),
});

export const authorListQuerySchema = z.object({
  ...paginationShape,
  name: optionalTextFilter,
});

export const authorBooksQuerySchema = z.object(paginationShape);

export function toAuthor(row) {
  return {
    id: row.id,
    name: row.name,
    nationality: row.nationality,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
