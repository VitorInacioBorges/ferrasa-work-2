import {
  AppError,
  ConflictError,
  FileTooLargeError,
  InvalidFileError,
  UnprocessableEntityError,
} from '../errors/AppError.js';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Erros HTTP 4xx que o próprio Express e o body-parser geram (http-errors, ou o URIError
// do roteador para parâmetro mal codificado, que vem com status 400 e sem "expose").
// A mensagem original vem em inglês, então usamos uma mensagem fixa por status.
const CLIENT_HTTP_ERRORS = {
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição excede o tamanho permitido' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Tipo de conteúdo não suportado' },
};
const DEFAULT_CLIENT_HTTP_ERROR = { code: 'BAD_REQUEST', message: 'Requisição inválida' };

function isExposedClientError(err) {
  const status = err.status ?? err.statusCode;
  return err.expose !== false && status >= 400 && status < 500;
}

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

  if (isExposedClientError(err)) {
    const statusCode = err.status ?? err.statusCode;
    const { code, message } = CLIENT_HTTP_ERRORS[statusCode] ?? DEFAULT_CLIENT_HTTP_ERROR;
    return new AppError(message, { statusCode, code });
  }

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
