import { describe, expect, jest, test } from '@jest/globals';
import { createErrorHandler } from '../../../src/middlewares/errorHandler.js';
import { notFound } from '../../../src/middlewares/notFound.js';
import { AppError, NotFoundError, ValidationError } from '../../../src/errors/AppError.js';
import { createFakeResponse } from '../../helpers/fakeResponse.js';

function handle(err) {
  const logger = { error: jest.fn() };
  const res = createFakeResponse();
  createErrorHandler({ logger })(err, {}, res, jest.fn());
  return { res, logger };
}

describe('errorHandler', () => {
  test('AppError uses its own status, code and details', () => {
    const details = [{ field: 'isbn', message: 'inválido' }];

    const { res, logger } = handle(new ValidationError(details));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('omits details when absent', () => {
    const { res } = handle(new NotFoundError('Livro não encontrado'));

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Livro não encontrado' });
  });

  test('malformed JSON becomes 400 INVALID_JSON', () => {
    const err = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
      type: 'entity.parse.failed',
      status: 400,
    });

    const { res } = handle(err);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'JSON malformado no corpo da requisição',
    });
  });

  test('multer LIMIT_FILE_SIZE becomes 413 FILE_TOO_LARGE', () => {
    const err = Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' });

    const { res } = handle(err);

    expect(res.statusCode).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  test('other multer errors become 400 INVALID_FILE', () => {
    const err = Object.assign(new Error('Unexpected field'), {
      name: 'MulterError',
      code: 'LIMIT_UNEXPECTED_FILE',
    });

    const { res } = handle(err);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });

  test('postgres unique violation 23505 becomes 409', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "books_isbn_key"'), {
      code: '23505',
    });

    const { res } = handle(err);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toEqual({ code: 'ISBN_ALREADY_EXISTS', message: 'ISBN já cadastrado' });
  });

  test('postgres foreign key violation 23503 becomes 422', () => {
    const err = Object.assign(new Error('insert or update on table "books" violates foreign key'), {
      code: '23503',
    });

    const { res } = handle(err);

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toEqual({ code: 'AUTHOR_NOT_FOUND', message: 'Autor informado não existe' });
  });

  test.each([
    ['entity.too.large', 413, 'PAYLOAD_TOO_LARGE', 'Corpo da requisição excede o tamanho permitido'],
    ['charset.unsupported', 415, 'UNSUPPORTED_MEDIA_TYPE', 'Tipo de conteúdo não suportado'],
    [undefined, 400, 'BAD_REQUEST', 'Requisição inválida'],
  ])('exposed http error %s keeps its 4xx status', (type, status, code, message) => {
    const err = Object.assign(new Error('raw english message'), { type, status, expose: true });

    const { res, logger } = handle(err);

    expect(res.statusCode).toBe(status);
    expect(res.body.error).toEqual({ code, message });
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('router URIError with status 400 becomes BAD_REQUEST', () => {
    const err = Object.assign(new URIError("Failed to decode param '%E0%A4%A'"), { status: 400, statusCode: 400 });

    const { res } = handle(err);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('4xx error explicitly marked expose=false becomes 500', () => {
    const err = Object.assign(new Error('internal'), { status: 400, expose: false });

    expect(handle(err).res.statusCode).toBe(500);
  });

  test('non-exposed or 5xx http errors still become 500', () => {
    const err = Object.assign(new Error('boom'), { status: 503, expose: false });

    const { res } = handle(err);

    expect(res.statusCode).toBe(500);
  });

  test('500 does not leak original message', () => {
    const { res, logger } = handle(new Error('relation "books" does not exist'));

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/relation|books/);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('notFound', () => {
  test('notFound forwards ROUTE_NOT_FOUND', () => {
    const next = jest.fn();

    notFound({}, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('ROUTE_NOT_FOUND');
    expect(err.message).toBe('Rota não encontrada');
  });
});
