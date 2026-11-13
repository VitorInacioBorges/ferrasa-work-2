import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadTestEnv } from '../helpers/testDb.js';

let uploadDir;
let config;

beforeAll(async () => {
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'livros-failures-'));
  config = { ...loadTestEnv(), UPLOAD_DIR: uploadDir };
});

afterAll(async () => {
  await fs.rm(uploadDir, { recursive: true, force: true });
});

describe('failures', () => {
  test('database down → 500 INTERNAL_ERROR without internal details', async () => {
    const brokenDb = {
      query: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5433'), { code: 'ECONNREFUSED' });
      },
    };
    const logger = { error: jest.fn() };
    const app = createApp({ db: brokenDb, config, logger });

    const response = await request(app).get('/api/authors');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
    expect(response.text).not.toMatch(/ECONNREFUSED|5433/);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("GET /api/health → 200 { status: 'ok' }", async () => {
    const app = createApp({ db: { query: jest.fn() }, config, logger: { error: jest.fn() } });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });
});
