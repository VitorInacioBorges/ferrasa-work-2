# API CRUD de Livros e Autores — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API REST (Express + PostgreSQL) com CRUD de autores e livros (1:N), upload de capa, respostas padronizadas, tratamento de erros, testes Jest feitos com TDD e documentação em `docs/`.

**Architecture:** MVC em camadas (routes → middlewares de validação → controllers → services → repositories → `db.js`), cada camada criada por uma função fábrica que recebe as dependências. `src/app.js` monta tudo e é usado pelo `server.js` e pelos testes de integração (Supertest). O banco é acessado com SQL parametrizado via `pg`.

**Tech Stack:** Node 22 (ESM), pnpm, Express 5, pg 8, Zod 4, multer 2, cors, dotenv 17, Jest 30 (`@jest/globals`), Supertest 7.

**Spec:** [docs/superpowers/specs/2026-11-12-api-livros-autores-design.md](../specs/2026-11-12-api-livros-autores-design.md). Leia o spec inteiro antes da primeira tarefa. Valores, tabelas e mensagens vêm de lá.

## Global Constraints

- Branch de trabalho: `feat/api-livros-autores`. No fim, merge na `main` **sem squash** (`git merge --no-ff`). Nunca use rebase/squash que junte commits.
- TDD visível no histórico: em cada tarefa, commit `test: ...` com o teste falhando, depois commit `feat: ...` com o código. Mensagens de commit terminam com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- ESM puro (`import`/`export`). Jest roda com `NODE_OPTIONS=--experimental-vm-modules`; nos testes, `jest` vem de `import { jest } from '@jest/globals'`.
- Código e nomes em inglês. Mensagens de erro, docs e comentários de decisão em português.
- Toda query é parametrizada (`$1, $2...`). Nunca concatene valor vindo do usuário em SQL.
- JSON da API em camelCase. Envelope: sucesso `{ success: true, data, meta? }`; erro `{ success: false, error: { code, message, details? } }`.
- Nenhuma resposta de erro pode conter stack, SQL, nome de tabela ou mensagem crua do Postgres.
- `.env` e `.env.test` nunca são commitados; `.env.example` é. Postgres local na porta **5433**.
- Testes de integração só rodam se `NODE_ENV=test` e `DB_NAME` termina em `_test`.
- **Regra `DECISAO:`** — toda escolha da seção 11 do spec e toda *(call minha)* do spec recebe, no ponto do código onde foi aplicada, um comentário:
  `// DECISAO: <o que precisa ser decidido> — escolhido: <o que foi feito>; alternativas: <outras opções>`
  As escolhas já aprovadas pelo usuário: ordem alfabética com desempate por `id`, injeção de dependências por fábrica e cobertura mínima de 80%.
- `INT4_MAX = 2147483647`: ids e `authorId` acima disso são inválidos (400), nunca chegam ao banco.

## Review Focus

Entradas que o spec não cita, mas que devem funcionar (os testes estão nas tarefas indicadas):

1. **PUT de livro mantendo o próprio ISBN** → 200, não 409. O conflito só vale para o ISBN de *outro* livro. (Tarefas 7 e 13)
2. **Id ou `authorId` maior que o limite do `INTEGER`** (ex.: `/api/books/99999999999`) → 400 `VALIDATION_ERROR`, não 500 do Postgres. (Tarefas 3 e 13)
3. **Filtro com `%` ou `_`** (ex.: `?title=100%`) → busca literal, não curinga. (Tarefa 11)
4. **POST sem corpo ou sem `Content-Type: application/json`** → 400 `VALIDATION_ERROR` com os campos obrigatórios em `details`, não 500. No Express 5, `req.body` fica `undefined`. (Tarefas 3 e 12)
5. **Página além da última** (`?page=99`) → 200, `data: []` e `meta.total` com o total real (não 0). Por isso o total sai de um `COUNT(*)` separado, não de `COUNT(*) OVER()`. (Tarefas 10 e 13)

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `package.json`, `jest.config.js`, `.gitignore`, `.env.example`, `uploads/.gitkeep` | ferramentas e scripts | 1 |
| `src/errors/AppError.js` | classes de erro | 1 |
| `src/utils/httpResponse.js` | helper de respostas (o "controller de respostas") | 1 |
| `tests/helpers/fakeResponse.js` | `res` falso para testes unitários | 1 |
| `src/config/env.js` | validação do ambiente | 2 |
| `src/models/commonSchemas.js`, `authorModel.js`, `bookModel.js` | schemas Zod, conversão de linhas e apresentação | 3 |
| `src/middlewares/validate.js` | aplica schemas | 3 |
| `src/middlewares/errorHandler.js`, `notFound.js` | erros → envelope | 4 |
| `src/utils/fileStorage.js`, `src/middlewares/upload.js` | disco e multer | 5 |
| `src/services/authorService.js` | regras de autor | 6 |
| `src/services/bookService.js` | regras de livro | 7 |
| `src/controllers/authorController.js`, `bookController.js` | HTTP → service → resposta | 8 |
| `database/schema.sql`, `src/db.js`, `scripts/applySchema.js`, `scripts/db-setup.js`, `tests/helpers/testDb.js` | banco | 9 |
| `src/repositories/sqlUtils.js`, `authorRepository.js` | SQL de autores | 10 |
| `src/repositories/bookRepository.js` | SQL de livros | 11 |
| `src/routes/*.js`, `src/app.js`, `src/server.js`, `tests/helpers/testApp.js`, `tests/helpers/factories.js` | montagem e endpoints de autores | 12 |
| — (testes) | endpoints de livros, paginação, filtros | 13 |
| — (testes) | capa, cascata, banco fora do ar, health | 14 |
| `README.md`, `docs/*.md` | documentação | 15 |
| — | verificação final e merge | 16 |

---

