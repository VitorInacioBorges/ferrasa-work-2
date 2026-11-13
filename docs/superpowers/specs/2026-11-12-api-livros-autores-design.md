# Design — API CRUD de Livros e Autores

Data: 2026-11-12
Status: aprovado pelo usuário em 2026-11-12 (incluindo as sugestões da seção 11)

## 1. Intenção

Construir uma API REST de cadastro de **livros** e **autores** (cada livro tem um autor), pronta para ser consumida por um front-end React.

O projeto é uma **entrega avaliada**. Quem avalia vai olhar, além de "funciona", se cada critério de aceite aparece de forma clara e verificável:

1. Arquitetura MVC com `controllers`, `repositories`, `services`, `models`, `routes`, mais `app.js` (orquestração) e `db.js` (conexão).
2. Dados sensíveis separados em `.env`.
3. Documentação feita com a skill **docs-writer**: execução, arquitetura, consumo da API, boas práticas etc.
4. Controller/helper de respostas com formato padronizado e status HTTP apropriados.
5. Tratamento de erros.
6. Testes unitários e de integração com Jest, escritos com **TDD** (teste antes do código), cobrindo erros conhecidos.

Por isso, a separação de camadas, a padronização e os testes valem tanto quanto a funcionalidade. O código deve ser fácil de ler e de explicar numa apresentação.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- CRUD completo de autores e livros, com relação 1:N (um autor tem vários livros; cada livro tem um autor).
- Upload da capa do livro feito pela própria API.
- Listagens com paginação e filtros.
- Respostas JSON em envelope fixo, previsíveis para o React.
- Suíte Jest (unitária + integração) cobrindo os quatro grupos de erros da seção 8.
- Documentação em `docs/` em português.

**Não-objetivos** (ficam fora agora)
- Autenticação/autorização.
- Relação N:N (vários autores por livro).
- Docker, deploy e CI.
- O front-end React em si.
- `PATCH` (atualização parcial). A atualização é só por `PUT` com todos os campos.
- Remover só a capa (`DELETE /books/:id/cover`), redimensionar imagens e armazenamento em nuvem (S3/Cloudinary).
- Soft delete.

**Anti-objetivos** (seria fracasso mesmo funcionando)
- Resposta de erro que vaza stack trace, SQL, nome de tabela ou mensagem crua do Postgres.
- Qualquer SQL montado por concatenação de valores vindos do usuário. Todas as queries devem ser parametrizadas (`$1, $2...`).
- Credenciais versionadas no git (`.env` fora do repositório; só `.env.example` entra).
- Testes de integração que usam ou apagam o banco de desenvolvimento.
- Regra de negócio dentro de controller ou SQL dentro de service: cada camada só faz o seu papel.
- Testes escritos depois do código (quebra o critério de TDD).

## 3. Restrições e stack

Decidido com o usuário:
- **Node.js com ESM** (`"type": "module"` já está no `package.json`) e **pnpm** (já configurado).
- **PostgreSQL** instalado localmente, sem Docker.
- Acesso ao banco com o driver **`pg`** e **SQL escrito à mão** nos repositories. Sem ORM.
- **Jest** para testes unitários e de integração.
- **Zod** para validação de entrada.
- Upload com **multer**, arquivos salvos em disco e servidos como estáticos.

Escolhas minhas, aceitas pelo usuário como palpite:
- **Express** como framework HTTP.
- **Supertest** para os testes de integração HTTP.
- **cors** e **dotenv**.
- Código e nomes em **inglês** (as pastas já existentes estão em inglês). Documentação e mensagens de erro em **português**.

Escolhas minhas (calls), revisáveis:
- **Express 5**: repassa erros de handlers `async` direto para o middleware de erro, sem precisar de wrapper `asyncHandler`.
- Node **20 LTS ou mais novo** (necessário para `node --watch` e `--env-file`).

## 4. Estrutura de pastas

