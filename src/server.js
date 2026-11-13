import dotenv from 'dotenv';
import { loadEnv } from './config/env.js';
import { createDb } from './db.js';
import { createApp } from './app.js';

// DECISAO: onde a porta é aberta — escolhido: server.js separado do app.js (testes usam o app sem abrir porta); alternativas: app.js chamando listen
dotenv.config({ quiet: true });

let env;
try {
  env = loadEnv(process.env);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const db = createDb(env);
const app = createApp({ db, config: env });

app.listen(env.PORT, () => {
  console.log(`API ouvindo em ${env.PUBLIC_URL}`);
});