### Task 1: Ferramentas, erros e helper de respostas

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`, `.gitignore`, `.env.example`, `uploads/.gitkeep`, `src/errors/AppError.js`, `src/utils/httpResponse.js`, `tests/helpers/fakeResponse.js`
- Test: `tests/unit/errors/AppError.test.js`, `tests/unit/utils/httpResponse.test.js`

**Interfaces:**
- Produces:
  - `AppError(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {})` com campos `statusCode`, `code`, `details`.
  - Subclasses (todas em `AppError.js`):
    - `NotFoundError(message = 'Recurso não encontrado')` → 404 `NOT_FOUND`
    - `ValidationError(details = [], message = 'Dados inválidos')` → 400 `VALIDATION_ERROR`
    - `ConflictError(message = 'ISBN já cadastrado', code = 'ISBN_ALREADY_EXISTS')` → 409
    - `UnprocessableEntityError(message = 'Autor informado não existe', code = 'AUTHOR_NOT_FOUND')` → 422
    - `InvalidFileError(message = 'Envie uma imagem JPEG, PNG ou WEBP no campo "cover"')` → 400 `INVALID_FILE`
    - `FileTooLargeError(message = 'Arquivo excede o tamanho máximo permitido')` → 413 `FILE_TOO_LARGE`
  - `httpResponse.js`: `ok(res, data)`, `created(res, data, location)`, `paginated(res, data, meta)`, `noContent(res)`, `buildMeta({ page, limit, total }) → { page, limit, total, totalPages }`.
  - `tests/helpers/fakeResponse.js`: `createFakeResponse() → res` com `status`, `json`, `set`, `end` encadeáveis (`jest.fn`) e os campos `statusCode`, `body`, `headers` preenchidos ao serem chamados.

- [ ] **Step 1: Instalar dependências e configurar ferramentas**

```bash
pnpm add express@^5 pg@^8 zod@^4 multer@^2 cors@^2 dotenv@^17
pnpm add -D jest@^30 @jest/globals@^30 supertest@^7
```

Scripts em `package.json` (remova `"main"` e o `test` antigo):

```json
"dev": "node --watch src/server.js",
"start": "node src/server.js",
"db:setup": "node scripts/db-setup.js .env",
"db:setup:test": "node scripts/db-setup.js .env.test",
"test": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
"test:unit": "NODE_OPTIONS=--experimental-vm-modules jest tests/unit",
"test:integration": "NODE_OPTIONS=--experimental-vm-modules jest tests/integration --runInBand",
"test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand --coverage"
```

`jest.config.js`: `testEnvironment: 'node'`, `transform: {}`, `testMatch: ['**/tests/**/*.test.js']`, `collectCoverageFrom: ['src/**/*.js', '!src/server.js']`, `coverageThreshold: { global: { lines: 80, functions: 80 } }` com o comentário `// DECISAO: exigir cobertura mínima — escolhido: 80% de linhas e funções; alternativas: sem limite, 90%+`.

`.gitignore`: `node_modules/`, `.env`, `.env.test`, `coverage/`, `uploads/*`, `!uploads/.gitkeep`.

`.env.example`: exatamente o bloco da seção 9 do spec (com `DB_PORT=5433`).

- [ ] **Step 2: Escrever os testes que falham**

`tests/unit/errors/AppError.test.js`:
- `each subclass sets statusCode and code`: tabela com as seis subclasses, conferindo `statusCode`, `code`, `message` padrão e `instanceof AppError`.
- `ValidationError keeps details`: `new ValidationError([{ field: 'isbn', message: 'x' }]).details` igual ao array.
- `AppError defaults to 500 INTERNAL_ERROR`.

`tests/unit/utils/httpResponse.test.js` (usando `createFakeResponse`):
- `ok sends 200 with envelope` → `status(200)`, body `{ success: true, data: { id: 1 } }`.
- `created sends 201 and Location header` → `created(res, { id: 5 }, '/api/authors/5')` define o header `Location: /api/authors/5`, status 201.
- `paginated includes meta` → body `{ success: true, data: [], meta }`.
- `noContent sends 204 without body` → `status(204)`, `end()` chamado, `json` não chamado.
- `buildMeta computes totalPages` → `{ page: 2, limit: 10, total: 42 }` → `totalPages: 5`; `total: 0` → `totalPages: 0`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm test:unit`
Expected: FAIL — `Cannot find module '../../../src/errors/AppError.js'` (e o mesmo para `httpResponse.js`).

- [ ] **Step 4: Commit dos testes**

```bash
git add package.json pnpm-lock.yaml jest.config.js .gitignore .env.example uploads/.gitkeep tests/
git commit -m "test: erros da aplicação e helper de respostas"
```

- [ ] **Step 5: Implementar `AppError.js`, `httpResponse.js` e `fakeResponse.js`** com as assinaturas acima.

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm test:unit`
Expected: PASS em todos os testes.

- [ ] **Step 7: Commit**

```bash
git add src/errors src/utils/httpResponse.js tests/helpers/fakeResponse.js
git commit -m "feat: classes de erro e helper de respostas padronizadas"
```

---

### Task 2: Validação do ambiente

**Files:**
- Create: `src/config/env.js`
- Test: `tests/unit/config/env.test.js`

**Interfaces:**
- Produces: `loadEnv(source = process.env) → Env`. É uma função pura: **não** chama dotenv. Quem chama (`server.js`, `db-setup.js`, helper de teste) carrega o arquivo antes com `dotenv.config({ path, quiet: true })`.
  `Env = { NODE_ENV: 'development'|'test'|'production', PORT: number, PUBLIC_URL: string, CORS_ORIGIN: string, DB_HOST, DB_PORT: number, DB_USER, DB_PASSWORD, DB_NAME, UPLOAD_DIR: string, MAX_UPLOAD_SIZE_MB: number }`.
  Padrões: `NODE_ENV='development'`, `PORT=3000`, `CORS_ORIGIN='http://localhost:5173'` (com `DECISAO:`), `UPLOAD_DIR='uploads'`, `MAX_UPLOAD_SIZE_MB=2` (com `DECISAO:`). `PUBLIC_URL` é obrigatório e deve ser URL, sem barra final (remova se vier). As `DB_*` são obrigatórias.
  Em caso de erro, lança `Error` cuja mensagem começa com `Variáveis de ambiente inválidas:` e cita cada chave com problema.

- [ ] **Step 1: Escrever os testes que falham**

