import express from 'express';
import cors from 'cors';
import { createAuthorRepository } from './repositories/authorRepository.js';
import { createBookRepository } from './repositories/bookRepository.js';
import { createAuthorService } from './services/authorService.js';
import { createBookService } from './services/bookService.js';
import { createAuthorController } from './controllers/authorController.js';
import { createBookController } from './controllers/bookController.js';
import { createRoutes } from './routes/index.js';
import { createUploadMiddleware } from './middlewares/upload.js';
import { createFileStorage } from './utils/fileStorage.js';
import { notFound } from './middlewares/notFound.js';
import { createErrorHandler } from './middlewares/errorHandler.js';

// Orquestração: monta as camadas (repository → service → controller → rotas) e os middlewares.
// Não chama listen: o server.js sobe a porta, e os testes usam o app direto com Supertest.
// DECISAO: como trocar dependências nos testes — escolhido: injeção por fábrica (createApp recebe db, config e logger); alternativas: jest.unstable_mockModule
export function createApp({ db, config, fileStorage, logger = console }) {
  const storage = fileStorage ?? createFileStorage({ rootDir: config.UPLOAD_DIR, logger });

  const authorRepository = createAuthorRepository(db);
  const bookRepository = createBookRepository(db);

  const authorService = createAuthorService({ authorRepository, bookRepository, fileStorage: storage });
  const bookService = createBookService({ bookRepository, authorRepository, fileStorage: storage });

  const authorController = createAuthorController({ authorService, publicUrl: config.PUBLIC_URL });
  const bookController = createBookController({ bookService, publicUrl: config.PUBLIC_URL });

  const upload = createUploadMiddleware({
    uploadDir: config.UPLOAD_DIR,
    maxSizeMb: config.MAX_UPLOAD_SIZE_MB,
  });

  const app = express();
  // exposedHeaders: sem isso o navegador esconde o header Location das respostas 201.
  app.use(cors({ origin: config.CORS_ORIGIN, exposedHeaders: ['Location'] }));
  app.use(express.json());
  app.use('/uploads', express.static(config.UPLOAD_DIR));
  app.use('/api', createRoutes({ authorController, bookController, upload }));
  app.use(notFound);
  app.use(createErrorHandler({ logger }));

  return app;
}
