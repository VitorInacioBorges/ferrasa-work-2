import pg from 'pg';

// Conexão com o PostgreSQL. Recebe o objeto de ambiente validado (loadEnv)
// e expõe só o que as camadas de cima precisam: query parametrizada e close.
export function createDb({ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME }) {
  const pool = new pg.Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  return {
    query: (text, params) => pool.query(text, params),
    close: () => pool.end(),
  };
}