- `parses a complete environment and coerces numbers` → `DB_PORT: '5433'` vira `5433`; `MAX_UPLOAD_SIZE_MB` ausente vira `2`.
- `strips trailing slash from PUBLIC_URL` → `'http://localhost:3000/'` vira `'http://localhost:3000'`.
- `throws listing missing keys` → sem `DB_PASSWORD` e `DB_NAME`: `toThrow(/Variáveis de ambiente inválidas:.*DB_PASSWORD.*DB_NAME/s)`.
- `rejects invalid PUBLIC_URL` → `'not-a-url'` lança com `PUBLIC_URL` na mensagem.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test:unit -- tests/unit/config`
Expected: FAIL — módulo `src/config/env.js` não encontrado.

- [ ] **Step 3: Commit dos testes** — `git commit -m "test: validação das variáveis de ambiente"`

- [ ] **Step 4: Implementar `loadEnv`** com `z.object(...).safeParse(source)`.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm test:unit -- tests/unit/config`
Expected: PASS

- [ ] **Step 6: Commit** — `git commit -m "feat: validação do ambiente com falha imediata"`

---

### Task 3: Schemas, models e middleware de validação

**Files:**
- Create: `src/models/commonSchemas.js`, `src/models/authorModel.js`, `src/models/bookModel.js`, `src/middlewares/validate.js`
- Test: `tests/unit/models/authorModel.test.js`, `tests/unit/models/bookModel.test.js`, `tests/unit/middlewares/validate.test.js`

**Interfaces:**
- Consumes: `ValidationError` (Task 1).
- Produces:
  - `commonSchemas.js`: chama `z.config(z.locales.pt())` uma vez, para as mensagens do Zod saírem em português. Exporta:
    - `INT4_MAX = 2147483647`
    - `bodyIdSchema` (`z.number().int().positive().max(INT4_MAX)`): no body, o número tem que ser número; a string `"1"` é rejeitada.
    - `coercedIdSchema`: o mesmo com `z.coerce`, para params e query.
    - `idParamsSchema = z.object({ id: coercedIdSchema })`
    - `paginationShape = { page: coerce int ≥1 default 1, limit: coerce int 1–100 default 10 }`
  - `authorModel.js`: `authorBodySchema`, `authorListQuerySchema` (`paginationShape` + `name?`), `authorBooksQuerySchema` (só `paginationShape`), `toAuthor(row) → { id, name, nationality, createdAt, updatedAt }`.
  - `bookModel.js`:
    - `normalizeIsbn(value) → string`: remove hífens e espaços e passa para maiúsculas.
    - `bookBodySchema`: o ISBN é normalizado e depois validado com `/^(\d{9}[\dX]|\d{13})$/` e a mensagem `'ISBN deve ter 10 ou 13 caracteres (dígitos, e X no final do ISBN-10)'`. Comentário `DECISAO:` (só formato, sem dígito verificador). `publicationYear` aceita de 1450 até `new Date().getFullYear()`, avaliado a cada validação (use `refine`, não um `max` fixado ao carregar o módulo). `pageCount` aceita de 1 a 10000. `authorId` usa `bodyIdSchema`.
    - `bookListQuerySchema`: `paginationShape` + `title?`, `genre?`, `authorId?` (`coercedIdSchema`).
    - `toBook(row) → Book`, onde `Book = { id, title, isbn, publicationYear, genre, pageCount, coverPath, author: { id, name }, createdAt, updatedAt }` e `row` traz `author_name`.
    - `presentBook(book, publicUrl) → objeto da API`: troca `coverPath` por `coverUrl = coverPath ? \`${publicUrl}/uploads/${coverPath}\` : null`. Comentário `DECISAO:` (URL absoluta via `PUBLIC_URL`).
  - Strings: `trim` e os limites de tamanho do spec, seção 5 (name 1–150, nationality 2–100, title 1–255, genre 1–100). Campos desconhecidos são descartados (padrão do `z.object`).
  - `validate({ body, params, query }) → middleware`: valida cada parte presente e grava o resultado em `req.validated = { body, params, query }`. **Não** reatribua `req.query`, que é somente leitura no Express 5. O body é validado como `req.body ?? {}`. Em falha, chama `next(new ValidationError(details))`, com `details = issues.map(i => ({ field: i.path.join('.'), message: i.message }))`.

- [ ] **Step 1: Escrever os testes que falham**

`authorModel.test.js`:
- `accepts valid author and trims` → `{ name: '  Machado ', nationality: 'Brasileira' }` vira `name: 'Machado'`.
- `rejects whitespace-only name` e `rejects nationality shorter than 2`.
- `toAuthor maps snake_case row` → `created_at` vira `createdAt`.
- `authorListQuerySchema applies defaults` → `{}` vira `{ page: 1, limit: 10 }`; `{ limit: '101' }` falha; `{ page: 'abc' }` falha; `{ page: '1.5' }` falha.

`bookModel.test.js`:
- `normalizes ISBN with hyphens` → `'978-85-359-1066-3'` vira `'9788535910663'`; `'85-359-0277-x'` vira `'853590277X'`.
- `rejects ISBN with 11 digits` e `rejects letters in the middle of the ISBN`.
- `rejects publicationYear 1449 and next year`; `accepts the current year`.
- `rejects pageCount 0, 10001 and 256.5`.
- `rejects authorId as string "1"` e `rejects authorId 2147483648`.
- `presentBook builds absolute coverUrl` → `coverPath: 'books/a.jpg'` com `'http://localhost:3000'` vira `coverUrl: 'http://localhost:3000/uploads/books/a.jpg'` e não tem a chave `coverPath`; `coverPath: null` vira `coverUrl: null`.
- `idParamsSchema rejects 99999999999 and "abc" and 0` (Review Focus 2).

