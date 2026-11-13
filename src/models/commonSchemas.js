import { z } from 'zod';

// Mensagens de validação do Zod em português.
z.config(z.locales.pt());

// Maior valor da coluna INTEGER do Postgres. Ids acima disso nunca chegam ao banco.
export const INT4_MAX = 2147483647;

// No body JSON o id precisa ser número de verdade ("1" é rejeitado).
export const bodyIdSchema = z.number().int().positive().max(INT4_MAX);

// Em params e query string tudo chega como texto, então convertemos.
export const coercedIdSchema = z.coerce.number().int().positive().max(INT4_MAX);

export const idParamsSchema = z.object({ id: coercedIdSchema });

export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

// O Postgres não aceita o caractere NUL em textos; barramos antes de chegar ao banco.
const withoutNul = (schema) =>
  schema.refine((value) => !value.includes('\u0000'), { message: 'Texto contém caracteres inválidos' });

export const trimmedText = (min, max) => withoutNul(z.string().trim().min(min).max(max));

// Formulários costumam enviar filtros vazios ("?authorId="): tratamos como ausentes.
const emptyToUndefined = (schema) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema);

export const optionalTextFilter = emptyToUndefined(withoutNul(z.string().trim().max(255)).optional());

export const optionalIdFilter = emptyToUndefined(coercedIdSchema.optional());
