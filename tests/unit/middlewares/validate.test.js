import { describe, expect, jest, test } from '@jest/globals';
import { validate } from '../../../src/middlewares/validate.js';
import { idParamsSchema } from '../../../src/models/commonSchemas.js';
import { authorBodySchema } from '../../../src/models/authorModel.js';
import { ValidationError } from '../../../src/errors/AppError.js';

describe('validate', () => {
  test('stores parsed values in req.validated', () => {
    const req = { params: { id: '7' }, query: {}, body: undefined };
    const next = jest.fn();

    validate({ params: idParamsSchema })(req, {}, next);

    expect(req.validated.params.id).toBe(7);
    expect(next).toHaveBeenCalledWith();
  });

  test('does not reassign req.query', () => {
    const query = { page: '2' };
    const req = { params: {}, query, body: undefined };

    validate({ query: authorBodySchema.partial() })(req, {}, jest.fn());

    expect(req.query).toBe(query);
  });

  test('undefined body yields field errors', () => {
    const req = { params: {}, query: {}, body: undefined };
    const next = jest.fn();

    validate({ body: authorBodySchema })(req, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['name', 'nationality']));
    expect(error.details[0].message).toEqual(expect.any(String));
  });
});