`validate.test.js` (com `req`/`next` falsos):
- `stores parsed values in req.validated` → `params: { id: '7' }` vira `req.validated.params.id === 7`; `next()` é chamado sem argumento.
- `undefined body yields field errors` → `req.body = undefined` com `authorBodySchema`: `next` recebe um `ValidationError` cujo `details` contém `field: 'name'` e `field: 'nationality'` (Review Focus 4).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test:unit -- tests/unit/models tests/unit/middlewares/validate.test.js`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Commit dos testes** — `git commit -m "test: schemas de autor e livro e middleware de validação"`

- [ ] **Step 4: Implementar** os quatro arquivos com as interfaces acima.

- [ ] **Step 5: Rodar e ver passar** — mesmo comando. Expected: PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat: models com schemas Zod e middleware de validação"`

---

### Task 4: Middleware de erros e rota inexistente

**Files:**
- Create: `src/middlewares/errorHandler.js`, `src/middlewares/notFound.js`
- Test: `tests/unit/middlewares/errorHandler.test.js`

**Interfaces:**
- Consumes: classes de `AppError.js`, `createFakeResponse`.
- Produces:
  - `createErrorHandler({ logger = console } = {}) → (err, req, res, next)`. Ordem de conversão:
    1. `AppError` → seu status, `code`, `message` e `details` (só se existir).
    2. `err.type === 'entity.parse.failed'` → 400 `INVALID_JSON`, `'JSON malformado no corpo da requisição'`.
    3. `err.name === 'MulterError'`: com `err.code === 'LIMIT_FILE_SIZE'` → 413 `FILE_TOO_LARGE`; qualquer outro (ex.: campo com nome errado) → 400 `INVALID_FILE`.
    4. `err.code === '23505'` → 409 `ISBN_ALREADY_EXISTS`; `err.code === '23503'` → 422 `AUTHOR_NOT_FOUND`, com as mesmas mensagens padrão das classes.
    5. Qualquer outro → 500 `INTERNAL_ERROR`, `'Erro interno do servidor'`, e `logger.error(err)`. O logger só é chamado no caso 500.
  - `notFound(req, res, next)` → `next(new AppError('Rota não encontrada', { statusCode: 404, code: 'ROUTE_NOT_FOUND' }))`.

- [ ] **Step 1: Escrever os testes que falham** — um teste por linha da lista acima, mais:
  - `500 does not leak original message` → `new Error('relation "books" does not exist')` gera um body cujo `JSON.stringify` não contém `relation` nem `books`; `logger.error` é chamado uma vez.
  - `omits details when absent` → `NotFoundError` gera um body sem a chave `details`.
  - `notFound forwards ROUTE_NOT_FOUND`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test:unit -- tests/unit/middlewares/errorHandler.test.js`. Expected: FAIL, módulo não encontrado.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: conversão de erros para o envelope padrão"`
- [ ] **Step 4: Implementar** `errorHandler.js` e `notFound.js`.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: middleware de erros e rota inexistente"`

---

### Task 5: Armazenamento de arquivos e upload

**Files:**
- Create: `src/utils/fileStorage.js`, `src/middlewares/upload.js`
- Test: `tests/unit/utils/fileStorage.test.js`, `tests/unit/middlewares/upload.test.js`

**Interfaces:**
- Consumes: `InvalidFileError`.
- Produces:
  - `createFileStorage({ rootDir, logger = console }) → { remove(relativePath): Promise<void> }`. `remove` nunca lança: arquivo inexistente (`ENOENT`) é ignorado em silêncio; outros erros vão para `logger.error` e são engolidos. Ignora `null`/`undefined`.
  - `imageFileFilter(req, file, cb)`: aceita só quando o `file.mimetype` está em `{ 'image/jpeg', 'image/png', 'image/webp' }` **e** a extensão do `originalname` (em minúsculas) está em `.jpg .jpeg .png .webp`. Fora disso: `cb(new InvalidFileError())`.
  - `createUploadMiddleware({ uploadDir, maxSizeMb }) → middleware`: cria `path.join(uploadDir, 'books')` com `mkdirSync({ recursive: true })`, usa `multer.diskStorage` com nome `${randomUUID()}${ext}` (ext pelo mimetype: `.jpg`, `.png`, `.webp`), `limits.fileSize = maxSizeMb * 1024 * 1024`, `fileFilter: imageFileFilter`, `.single('cover')`.

- [ ] **Step 1: Escrever os testes que falham**

`fileStorage.test.js` (em uma pasta temporária `fs.mkdtemp`, apagada no `afterAll`):
- `removes an existing file`.
- `ignores missing file silently` → `logger.error` não é chamado.
- `logs other errors without throwing` → `remove` de um caminho que é diretório (gera `EISDIR`/`EPERM`) resolve sem lançar, e `logger.error` é chamado.
- `ignores null`.

`upload.test.js`:
- `imageFileFilter accepts png` → `cb(null, true)`.
- `rejects text/plain` e `rejects image/png named cover.exe` → `cb` recebe um `InvalidFileError`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test:unit -- tests/unit/utils/fileStorage.test.js tests/unit/middlewares/upload.test.js`. Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: armazenamento de capas e filtro de upload"`
- [ ] **Step 4: Implementar** os dois arquivos.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: armazenamento de capas e middleware de upload"`

---

### Task 6: Service de autores

**Files:**
- Create: `src/services/authorService.js`
- Test: `tests/unit/services/authorService.test.js`

**Interfaces:**
- Consumes: os contratos de repository abaixo (implementados nas Tasks 10 e 11; aqui entram como fakes com `jest.fn`), `fileStorage.remove`, `NotFoundError`.
  - `authorRepository`: `findAll({ page, limit, name }) → { items: Author[], total }`, `findById(id) → Author|null`, `create({ name, nationality }) → Author`, `update(id, data) → Author|null`, `remove(id) → boolean`.
  - `bookRepository`: `findAll({ page, limit, title, genre, authorId }) → { items: Book[], total }`, `findCoverPathsByAuthorId(authorId) → string[]`.
- Produces: `createAuthorService({ authorRepository, bookRepository, fileStorage }) → { list(query), getById(id), listBooks(id, { page, limit }), create(data), update(id, data), remove(id) }`. Todos são async. O 404 usa `new NotFoundError('Autor não encontrado')`.
  - No topo do arquivo vai o comentário `// DECISAO: como trocar dependências nos testes — escolhido: injeção por fábrica; alternativas: jest.unstable_mockModule`.

