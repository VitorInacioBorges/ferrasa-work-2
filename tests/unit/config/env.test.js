import { describe, expect, test } from '@jest/globals';
import { loadEnv } from '../../../src/config/env.js';

const completeEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  PUBLIC_URL: 'http://localhost:3000',
  CORS_ORIGIN: 'http://localhost:5173',
  DB_HOST: 'localhost',
  DB_PORT: '5433',
  DB_USER: 'postgres',
  DB_PASSWORD: 'secret',
  DB_NAME: 'livros_dev',
  UPLOAD_DIR: 'uploads',
};

describe('loadEnv', () => {
  test('parses a complete environment and coerces numbers', () => {
    const env = loadEnv(completeEnv);

    expect(env.DB_PORT).toBe(5433);
    expect(env.PORT).toBe(3000);
    expect(env.MAX_UPLOAD_SIZE_MB).toBe(2);
    expect(env.DB_NAME).toBe('livros_dev');
  });

  test('applies defaults for optional keys', () => {
    const { NODE_ENV, PORT, CORS_ORIGIN, UPLOAD_DIR, ...required } = completeEnv;

    const env = loadEnv(required);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(env.UPLOAD_DIR).toBe('uploads');
  });

  test('strips trailing slash from PUBLIC_URL', () => {
    const env = loadEnv({ ...completeEnv, PUBLIC_URL: 'http://localhost:3000/' });

    expect(env.PUBLIC_URL).toBe('http://localhost:3000');
  });

  test('throws listing missing keys', () => {
    const { DB_PASSWORD, DB_NAME, ...incomplete } = completeEnv;

    expect(() => loadEnv(incomplete)).toThrow(/Variáveis de ambiente inválidas:.*DB_PASSWORD.*DB_NAME/s);
  });

  test('rejects invalid PUBLIC_URL', () => {
    expect(() => loadEnv({ ...completeEnv, PUBLIC_URL: 'not-a-url' })).toThrow(/PUBLIC_URL/);
  });
});
