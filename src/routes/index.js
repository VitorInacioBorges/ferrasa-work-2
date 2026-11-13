import { Router } from 'express';
import { ok } from '../utils/httpResponse.js';
import { createAuthorRoutes } from './authorRoutes.js';
import { createBookRoutes } from './bookRoutes.js';

export function createRoutes({ authorController, bookController, upload }) {
  const router = Router();

  // DECISAO: endpoint de saúde — escolhido: GET /api/health simples, sem consultar o banco; alternativas: sem endpoint, health que testa o banco
  router.get('/health', (req, res) => ok(res, { status: 'ok' }));
  router.use('/authors', createAuthorRoutes({ authorController }));
  router.use('/books', createBookRoutes({ bookController, upload }));

  return router;
}