```
.
├── .env.example            # modelo das variáveis (versionado)
├── .env                    # valores reais de desenvolvimento (gitignored)
├── .env.test               # valores do banco de teste (gitignored)
├── jest.config.js
├── docs/                   # documentação (seção 10)
├── uploads/                # capas enviadas (gitignored, exceto .gitkeep)
├── scripts/
│   └── db-setup.js         # aplica database/schema.sql no banco do .env escolhido
├── database/
│   └── schema.sql          # cria tabelas, índices e FKs (idempotente)
├── src/
│   ├── app.js              # monta o Express: middlewares, rotas, estáticos, 404 e erro. NÃO chama listen
│   ├── server.js           # importa app e chama listen (entrada do `pnpm start`)
│   ├── db.js               # Pool do pg, query helper e fechamento da conexão
│   ├── config/
│   │   └── env.js          # lê e valida process.env com Zod; falha cedo se faltar variável
│   ├── models/
│   │   ├── authorModel.js  # schemas Zod de entrada + conversão linha do banco → objeto da API
│   │   └── bookModel.js
│   ├── repositories/
│   │   ├── authorRepository.js   # só SQL
│   │   └── bookRepository.js
│   ├── services/
│   │   ├── authorService.js      # regras de negócio
│   │   └── bookService.js
│   ├── controllers/
│   │   ├── authorController.js   # lê req, chama service, responde via helper
│   │   └── bookController.js
│   ├── routes/
│   │   ├── index.js              # agrega rotas sob /api
│   │   ├── authorRoutes.js
│   │   └── bookRoutes.js
│   ├── middlewares/
│   │   ├── validate.js           # aplica schema Zod em body/params/query
│   │   ├── upload.js             # configuração do multer
│   │   ├── notFound.js           # rota inexistente → 404
│   │   └── errorHandler.js       # converte qualquer erro no envelope de erro
│   ├── errors/
│   │   └── AppError.js           # AppError base + subclasses (NotFound, Conflict, Validation...)
│   └── utils/
│       ├── httpResponse.js       # o "controller de respostas": ok, created, noContent, paginated
│       └── fileStorage.js        # apagar arquivos de capa sem quebrar se já não existirem
└── tests/
    ├── unit/
    ├── integration/
    └── helpers/                  # limpeza do banco, fábricas de dados, imagens de exemplo
```

`app.js` e `server.js` ficam separados para que o Supertest use o `app` sem abrir porta.

### Papel de cada camada

| Camada | Faz | Não faz |
|---|---|---|
| **routes** | Liga verbo + caminho a middlewares (`validate`, `upload`) e ao método do controller | Lógica |
| **controllers** | Lê `req` já validado, chama o service, responde com `httpResponse` | SQL e regra de negócio |
| **services** | Regras: autor existe? ISBN repetido? apagar arquivos de capa? Lança `AppError` | SQL e `req/res` |
| **repositories** | Queries parametrizadas; devolve linhas convertidas pelo model | Decidir status HTTP |
| **models** | Schemas Zod da entrada e conversão `snake_case` (banco) → `camelCase` (API) | Acessar banco |
| **db.js** | Cria o `Pool` a partir do `env`, exporta `query` e `close` | — |
| **app.js** | `cors`, `express.json`, `/uploads` estático, rotas, `notFound`, `errorHandler` | `listen` |

## 5. Dados

### Tabelas (`database/schema.sql`)

**authors**

| coluna | tipo | regra |
|---|---|---|
| id | `SERIAL PRIMARY KEY` | |
| name | `VARCHAR(150) NOT NULL` | |
| nationality | `VARCHAR(100) NOT NULL` | |
| created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |
| updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |

**books**

| coluna | tipo | regra |
|---|---|---|
| id | `SERIAL PRIMARY KEY` | |
| title | `VARCHAR(255) NOT NULL` | |
| isbn | `VARCHAR(13) NOT NULL UNIQUE` | guardado normalizado (só dígitos e `X`) |
| publication_year | `INTEGER NOT NULL` | |
| genre | `VARCHAR(100) NOT NULL` | texto livre |
| page_count | `INTEGER NOT NULL` | |
| cover_path | `VARCHAR(255) NULL` | caminho relativo, ex.: `books/3f2a....jpg` |
| author_id | `INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE` | |
| created_at / updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |

Índice em `books(author_id)`. O script usa `CREATE TABLE IF NOT EXISTS` para poder rodar mais de uma vez.

`updated_at` é atualizado pela própria query de `UPDATE` (`updated_at = NOW()`), sem trigger. *(call minha: mais fácil de ler e explicar.)*

