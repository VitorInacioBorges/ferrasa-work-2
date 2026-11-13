import {
  AppError,
  ConflictError,
  FileTooLargeError,
  InvalidFileError,
  UnprocessableEntityError,
} from '../errors/AppError.js';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Converte erros conhecidos de bibliotecas (express.json, multer, pg) em AppError.
// Qualquer outro erro vira um 500 genérico.
function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err.type === 'entity.parse.failed') {
    return new AppError('JSON malformado no corpo da requisição', { statusCode: 400, code: 'INVALID_JSON' });
  }

  if (err.name === 'MulterError') {
    return err.code === 'LIMIT_FILE_SIZE' ? new FileTooLargeError() : new InvalidFileError();
  }

  // Rede de segurança para corridas entre requisições: o service já checa antes.
  if (err.code === PG_UNIQUE_VIOLATION) return new ConflictError();
  if (err.code === PG_FOREIGN_KEY_VIOLATION) return new UnprocessableEntityError();

  return null;
}

export function createErrorHandler({ logger = console } = {}) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const appError = toAppError(err);

    if (!appError) {
      // Detalhes só no log do servidor, nunca na resposta.
      logger.error(err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
      });
    }

    const error = { code: appError.code, message: appError.message };
    if (appError.details !== undefined) error.details = appError.details;

    return res.status(appError.statusCode).json({ success: false, error });
  };
}
