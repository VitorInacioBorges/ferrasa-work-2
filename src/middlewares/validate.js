import { ValidationError } from '../errors/AppError.js';

// Valida body, params e query com schemas Zod e guarda o resultado em req.validated.
// No Express 5 req.query é somente leitura, por isso não reatribuímos req.query.
export function validate(schemas) {
  return (req, res, next) => {
    const sources = {
      body: req.body ?? {},
      params: req.params,
      query: req.query,
    };
    const validated = {};
    const details = [];

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(sources[part]);
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(new ValidationError(details));
    }

    req.validated = { ...req.validated, ...validated };
    return next();
  };
}