### Formato na API (camelCase)

```json
// Autor
{ "id": 1, "name": "Machado de Assis", "nationality": "Brasileira",
  "createdAt": "2026-11-12T12:00:00.000Z", "updatedAt": "2026-11-12T12:00:00.000Z" }

// Livro (sempre com o autor embutido via JOIN)
{ "id": 7, "title": "Dom Casmurro", "isbn": "9788535910663",
  "publicationYear": 1899, "genre": "Romance", "pageCount": 256,
  "coverUrl": "http://localhost:3000/uploads/books/3f2a....jpg",
  "author": { "id": 1, "name": "Machado de Assis" },
  "createdAt": "...", "updatedAt": "..." }
```

`coverUrl` é `null` quando não há capa. A URL é absoluta, montada com `PUBLIC_URL` do `.env`, para o React usar direto num `<img src>`. *(call minha.)*

### Regras de validação (Zod)

Na entrada, o body usa `authorId` (camelCase). Campos desconhecidos são ignorados.

| Campo | Regra |
|---|---|
| name | string, sem espaços nas pontas, 1–150 |
| nationality | string, sem espaços nas pontas, 2–100, obrigatório *(call minha)* |
| title | string, sem espaços nas pontas, 1–255 |
| isbn | aceita hífens/espaços; depois de removê-los deve ter 10 caracteres (9 dígitos + dígito ou `X`) ou 13 dígitos. **Só formato, sem conferir dígito verificador** *(call minha: evita atrito com ISBNs inventados em testes e na avaliação)*. Guardado normalizado |
| publicationYear | inteiro, de 1450 até o ano atual |
| genre | string, sem espaços nas pontas, 1–100 |
| pageCount | inteiro, 1–10000 |
| authorId | inteiro positivo |
| `:id` na URL | inteiro positivo; senão 400 |

## 6. Endpoints

Todos sob o prefixo `/api`.

### Autores

| Método | Caminho | Sucesso | Erros principais |
|---|---|---|---|
| GET | `/authors?page&limit&name` | 200 + `meta` | 400 query inválida |
| GET | `/authors/:id` | 200 | 400, 404 |
| GET | `/authors/:id/books?page&limit` | 200 + `meta` | 400, 404 se o autor não existe |
| POST | `/authors` | 201 + header `Location` | 400 |
| PUT | `/authors/:id` | 200 | 400, 404 |
| DELETE | `/authors/:id` | 204 sem corpo | 400, 404 |

### Livros

| Método | Caminho | Sucesso | Erros principais |
|---|---|---|---|
| GET | `/books?page&limit&title&genre&authorId` | 200 + `meta` | 400 query inválida |
| GET | `/books/:id` | 200 | 400, 404 |
| POST | `/books` | 201 + header `Location` | 400, 409 ISBN duplicado, 422 autor inexistente |
| PUT | `/books/:id` | 200 | 400, 404, 409, 422 |
| DELETE | `/books/:id` | 204 | 400, 404 |
| POST | `/books/:id/cover` (multipart, campo `cover`) | 200 com o livro atualizado | 400 sem arquivo / tipo inválido, 404 livro, 413 grande demais |

### Extra

`GET /api/health` → 200 `{ success: true, data: { status: "ok" } }`. Útil para a doc de execução. *(call minha.)*

### Listagem: paginação e filtros

- `page` padrão 1; `limit` padrão 10, máximo 100. Valor não inteiro, `page < 1` ou `limit` fora de 1–100 → 400.
- Filtros de texto (`name`, `title`, `genre`) usam `ILIKE '%valor%'` (contém, sem diferenciar maiúsculas). `authorId` é igualdade exata.
- Filtro sem resultado → 200 com `data: []` e `total: 0` (inclusive `?authorId=999`).
- `meta`: `{ page, limit, total, totalPages }`.
- A ordem padrão fica para quem implementa (seção 11).

### Capa do livro

