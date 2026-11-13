import { describe, expect, test } from '@jest/globals';
import { ok, created, paginated, noContent, buildMeta } from '../../../src/utils/httpResponse.js';
import { createFakeResponse } from '../../helpers/fakeResponse.js';

describe('httpResponse', () => {
  test('ok sends 200 with envelope', () => {
    const res = createFakeResponse();

    ok(res, { id: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 1 } });
  });

  test('created sends 201 and Location header', () => {
    const res = createFakeResponse();

    created(res, { id: 5 }, '/api/authors/5');

    expect(res.statusCode).toBe(201);
    expect(res.headers.Location).toBe('/api/authors/5');
    expect(res.body).toEqual({ success: true, data: { id: 5 } });
  });

  test('paginated includes meta', () => {
    const res = createFakeResponse();
    const meta = { page: 1, limit: 10, total: 0, totalPages: 0 };

    paginated(res, [], meta);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: [], meta });
  });

  test('noContent sends 204 without body', () => {
    const res = createFakeResponse();

    noContent(res);

    expect(res.statusCode).toBe(204);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('buildMeta computes totalPages', () => {
    expect(buildMeta({ page: 2, limit: 10, total: 42 })).toEqual({
      page: 2,
      limit: 10,
      total: 42,
      totalPages: 5,
    });
    expect(buildMeta({ page: 1, limit: 10, total: 0 }).totalPages).toBe(0);
  });
});
