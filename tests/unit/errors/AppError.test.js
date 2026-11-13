import { describe, expect, test } from '@jest/globals';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnprocessableEntityError,
  InvalidFileError,
  FileTooLargeError,
} from '../../../src/errors/AppError.js';

describe('AppError', () => {
  test('AppError defaults to 500 INTERNAL_ERROR', () => {
    const error = new AppError('falhou');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('falhou');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.details).toBeUndefined();
  });

  test.each([
    [NotFoundError, 404, 'NOT_FOUND', 'Recurso não encontrado'],
    [ValidationError, 400, 'VALIDATION_ERROR', 'Dados inválidos'],
    [ConflictError, 409, 'ISBN_ALREADY_EXISTS', 'ISBN já cadastrado'],
    [UnprocessableEntityError, 422, 'AUTHOR_NOT_FOUND', 'Autor informado não existe'],
    [InvalidFileError, 400, 'INVALID_FILE', 'Envie uma imagem JPEG, PNG ou WEBP no campo "cover"'],
    [FileTooLargeError, 413, 'FILE_TOO_LARGE', 'Arquivo excede o tamanho máximo permitido'],
  ])('%p sets statusCode and code', (ErrorClass, statusCode, code, message) => {
    const error = new ErrorClass();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });

  test('NotFoundError accepts a custom message', () => {
    expect(new NotFoundError('Livro não encontrado').message).toBe('Livro não encontrado');
  });

  test('ValidationError keeps details', () => {
    const details = [{ field: 'isbn', message: 'x' }];

    expect(new ValidationError(details).details).toEqual(details);
  });
});
