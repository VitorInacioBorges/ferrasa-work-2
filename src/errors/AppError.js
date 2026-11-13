export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ValidationError extends AppError {
  constructor(details = [], message = 'Dados inválidos') {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'ISBN já cadastrado', code = 'ISBN_ALREADY_EXISTS') {
    super(message, { statusCode: 409, code });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Autor informado não existe', code = 'AUTHOR_NOT_FOUND') {
    super(message, { statusCode: 422, code });
  }
}

export class InvalidFileError extends AppError {
  constructor(message = 'Envie uma imagem JPEG, PNG ou WEBP no campo "cover"') {
    super(message, { statusCode: 400, code: 'INVALID_FILE' });
  }
}

export class FileTooLargeError extends AppError {
  constructor(message = 'Arquivo excede o tamanho máximo permitido') {
    super(message, { statusCode: 413, code: 'FILE_TOO_LARGE' });
  }
}