- [ ] **Step 1: Escrever os testes que falham**
  - `getById throws NotFoundError when missing`.
  - `listBooks throws 404 when author missing and does not query books`.
  - `listBooks delegates with authorId` → `bookRepository.findAll` recebe `{ page: 2, limit: 5, authorId: 3 }`.
  - `update throws 404 when repository returns null`.
  - `remove deletes author then removes each cover` → `findCoverPathsByAuthorId` devolve `['books/a.jpg', 'books/b.png']`: `authorRepository.remove(3)` é chamado **antes** de `fileStorage.remove` (confira a ordem com `mock.invocationCallOrder`), e `fileStorage.remove` é chamado duas vezes com esses caminhos.
  - `remove throws 404 and removes nothing when author missing`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test:unit -- tests/unit/services/authorService.test.js`. Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: regras de negócio de autores"`
- [ ] **Step 4: Implementar** `createAuthorService`. Em `remove`: busca o autor (404 se não existir), busca as capas, apaga o autor e depois remove os arquivos.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: service de autores com exclusão em cascata das capas"`

---

### Task 7: Service de livros

**Files:**
- Create: `src/services/bookService.js`
- Test: `tests/unit/services/bookService.test.js`

**Interfaces:**
- Consumes: `authorRepository.findById`; `bookRepository`: `findAll`, `findById(id) → Book|null`, `findByIsbn(isbn) → Book|null`, `create(data) → Book`, `update(id, data) → Book|null`, `updateCoverPath(id, coverPath) → Book|null`, `remove(id) → boolean`; `fileStorage.remove`; `NotFoundError`, `ConflictError`, `UnprocessableEntityError`.
- Produces: `createBookService({ bookRepository, authorRepository, fileStorage }) → { list(query), getById(id), create(data), update(id, data), updateCover(id, coverPath), remove(id) }`. O 404 usa `new NotFoundError('Livro não encontrado')`.
  Ordem das checagens:
  - `create`: autor (422) → ISBN (409) → grava.
  - `update`: livro (404) → autor (422) → ISBN de **outro** livro (409) → grava.

- [ ] **Step 1: Escrever os testes que falham**
  - `create throws 422 when author does not exist` → `findByIsbn` e `create` não são chamados.
  - `create throws 409 when ISBN exists`.
  - `create returns created book`.
  - `update throws 404 before checking author`.
  - `update allows keeping its own ISBN` → `findByIsbn` devolve o próprio livro (mesmo `id`), `update` é chamado (Review Focus 1).
  - `update throws 409 when ISBN belongs to another book`.
  - `updateCover removes uploaded file and throws 404 when book missing` → `fileStorage.remove('books/new.jpg')` é chamado.
  - `updateCover removes previous cover after saving` → o livro tinha `coverPath: 'books/old.jpg'`: `updateCoverPath(1, 'books/new.jpg')` é chamado e depois `remove('books/old.jpg')`.
  - `updateCover does not remove anything when there was no previous cover`.
  - `remove deletes book and its cover`; `remove throws 404 when missing`.

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: regras de negócio de livros"`
- [ ] **Step 4: Implementar** `createBookService`.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: service de livros com validação de autor, ISBN e capa"`

---

### Task 8: Controllers

**Files:**
- Create: `src/controllers/authorController.js`, `src/controllers/bookController.js`
- Test: `tests/unit/controllers/authorController.test.js`, `tests/unit/controllers/bookController.test.js`

**Interfaces:**
- Consumes: os services (Tasks 6 e 7), `httpResponse` (`ok`, `created`, `paginated`, `noContent`, `buildMeta`), `presentBook`, `InvalidFileError`. Autores saem como o service devolve (`Author`, já em camelCase). Os controllers leem só `req.validated` (e `req.file` no upload).
- Produces:
  - `createAuthorController({ authorService, publicUrl }) → { list, getById, listBooks, create, update, remove }`.
  - `createBookController({ bookService, publicUrl }) → { list, getById, create, update, remove, uploadCover }`.
  - Cada método é `async (req, res)`. Os erros sobem sozinhos (o Express 5 os repassa).
  - Listagens: `paginated(res, items, buildMeta({ page, limit, total }))`.
  - Criação: `created(res, entity, \`/api/authors/${id}\`)` ou `\`/api/books/${id}\``. O header `Location` leva comentário `DECISAO:`.
  - Todo livro de saída passa por `presentBook(book, publicUrl)`, inclusive em `authorController.listBooks`.
  - `uploadCover`: sem `req.file`, lança `InvalidFileError()`. Senão chama `bookService.updateCover(id, \`books/${req.file.filename}\`)` e responde com `ok`.

- [ ] **Step 1: Escrever os testes que falham** (service falso + `createFakeResponse`)
  - `author list responds paginated with meta` → `total: 42, page: 1, limit: 10` gera `meta.totalPages: 5`.
  - `author create responds 201 with Location`.
  - `author remove responds 204`.
  - `author listBooks presents books with coverUrl`.
  - `book getById presents coverUrl and hides coverPath`.
  - `book uploadCover throws InvalidFileError without file`.
  - `book uploadCover passes books/<filename> to service`.

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: controllers de autores e livros"`
- [ ] **Step 4: Implementar** os dois controllers.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS. Rode também `pnpm test:unit` inteiro: tudo verde.
- [ ] **Step 6: Commit** — `git commit -m "feat: controllers de autores e livros"`

---

### Task 9: Banco de dados, conexão e ambiente de teste

**Files:**
- Create: `database/schema.sql`, `src/db.js`, `scripts/applySchema.js`, `scripts/db-setup.js`, `tests/helpers/testDb.js`, `.env` e `.env.test` (locais, **não** commitados)
- Test: `tests/integration/db.test.js`

