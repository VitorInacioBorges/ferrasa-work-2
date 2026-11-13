import pg from 'pg';

// Conexão com o PostgreSQL. Recebe o objeto de ambiente validado (loadEnv)
// e expõe só o que as camadas de cima precisam: query parametrizada e close.
export function createDb({ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME }, { logger = console } = {}) {
  const pool = new pg.Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  // Uma conexão ociosa que cai (Postgres reiniciado, por exemplo) emite 'error' no pool.
  // Sem este listener o Node derruba o processo inteiro; com ele, o pool descarta a
  // conexão e a próxima requisição abre outra (ou recebe 500, se o banco seguir fora).
  pool.on('error', (err) => logger.error(err));

  return {
    query: (text, params) => pool.query(text, params),
    close: () => pool.end(),
  };
}