- Aceita `image/jpeg`, `image/png` e `image/webp`, conferindo o mimetype e a extensão.
- Tamanho máximo vem de `MAX_UPLOAD_SIZE_MB` (padrão 2).
- Salva em `UPLOAD_DIR/books/<uuid>.<ext>`, com nome gerado pela API, nunca o nome original.
- Servida como estático em `/uploads`.
- Se o livro não existe → 404 **e** o arquivo recém-salvo é apagado.
- Trocar a capa apaga o arquivo antigo do disco.
- Apagar o livro apaga a capa do disco.

### Apagar autor (cascata)

1. O service busca os `cover_path` de todos os livros do autor.
2. Apaga o autor. O banco apaga os livros por `ON DELETE CASCADE`.
3. Remove os arquivos de capa do disco. Arquivo já inexistente não é erro; outros erros de disco são logados e não mudam a resposta (204).

## 7. Respostas e erros

### Envelope (`utils/httpResponse.js`)

```json
// sucesso
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }

// erro
{ "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos",
             "details": [ { "field": "isbn", "message": "ISBN deve ter 10 ou 13 caracteres" } ] } }
```

`meta` só aparece em listagens; `details` só aparece em erros de validação. O 204 não tem corpo.

Funções do helper: `ok(res, data)`, `created(res, data, location)`, `paginated(res, data, meta)`, `noContent(res)`. Os controllers só respondem por elas.

### Mapa de erros (`errorHandler.js`)

| Situação | Status | `code` |
|---|---|---|
| Falha no Zod (body, params, query) | 400 | `VALIDATION_ERROR` |
| JSON malformado no body | 400 | `INVALID_JSON` |
| Upload sem arquivo ou tipo não permitido | 400 | `INVALID_FILE` |
| Recurso não encontrado | 404 | `NOT_FOUND` |
| Rota inexistente | 404 | `ROUTE_NOT_FOUND` |
| ISBN duplicado | 409 | `ISBN_ALREADY_EXISTS` |
| `authorId` de autor inexistente (POST/PUT livro) | 422 | `AUTHOR_NOT_FOUND` |
| Arquivo acima do limite | 413 | `FILE_TOO_LARGE` |
| Qualquer outro erro (ex.: banco fora do ar) | 500 | `INTERNAL_ERROR`, mensagem genérica |

Rede de segurança: os códigos do Postgres `23505` (unique) e `23503` (FK) também são convertidos para 409 e 422, caso escapem do service (por exemplo, duas requisições ao mesmo tempo).

Em 500 o erro completo vai para o log do servidor (`console.error`, fora do ambiente de teste), nunca para a resposta.

## 8. Testes (TDD)

### Como o TDD aparece

Cada comportamento nasce de um teste que falha, depois o código mínimo para passar, depois refatoração. *(call minha:)* os commits mostram esse ciclo (`test: ...` seguido de `feat: ...`), para quem avalia conseguir ver o TDD no histórico.

**Decidido com o usuário:** a implementação é feita numa branch (ex.: `feat/api-livros-autores`) e, no fim, entra na `main` por **merge sem squash**, preservando cada commit `test:` / `feat:`. Nenhum passo do processo pode fazer squash ou rebase que junte esses commits.

### Unitários (`tests/unit`, sem banco e sem disco real)

- **models**: schemas Zod (casos válidos e inválidos de cada campo, normalização do ISBN) e conversão linha → objeto.
- **services**: com repositories e armazenamento de arquivos falsos. Cobrem: 404 quando não existe, 409 por ISBN, 422 por autor, cascata pedindo remoção das capas certas, troca de capa apagando a antiga.
- **controllers**: com service falso e `res` falso; conferem o status e o envelope.
- **httpResponse** e **errorHandler**: cada linha do mapa de erros da seção 7, inclusive erro genérico → 500 sem vazar a mensagem original.
- **validate** e **upload**: rejeições de dados e de arquivo.

### Integração (`tests/integration`, Supertest + banco de teste real)

- Usam o banco configurado em `.env.test` (ex.: `livros_test`). Antes de conectar, o setup confere que `NODE_ENV=test` e que o nome do banco termina em `_test`; se não terminar, aborta.
- O schema é aplicado no início da suíte. Antes de cada teste roda `TRUNCATE ... RESTART IDENTITY CASCADE`.
- Uploads vão para uma pasta temporária, apagada ao final.
- Testes rodam em série (`--runInBand`), porque compartilham o banco.

