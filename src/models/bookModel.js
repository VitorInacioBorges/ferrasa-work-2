import { z } from 'zod';
import {
  bodyIdSchema,
  coercedIdSchema,
  optionalTextFilter,
  paginationShape,
  trimmedText,
} from './commonSchemas.js';

const ISBN_PATTERN = /^(\d{9}[\dX]|\d{13})$/;
const MIN_PUBLICATION_YEAR = 1450;

export function normalizeIsbn(value) {
  return String(value).replace(/[-\s]/g, '').toUpperCase();
}

// DECISAO: validação do ISBN — escolhido: só o formato (10 ou 13 caracteres), sem conferir o dígito verificador; alternativas: validar o dígito verificador
const isbnSchema = z
  .string()
  .transform(normalizeIsbn)
  .refine((isbn) => ISBN_PATTERN.test(isbn), {
    message: 'ISBN deve ter 10 ou 13 caracteres (dígitos, e X no final do ISBN-10)',
  });

// O ano atual é lido a cada validação, para a regra não "congelar" no ano em que o servidor subiu.
const publicationYearSchema = z
  .number()
  .int()
  .min(MIN_PUBLICATION_YEAR)
  .refine((year) => year <= new Date().getFullYear(), {
    message: 'Ano de publicação não pode ser maior que o ano atual',
  });

export const bookBodySchema = z.object({
  title: trimmedText(1, 255),
  isbn: isbnSchema,
  publicationYear: publicationYearSchema,
  genre: trimmedText(1, 100),
  pageCount: z.number().int().min(1).max(10000),
  authorId: bodyIdSchema,
});

export const bookListQuerySchema = z.object({
  ...paginationShape,
  title: optionalTextFilter,
  genre: optionalTextFilter,
  authorId: coercedIdSchema.optional(),
});

export function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    isbn: row.isbn,
    publicationYear: row.publication_year,
    genre: row.genre,
    pageCount: row.page_count,
    coverPath: row.cover_path,
    author: { id: row.author_id, name: row.author_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// DECISAO: formato da URL da capa — escolhido: URL absoluta montada com PUBLIC_URL; alternativas: caminho relativo (/uploads/...) que o front completa
export function presentBook(book, publicUrl) {
  const { coverPath, ...rest } = book;
  return {
    ...rest,
    coverUrl: coverPath ? `${publicUrl}/uploads/${coverPath}` : null,
  };
}
