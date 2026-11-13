import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { idParamsSchema } from '../models/commonSchemas.js';
import {
  authorBodySchema,
  authorBooksQuerySchema,
  authorListQuerySchema,
} from '../models/authorModel.js';

export function createAuthorRoutes({ authorController }) {
  const router = Router();

  router.get('/', validate({ query: authorListQuerySchema }), authorController.list);
  router.get('/:id', validate({ params: idParamsSchema }), authorController.getById);
  router.get(
    '/:id/books',
    validate({ params: idParamsSchema, query: authorBooksQuerySchema }),
    authorController.listBooks,
  );
  router.post('/', validate({ body: authorBodySchema }), authorController.create);
  router.put('/:id', validate({ params: idParamsSchema, body: authorBodySchema }), authorController.update);
  router.delete('/:id', validate({ params: idParamsSchema }), authorController.remove);

  return router;
}