### Erros conhecidos que precisam de teste (todos escolhidos pelo usuário)

1. **Dados inválidos**: campo obrigatório faltando, tipo errado, ISBN mal formatado, ano e páginas fora do intervalo, JSON malformado → 400.
2. **Conflitos e vínculos**: ISBN duplicado (no POST e no PUT para o ISBN de outro livro) → 409; `authorId` inexistente → 422; apagar autor remove os livros dele e as capas do disco.
3. **Não encontrado**: id inexistente → 404; id não numérico → 400; rota inexistente → 404.
4. **Upload e banco**: arquivo que não é imagem → 400; arquivo grande demais → 413; sem arquivo → 400; falha de conexão com o banco → 500 sem detalhes internos.

Os casos felizes do CRUD, a paginação (`meta` correto, limites) e os filtros também são testados na integração.

### Scripts

| Script | Faz |
|---|---|
| `pnpm dev` | `node --watch` com `.env` |
| `pnpm start` | `node src/server.js` com `.env` |
| `pnpm db:setup` | aplica `schema.sql` no banco do `.env` |
| `pnpm db:setup:test` | aplica no banco do `.env.test` |
| `pnpm test` | todos os testes |
| `pnpm test:unit` / `pnpm test:integration` | cada grupo |
| `pnpm test:coverage` | com relatório de cobertura |

Jest com ESM roda com `NODE_OPTIONS=--experimental-vm-modules`.

## 9. Configuração (`.env`)

```
NODE_ENV=development
PORT=3000
PUBLIC_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=troque-me
DB_NAME=livros_dev
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=2
```

- `.env.example` (versionado) traz as chaves com valores de exemplo; `.env` e `.env.test` ficam no `.gitignore`.
- `config/env.js` valida as variáveis com Zod ao iniciar. Se faltar alguma, o processo para com uma mensagem clara.
- `CORS_ORIGIN` padrão é a porta do Vite (5173). *(call minha.)*
- Criar os dois bancos (`livros_dev` e `livros_test`) é um passo manual (`createdb` ou pgAdmin), descrito na doc de execução. O `db:setup` só cria as tabelas.
- **Ambiente do usuário:** o Postgres local roda na porta **5433** (não na 5432 padrão); por isso `.env.example` já usa 5433, e a doc de execução avisa que a porta pode variar. Node instalado: v22.
- **Na implementação:** o usuário informa usuário e senha do Postgres. Com isso, quem implementa cria `livros_dev` e `livros_test`, preenche `.env` e `.env.test` (nunca commitados) e aplica o schema. O plano deve pedir essas credenciais **antes** da primeira tarefa com teste de integração; até lá, as tarefas só de testes unitários podem andar.

## 10. Documentação

Feita com a skill **docs-writer**, em português, na pasta `docs/`, com o `README.md` da raiz apontando para tudo.

| Arquivo | Conteúdo |
|---|---|
| `README.md` | O que é, stack, início rápido em 5 passos, links para `docs/` |
| `docs/execucao.md` | Pré-requisitos, instalar Postgres, criar os dois bancos, `.env`, `db:setup`, rodar, rodar testes, problemas comuns |
| `docs/arquitetura.md` | Camadas e o papel de cada uma, caminho de uma requisição (route → validate → controller → service → repository → db), modelo de dados, decisões |
| `docs/api.md` | Cada endpoint com exemplo de requisição e resposta, envelope, tabela de erros, paginação e filtros, e exemplos de consumo em React (`fetch` e upload com `FormData`) |
| `docs/testes.md` | Estratégia de testes, como o TDD foi aplicado, banco de teste, lista de erros cobertos |
| `docs/boas-praticas.md` | Queries parametrizadas, `.env`, padrão de erros e respostas, convenções de nome, como adicionar uma nova entidade |

## 11. Decisões deixadas para quem implementa

**Regra:** toda decisão desta seção, quando aplicada, deve ser marcada no código, no ponto onde foi aplicada, com um comentário no formato:

```js
// DECISAO: <o que precisa ser decidido> — escolhido: <o que foi feito>; alternativas: <outras opções>
```

Assim o usuário encontra todas com `grep -rn "DECISAO:"`. As calls marcadas *(call minha)* nas seções anteriores também recebem esse comentário.