**Interfaces:**
- Consumes: `loadEnv`.
- Produces:
  - `createDb({ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME }) → { query(text, params) → Promise<{ rows, rowCount }>, close() }`. Recebe o `Env` inteiro e usa só essas chaves. Cria um `pg.Pool`.
  - `applySchema(db) → Promise<void>`: lê `database/schema.sql` (via `import.meta.dirname`) e executa.
  - `scripts/db-setup.js <arquivoEnv>`: `dotenv.config({ path, quiet: true })`, `loadEnv`, `createDb`, `applySchema`, `close`. Imprime `Schema aplicado em <DB_NAME>`.
  - `tests/helpers/testDb.js`:
    - `loadTestEnv() → Env`: carrega `.env.test` e lança `'Testes de integração exigem NODE_ENV=test e DB_NAME terminando em _test'` se a trava falhar.
    - `createTestDb() → db`: aplica o schema.
    - `resetDb(db)`: `TRUNCATE books, authors RESTART IDENTITY CASCADE`.

- [ ] **Step 1: PARAR e pedir credenciais ao usuário**

O usuário autorizou que você crie os bancos, mas precisa informar o usuário e a senha do Postgres. Pergunte com `AskUserQuestion` (porta 5433, host `localhost`). Não siga sem essa resposta. Não grave a senha em nenhum arquivo versionado.

- [ ] **Step 2: Criar os bancos e os arquivos `.env`**

```bash
PGPASSWORD='<senha>' createdb -h localhost -p 5433 -U <usuario> livros_dev
PGPASSWORD='<senha>' createdb -h localhost -p 5433 -U <usuario> livros_test
```

Copie `.env.example` para `.env` (com `DB_NAME=livros_dev`) e para `.env.test` (com `NODE_ENV=test`, `DB_NAME=livros_test`, `PORT=3001`), preenchendo usuário e senha. Confira com `git status` que nenhum dos dois aparece.

- [ ] **Step 3: Escrever o teste que falha** — `tests/integration/db.test.js`:
  - `applies schema twice without error` → `applySchema(db)` duas vezes resolve.
  - `creates authors and books tables with cascade` → inserir um autor e um livro, `DELETE` o autor e conferir que `SELECT count(*) FROM books` dá `0`.
  - `rejects duplicate isbn with code 23505`.
  - `loadTestEnv refuses non _test database` → com `DB_NAME=livros_dev` em um objeto de entrada, lança. Para isso `loadTestEnv(source?)` aceita a origem opcional.

- [ ] **Step 4: Rodar e ver falhar** — `pnpm test:integration`. Expected: FAIL, módulos não encontrados.
- [ ] **Step 5: Commit dos testes** — `git commit -m "test: schema e conexão com o banco"`
- [ ] **Step 6: Implementar** `schema.sql` (exatamente as tabelas da seção 5 do spec, com `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS books_author_id_idx`, FK `ON DELETE CASCADE`), `db.js`, `applySchema.js`, `db-setup.js` e `testDb.js`. Se o `updated_at` for atualizado na query, isso fica para as Tasks 10 e 11 (`DECISAO:` lá).
- [ ] **Step 7: Rodar e ver passar** — `pnpm test:integration` e depois `pnpm db:setup`. Expected: PASS e a saída `Schema aplicado em livros_dev`.
- [ ] **Step 8: Commit** — `git commit -m "feat: schema do banco, conexão e script de setup"`

---

### Task 10: Repository de autores

**Files:**
- Create: `src/repositories/sqlUtils.js`, `src/repositories/authorRepository.js`
- Test: `tests/integration/repositories/authorRepository.test.js`

