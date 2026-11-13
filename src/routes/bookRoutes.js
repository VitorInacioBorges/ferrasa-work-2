import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { idParamsSchema } from '../models/commonSchemas.js';
import { bookBodySchema, bookListQuerySchema } from '../models/bookModel.js';

export function createBookRoutes({ bookController, upload }) {
  const router = Router();

  router.get('/', validate({ query: bookListQuerySchema }), bookController.list);
  router.get('/:id', validate({ params: idParamsSchema }), bookController.getById);
  router.post('/', validate({ body: bookBodySchema }), bookController.create);
  router.put('/:id', validate({ params: idParamsSchema, body: bookBodySchema }), bookController.update);
  router.delete('/:id', validate({ params: idParamsSchema }), bookController.remove);
  // O id é validado ANTES do upload, para um id inválido não gravar arquivo no disco.
  router.post('/:id/cover', validate({ params: idParamsSchema }), upload, bookController.uploadCover);

  return router;
}