### 11.1 Ordem padrão das listagens

- **O que precisa ser decidido:** em que ordem `GET /authors`, `GET /books` e `GET /authors/:id/books` devolvem os itens quando o front não pede nada.
- **Por que ficou aberto:** o usuário não falou de ordenação, e nenhuma escolha muda o resto do design.
- **Opções:**
  - **Por `id` crescente:** previsível e fácil de testar; ganha estabilidade na paginação. Perde: o mais novo fica no fim.
  - **Mais recente primeiro (`created_at DESC, id DESC`):** o que acabou de ser cadastrado aparece no topo, o que costuma agradar em telas de cadastro. Perde: testes precisam controlar a ordem de criação.
  - **Alfabética (nome/título):** boa para catálogo. Perde: precisa de desempate por `id` para a paginação não repetir itens.
- **Sugestão:** alfabética com desempate por `id` (`ORDER BY name, id` / `ORDER BY title, id`). É o que um catálogo de livros mostraria, e o desempate mantém a paginação estável.
- **Como o usuário confere:** `DECISAO:` nos repositories, nas queries de listagem; na tela, a ordem da lista no React.

### 11.2 Como trocar dependências nos testes unitários

- **O que precisa ser decidido:** como os testes unitários de services e controllers substituem o repository, o service ou o armazenamento de arquivos por versões falsas.
- **Por que ficou aberto:** é uma escolha técnica interna; não muda o que a API faz.
- **Opções:**
  - **Injeção por fábrica:** cada camada é criada por uma função que recebe suas dependências (`createBookService({ bookRepository, authorRepository, fileStorage })`); `app.js` monta tudo. Ganha: testes simples, sem truques de Jest, e permite montar um `app` com banco "quebrado" para o teste de 500. Perde: um pouco mais de código de montagem.
  - **`jest.unstable_mockModule`:** módulos exportam funções diretamente e o Jest troca o import. Ganha: código de produção mais curto. Perde: API marcada como instável no ESM, e exige imports dinâmicos (`await import`) nos testes, o que é mais confuso de explicar.
- **Sugestão:** injeção por fábrica. É estável com ESM, deixa as dependências de cada camada visíveis (bom para a apresentação de MVC) e facilita o teste de falha de banco.
- **Como o usuário confere:** `DECISAO:` em `src/app.js`, onde as camadas são montadas, e no topo de um service.

### 11.3 Exigir cobertura mínima de testes

- **O que precisa ser decidido:** se `pnpm test:coverage` falha quando a cobertura fica abaixo de um limite, e qual limite.
- **Por que ficou aberto:** o critério pede testes com TDD, mas não fala em porcentagem.
- **Opções:**
  - **Sem limite:** só gera o relatório. Ganha: nunca bloqueia. Perde: não prova nada para quem avalia.
  - **80% (linhas e funções):** valor comum de mercado. Ganha: número defensável na apresentação. Perde: pode exigir testes para trechos triviais.
  - **90%+:** mostra rigor. Perde: tende a gerar testes artificiais só para bater a meta.
- **Sugestão:** 80% em `coverageThreshold` global. Com TDD de verdade, o número sai naturalmente acima disso, e o limite evita regressão.
- **Como o usuário confere:** `DECISAO:` em `jest.config.js`; rodar `pnpm test:coverage` e ver o resumo.

## 12. Resumo das calls feitas por mim (para revisão)

- Express 5; Node 20+.
- `server.js` separado de `app.js`; `db.js` em `src/db.js`.
- JSON da API em camelCase; livro sempre traz `author: { id, name }`.
- ISBN validado só pelo formato e guardado normalizado.
- Limites de tamanho dos campos, `nationality` obrigatória, ano entre 1450 e o atual, páginas entre 1 e 10000.
- `coverUrl` absoluta via `PUBLIC_URL`; limite padrão de upload de 2 MB; nome de arquivo gerado (uuid).
- Header `Location` no 201; endpoint `/api/health`.
- `updated_at` atualizado na query, sem trigger.
- `CORS_ORIGIN` padrão `http://localhost:5173`.
- Trava de segurança: testes só rodam em banco cujo nome termina em `_test`.
- Commits mostrando o ciclo do TDD.
