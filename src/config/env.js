import { z } from 'zod';

const requiredText = z.string().trim().min(1);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  // DECISAO: origem padrão liberada no CORS — escolhido: http://localhost:5173 (porta do Vite); alternativas: liberar qualquer origem (*), exigir sempre no .env
  CORS_ORIGIN: requiredText.default('http://localhost:5173'),
  DB_HOST: requiredText,
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: requiredText,
  DB_PASSWORD: requiredText,
  DB_NAME: requiredText,
  UPLOAD_DIR: requiredText.default('uploads'),
  // DECISAO: tamanho máximo padrão da capa — escolhido: 2 MB; alternativas: 1 MB, 5 MB
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(2),
});

// Função pura: quem chama carrega o arquivo .env antes (dotenv) e passa process.env.
export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`);
    throw new Error(`Variáveis de ambiente inválidas: ${problems.join(', ')}`);
  }

  return result.data;
}