**Interfaces:**
- Consumes: `db`, `toAuthor`, `createTestDb`, `resetDb`.
- Produces:
  - `sqlUtils.js`: `escapeLike(value) → string` (escapa `\`, `%` e `_` com `\`) e `offsetOf({ page, limit }) → (page - 1) * limit`.
  - `createAuthorRepository(db)` com o contrato da Task 6. `findAll`:
    - `WHERE name ILIKE $1 ESCAPE '\'` com `%${escapeLike(name)}%` quando houver filtro.
    - `ORDER BY name, id`, com o comentário `// DECISAO: ordem padrão das listagens — escolhido: alfabética com desempate por id; alternativas: id crescente, mais recente primeiro`.
    - `LIMIT/OFFSET`, e o `total` vem de um `SELECT COUNT(*)` separado com o mesmo `WHERE`, convertido para `Number`.
  - `update` faz `SET ..., updated_at = NOW()` e leva `DECISAO:` (sem trigger).

- [ ] **Step 1: Escrever os testes que falham** (com `resetDb` no `beforeEach` e `db.close()` no `afterAll`)
  - `create returns mapped author with timestamps`.
  - `findById returns null when missing`.
  - `findAll orders by name then id and paginates` → crie `Clarice`, `Ana`, `Bruno`; `{ page: 1, limit: 2 }` devolve `['Ana', 'Bruno']`, `total: 3`.
  - `findAll returns real total beyond last page` → `{ page: 99, limit: 10 }` devolve `items: []`, `total: 3` (Review Focus 5).
  - `findAll filters by name case-insensitively` → `name: 'ana'` acha `Ana`.
  - `update changes fields and bumps updatedAt`; `update returns null when missing`.
  - `remove returns true then false`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test:integration -- tests/integration/repositories/authorRepository.test.js`. Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: repository de autores"`
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: repository de autores com SQL parametrizado"`

---

### Task 11: Repository de livros

**Files:**
- Create: `src/repositories/bookRepository.js`
- Test: `tests/integration/repositories/bookRepository.test.js`

**Interfaces:**
- Consumes: `db`, `toBook`, `escapeLike`, `offsetOf`.
- Produces: `createBookRepository(db)` com o contrato da Task 7, mais `findAll` e `findCoverPathsByAuthorId` da Task 6.
  - Todo `SELECT` faz `JOIN authors a ON a.id = b.author_id` e traz `a.name AS author_name`.
  - `create` e `update` gravam e depois devolvem via `findById`.
  - `findAll`: os filtros `title` e `genre` usam `ILIKE ... ESCAPE '\'`, e `authorId` usa igualdade. Ordem `ORDER BY b.title, b.id` (mesma `DECISAO:` da Task 10). `total` vem de um `COUNT` separado.
  - Os dados de entrada vêm em camelCase (`publicationYear`, `pageCount`, `authorId`); o repository converte para as colunas.

- [ ] **Step 1: Escrever os testes que falham**
  - `create returns book with embedded author and null coverPath`.
  - `findByIsbn finds normalized isbn`.
  - `findAll filters by title, genre and authorId` (um teste por filtro).
  - `findAll treats % and _ literally` → livros `100% Jovem` e `1000 Dias`: `title: '100%'` devolve só o primeiro (Review Focus 3).
  - `findAll orders by title then id`.
  - `updateCoverPath stores path`; `update bumps updatedAt`.
  - `findCoverPathsByAuthorId returns only non-null paths`.
  - `remove returns true then false`.

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: repository de livros"`
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: repository de livros com filtros e paginação"`

---

### Task 12: Rotas, app, server e endpoints de autores

**Files:**
- Create: `src/routes/index.js`, `src/routes/authorRoutes.js`, `src/routes/bookRoutes.js`, `src/app.js`, `src/server.js`, `tests/helpers/testApp.js`, `tests/helpers/factories.js`
- Test: `tests/integration/authors.test.js`

**Interfaces:**
- Consumes: tudo das Tasks 1 a 11.
- Produces:
  - `createApp({ db, config, fileStorage?, logger? }) → express app`:
    - O `fileStorage` padrão é `createFileStorage({ rootDir: config.UPLOAD_DIR, logger })`.
    - O `logger` padrão é `console`.
    - Monta repositories → services → controllers. Leva o comentário `DECISAO:` de injeção por fábrica, de novo, aqui no ponto de montagem.
    - Middlewares, nesta ordem: `cors({ origin: config.CORS_ORIGIN })`, `express.json()`, `app.use('/uploads', express.static(config.UPLOAD_DIR))`, `app.use('/api', createRoutes(...))`, `notFound`, `createErrorHandler({ logger })`.
    - Não chama `listen`.
  - `createRoutes({ authorController, bookController, upload }) → Router`, com `GET /health` (`DECISAO:`), `/authors` e `/books`. Em cada rota com `:id`, o `validate({ params: idParamsSchema })` vem **antes** do `upload`.
  - `server.js`: `dotenv.config({ quiet: true })`. Envolve `loadEnv` num `try`: em erro, `console.error(err.message)` e `process.exit(1)`. Depois `createDb`, `createApp` e `listen(PORT)`, com o log `API ouvindo em <PUBLIC_URL>`. Leva `DECISAO:` sobre separar `server.js` de `app.js`.
  - `tests/helpers/testApp.js`: `setupTestApp() → { app, db, uploadDir, teardown() }`. Usa `loadTestEnv` e `createTestDb`, cria `uploadDir` com `fs.mkdtemp` e passa um logger silencioso (`{ error: () => {} }`). O `teardown` fecha o db e apaga o `uploadDir`.
  - `tests/helpers/factories.js`:
    - `validAuthor(overrides)` e `validBook(authorId, overrides)`. O ISBN de 13 dígitos é único por chamada (contador).
    - `createAuthor(app, overrides) → body.data` e `createBook(app, authorId, overrides) → body.data`, via Supertest.
    - `pngBuffer`: um PNG 1×1 em base64.

- [ ] **Step 1: Escrever os testes que falham** — `tests/integration/authors.test.js` (`resetDb` em `beforeEach`):
  - `POST /api/authors → 201 with envelope and Location`.
  - `POST without body → 400 VALIDATION_ERROR with name and nationality in details` (Review Focus 4).
  - `POST with text/plain body → 400 VALIDATION_ERROR`.
  - `POST with malformed JSON → 400 INVALID_JSON`.
  - `GET /api/authors → 200 paginated with meta` e `GET ?name=mach filters`.
  - `GET /api/authors?limit=101 → 400`.
  - `GET /api/authors/:id → 200`; `/999 → 404 NOT_FOUND`; `/abc → 400 VALIDATION_ERROR`.
  - `PUT /api/authors/:id → 200 updated`; `PUT missing → 404`.
  - `DELETE /api/authors/:id → 204 with empty body`; `DELETE missing → 404`.
  - `GET /api/authors/:id/books → 200 paginated`; para autor inexistente → 404.
  - `GET /api/unknown → 404 ROUTE_NOT_FOUND`.
  - `CORS header allows configured origin` → com `Origin: http://localhost:5173`, a resposta traz `access-control-allow-origin` igual a esse valor.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test:integration -- tests/integration/authors.test.js`. Expected: FAIL.
- [ ] **Step 3: Commit dos testes** — `git commit -m "test: endpoints de autores"`
- [ ] **Step 4: Implementar** rotas, `app.js`, `server.js` e helpers.
- [ ] **Step 5: Rodar e ver passar** — Expected: PASS. Depois, `pnpm dev` e `curl -s localhost:3000/api/health` devolve `{"success":true,"data":{"status":"ok"}}`. Pare o servidor.
- [ ] **Step 6: Commit** — `git commit -m "feat: app Express, rotas e endpoints de autores"`

---

### Task 13: Endpoints de livros, paginação e filtros

**Files:**
- Test: `tests/integration/books.test.js`
- Modify: só se algum teste revelar defeito nas Tasks 7, 11 ou 12.

**Interfaces:**
- Consumes: `setupTestApp`, `factories`.

- [ ] **Step 1: Escrever os testes** (cobrem os grupos "dados inválidos", "conflitos e vínculos" e "não encontrado" do spec, seção 8)
  - `POST /api/books → 201 with author embedded and coverUrl null`.
  - `POST normalizes ISBN with hyphens`.
  - `POST with missing title → 400 details field title`; `with pageCount "256" → 400`; `with publicationYear 1449 → 400`; `with ISBN 11 digits → 400`.
  - `POST duplicated ISBN → 409 ISBN_ALREADY_EXISTS`.
  - `POST with authorId 999 → 422 AUTHOR_NOT_FOUND`.
  - `PUT keeping its own ISBN → 200` (Review Focus 1); `PUT with another book's ISBN → 409`; `PUT with authorId 999 → 422`; `PUT missing book → 404`.
  - `GET /api/books/99999999999 → 400 VALIDATION_ERROR` (Review Focus 2).
  - `GET /api/books?authorId=99999999999 → 400`.
  - `GET /api/books filters by title, genre and authorId`; `?authorId=999 → 200 data [] total 0`.
  - `GET /api/books?page=99 → 200 data [] and real total` (Review Focus 5).
  - `GET /api/books?page=0 → 400`.
  - `DELETE /api/books/:id → 204`; depois `GET` dá 404.

- [ ] **Step 2: Rodar** — `pnpm test:integration -- tests/integration/books.test.js`.
  Expected: o que já está coberto pelas tarefas anteriores pode passar direto. Para cada teste que **falhar**, faça o commit `test:`, corrija na camada dona do defeito e faça o commit `fix:`. Se tudo passar de primeira, faça um único commit `test: endpoints de livros, paginação e filtros`.
- [ ] **Step 3: Rodar a suíte inteira** — `pnpm test`. Expected: PASS.

---

### Task 14: Capa, cascata, banco fora do ar e health

**Files:**
- Test: `tests/integration/covers.test.js`, `tests/integration/failures.test.js`
- Modify: só se algum teste revelar defeito.

**Interfaces:**
- Consumes: `setupTestApp`, `factories` (`pngBuffer`), `createApp`.

- [ ] **Step 1: Escrever os testes**

`covers.test.js`:
- `POST /api/books/:id/cover with png → 200 and coverUrl absolute` → `coverUrl` começa com `PUBLIC_URL + '/uploads/books/'` e termina em `.png`; o arquivo existe em `uploadDir/books`; um `GET` no caminho de `/uploads/...` devolve 200 com `content-type` `image/png`.
- `replacing cover deletes previous file`.
- `upload to missing book → 404 and no file left in uploadDir/books`.
- `upload with invalid id → 400 and no file saved`.
- `upload text file → 400 INVALID_FILE`.
- `upload without file → 400 INVALID_FILE`.
- `upload with wrong field name "image" → 400 INVALID_FILE`.
- `upload larger than MAX_UPLOAD_SIZE_MB → 413 FILE_TOO_LARGE` → um `Buffer.alloc(2 * 1024 * 1024 + 1)` enviado como `cover.png`/`image/png`.
- `DELETE book removes its cover file`.
- `DELETE author removes its books and their cover files` → autor com 2 livros, 1 com capa: depois do 204, `GET /api/books?authorId=<id>` dá `total: 0` e o arquivo não existe mais.

`failures.test.js`:
- `database down → 500 INTERNAL_ERROR without internal details` → `createApp({ db: { query: async () => { throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5433'), { code: 'ECONNREFUSED' }) } }, config, logger })`; `GET /api/authors` dá 500, `error.message === 'Erro interno do servidor'`, a string do body não contém `ECONNREFUSED` nem `5433`, e `logger.error` é chamado.
- `GET /api/health → 200 { status: 'ok' }`.

- [ ] **Step 2: Rodar** — `pnpm test:integration`. O fluxo de commits é igual ao da Task 13 (`test:`, depois `fix:` para cada defeito, ou um único `test:` se tudo passar).
- [ ] **Step 3: Rodar a suíte inteira com cobertura** — `pnpm test:coverage`. Expected: PASS, linhas e funções ≥ 80%. Se ficar abaixo, escreva testes para o que faltar (não baixe o limite).

---

### Task 15: Documentação

**Files:**
- Modify: `README.md`
- Create: `docs/execucao.md`, `docs/arquitetura.md`, `docs/api.md`, `docs/testes.md`, `docs/boas-praticas.md`

- [ ] **Step 1: Invocar a skill `docs-writer`** e seguir o processo dela para cada arquivo. O conteúdo de cada um está na tabela da seção 10 do spec. Pontos obrigatórios:
  - `execucao.md`: Postgres na porta 5433 (avisar que pode variar), `createdb` dos dois bancos, `.env`/`.env.test` a partir do `.env.example`, `pnpm db:setup` e `pnpm db:setup:test`, `pnpm dev`, todos os scripts de teste, e problemas comuns (porta errada, senha, banco de teste sem `_test`).
  - `api.md`: cada endpoint da seção 6 com um exemplo de requisição e de resposta, a tabela de erros da seção 7, paginação e filtros, um aviso de que os campos numéricos do body devem ser números (`"256"` dá 400), e exemplos em React: `fetch` de listagem, criação com JSON e upload com `FormData` (`formData.append('cover', file)`).
  - `arquitetura.md`: as camadas, o caminho de uma requisição, o modelo de dados e a lista de decisões (tire de `grep -rn "DECISAO:" src jest.config.js`).
  - `testes.md`: a estratégia, como o TDD aparece no histórico (`git log --oneline`), a trava do banco `_test` e os quatro grupos de erros cobertos.
  - `boas-praticas.md`: o conteúdo da seção 10 do spec, mais "como adicionar uma nova entidade" passo a passo.
- [ ] **Step 2: Verificar** — todo comando citado em `execucao.md` roda como está escrito, e todo link relativo entre os docs aponta para um arquivo que existe.
- [ ] **Step 3: Commit** — `git commit -m "docs: execução, arquitetura, API, testes e boas práticas"`

---

### Task 16: Verificação final e merge

- [ ] **Step 1:** `pnpm test:coverage`. Expected: tudo PASS, cobertura ≥ 80%.
- [ ] **Step 2:** `grep -rn "DECISAO:" src jest.config.js`. Expected: aparecem pelo menos ordem das listagens, injeção por fábrica, cobertura, ISBN só formato, `coverUrl` absoluta, limite de upload, `CORS_ORIGIN`, `Location`, `/health`, `updated_at` sem trigger e `server.js` separado.
- [ ] **Step 3:** `git status` sem `.env`/`.env.test`; `git log --oneline` mostrando os pares `test:` → `feat:`.
- [ ] **Step 4:** Invocar `superpowers:finishing-a-development-branch`. O merge na `main` deve ser `git merge --no-ff feat/api-livros-autores` (sem squash), conforme decidido com o usuário.
