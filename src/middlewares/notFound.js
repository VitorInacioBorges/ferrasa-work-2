import { AppError } from '../errors/AppError.js';

export function notFound(req, res, next) {
  next(new AppError('Rota não encontrada', { statusCode: 404, code: 'ROUTE_NOT_FOUND' }));
}
