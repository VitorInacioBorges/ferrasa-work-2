# Arquitetura

A API segue o padrão MVC em camadas. Cada camada tem uma única
responsabilidade e só conversa com a camada vizinha. Este documento mostra as
camadas, o caminho de uma requisição, o modelo de dados e as decisões de
projeto.

## Estrutura de pastas

```
.
├── database/schema.sql      # tabelas, índices e chaves estrangeiras
├── scripts/                 # applySchema.js e db-setup.js
├── src/
│   ├── app.js               # monta o Express e todas as camadas
│   ├── server.js            # carrega o .env e abre a porta
│   ├── db.js                # pool de conexões do PostgreSQL
│   ├── config/env.js        # valida as variáveis de ambiente
│   ├── routes/              # liga verbo + caminho ao controller
│   ├── middlewares/         # validação, upload, 404 e erros
│   ├── controllers/         # traduz HTTP para chamadas de service
│   ├── services/            # regras de negócio
│   ├── repositories/        # SQL
│   ├── models/              # schemas Zod e conversão de dados
│   ├── errors/AppError.js   # classes de erro da aplicação
│   └── utils/               # helper de respostas e arquivos de capa
├── tests/
│   ├── unit/                # sem banco
│   ├── integration/         # Supertest + banco de teste
│   └── helpers/             # fábricas de dados e app de teste
└── uploads/                 # capas enviadas (ignorada pelo git)
```

## Camadas

| Camada           | Responsabilidade                                                          | O que ela não faz                 |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------- |
| **routes**       | Liga cada verbo e caminho aos middlewares e ao método do controller.      | Lógica.                           |
| **middlewares**  | Valida a entrada, recebe o upload e converte erros no formato padrão.     | Regra de negócio.                 |
| **controllers**  | Lê `req.validated`, chama o service e responde pelo helper de respostas.  | SQL e regra de negócio.           |
| **services**     | Aplica as regras: autor existe, ISBN repetido, apagar arquivos de capa.   | SQL e acesso a `req`/`res`.       |
| **repositories** | Executa SQL parametrizado e devolve objetos já convertidos pelo model.    | Decidir status HTTP.              |
| **models**       | Define os schemas de validação e converte `snake_case` para `camelCase`.  | Acessar o banco.                  |
| **db.js**        | Cria o pool do `pg` e expõe `query` e `close`.                            | —                                 |
| **app.js**       | Cria repositories, services e controllers e registra os middlewares.      | Abrir a porta (`listen`).         |

### Injeção de dependências por fábrica

Cada camada é criada por uma função que recebe suas dependências. Por exemplo,
`createBookService({ bookRepository, authorRepository, fileStorage })`. O
`app.js` é o único lugar que conecta as peças.

Isso traz duas vantagens:

- Os testes unitários passam versões falsas das dependências, sem truques do
  Jest.
- Os testes de integração montam o app com um banco que sempre falha, para
  provar que um erro de conexão vira um 500 sem detalhes internos.

## Caminho de uma requisição

O exemplo abaixo segue um `POST /api/books`.

1. **Rota** (`routes/bookRoutes.js`): encaminha para
   `validate({ body: bookBodySchema })` e depois para `bookController.create`.
2. **Validação** (`middlewares/validate.js`): o Zod limpa e confere o corpo.
   Os dados válidos vão para `req.validated.body`. Se algo estiver errado, o
   middleware gera um `ValidationError` (400).
3. **Controller** (`controllers/bookController.js`): chama
   `bookService.create(req.validated.body)`.
4. **Service** (`services/bookService.js`): confere se o autor existe (senão,
   422) e se o ISBN está livre (senão, 409).
5. **Repository** (`repositories/bookRepository.js`): executa o `INSERT` com
   parâmetros (`$1`, `$2`...) e busca o livro com o nome do autor.
6. **Resposta**: o controller converte `coverPath` em `coverUrl` e responde
   com `201`, o header `Location` e o envelope `{ success, data }`.

Se qualquer etapa lançar um erro, o Express 5 o entrega ao
`middlewares/errorHandler.js`, que monta a resposta de erro padrão.

```
requisição → rota → validate → (upload) → controller → service → repository → db
                                                                            ↓
resposta   ← httpResponse ← controller ← service ← repository ←────────────┘
erros      → errorHandler → { success: false, error: { code, message } }
```

## Modelo de dados

A relação é 1:N: um autor tem vários livros, e cada livro tem um autor.

**authors**

| Coluna        | Tipo           | Regra                    |
| ------------- | -------------- | ------------------------ |
| `id`          | `SERIAL`       | Chave primária.          |
| `name`        | `VARCHAR(150)` | Obrigatório.             |
| `nationality` | `VARCHAR(100)` | Obrigatório.             |
| `created_at`  | `TIMESTAMPTZ`  | Preenchido pelo banco.   |
| `updated_at`  | `TIMESTAMPTZ`  | Atualizado em cada edição. |

**books**

| Coluna             | Tipo           | Regra                                                   |
| ------------------ | -------------- | ------------------------------------------------------- |
| `id`               | `SERIAL`       | Chave primária.                                         |
| `title`            | `VARCHAR(255)` | Obrigatório.                                            |
| `isbn`             | `VARCHAR(13)`  | Obrigatório e único. Guardado só com dígitos e `X`.     |
| `publication_year` | `INTEGER`      | Obrigatório.                                            |
| `genre`            | `VARCHAR(100)` | Obrigatório.                                            |
| `page_count`       | `INTEGER`      | Obrigatório.                                            |
| `cover_path`       | `VARCHAR(255)` | Opcional. Caminho relativo da capa, como `books/x.png`. |
| `author_id`        | `INTEGER`      | Chave estrangeira para `authors`, com `ON DELETE CASCADE`. |
| `created_at`       | `TIMESTAMPTZ`  | Preenchido pelo banco.                                  |
| `updated_at`       | `TIMESTAMPTZ`  | Atualizado em cada edição.                              |

Quando um autor é apagado, o banco apaga os livros dele (`ON DELETE CASCADE`),
e o `authorService` remove do disco as capas desses livros.

## Decisões de projeto

Cada decisão está marcada no código com um comentário `DECISAO:`. Para listar
todas, rode:

```bash
grep -rn "DECISAO:" src jest.config.js
```

| Decisão                         | Escolha                                                  | Onde                               |
| ------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| Ordem padrão das listagens      | Alfabética (nome ou título), com desempate por `id`.     | `repositories/*Repository.js`      |
| Troca de dependências nos testes | Injeção por fábrica.                                    | `app.js`, `services/authorService.js` |
| Cobertura mínima                | 80% de linhas e funções.                                 | `jest.config.js`                   |
| Validação do ISBN               | Só o formato (10 ou 13 caracteres), sem dígito verificador. | `models/bookModel.js`           |
| URL da capa                     | Absoluta, montada com `PUBLIC_URL`.                      | `models/bookModel.js`              |
| Nacionalidade                   | Obrigatória, de 2 a 100 caracteres.                      | `models/authorModel.js`            |
| Tamanho máximo da capa          | 2 MB por padrão.                                         | `config/env.js`                    |
| Origem do CORS                  | `http://localhost:5173` (Vite) por padrão.               | `config/env.js`                    |
| Header `Location`               | Enviado em toda resposta 201.                            | `utils/httpResponse.js`            |
| Endpoint de saúde               | `GET /api/health`, sem consultar o banco.                | `routes/index.js`                  |
| `updated_at`                    | Atualizado na própria query, sem trigger.                | `repositories/*Repository.js`      |
| Abertura da porta               | `server.js` separado do `app.js`.                        | `server.js`                        |
