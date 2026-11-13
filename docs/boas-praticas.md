# Boas práticas

Este documento reúne as convenções do projeto e mostra como adicionar uma nova
entidade seguindo o mesmo padrão.

## Segurança

- **Use sempre SQL parametrizado.** Passe os valores em `$1`, `$2`... e no
  array de parâmetros de `db.query`. Nunca concatene um valor vindo do usuário
  numa string SQL: isso abre espaço para SQL injection.
- **Escape os curingas em buscas com `LIKE`.** Use `escapeLike` de
  `src/repositories/sqlUtils.js` junto com `ESCAPE '\'`, para que `%` e `_`
  digitados pelo usuário sejam buscados literalmente.
- **Mantenha segredos no `.env`.** Os arquivos `.env` e `.env.test` ficam fora
  do git. Ao criar uma variável nova, adicione-a ao `.env.example` com um
  valor de exemplo e à validação em `src/config/env.js`.
- **Nunca devolva detalhes internos.** Erros inesperados viram
  `500 INTERNAL_ERROR` com uma mensagem genérica. O erro completo vai só para
  o log do servidor.
- **Nunca use o nome de arquivo enviado pelo usuário.** O upload grava a capa
  com um nome gerado (UUID) e só aceita imagens JPEG, PNG e WEBP.

## Respostas e erros

- **Responda só pelo helper.** Nos controllers, use `ok`, `created`,
  `paginated` e `noContent` de `src/utils/httpResponse.js`. Assim toda
  resposta tem o mesmo envelope.
- **Lance erros, não monte respostas de erro.** Nos services, lance as classes
  de `src/errors/AppError.js`, como `NotFoundError` ou `ConflictError`. O
  `errorHandler` converte o erro no status e no envelope certos.
- **Escolha o status pelo significado:**
  - `400`: a entrada está mal formada.
  - `404`: o recurso da URL não existe.
  - `409`: a entrada conflita com um dado existente.
  - `422`: a entrada está bem formada, mas aponta para algo que não existe.
- **Não use `try/catch` só para repassar o erro.** O Express 5 já entrega ao
  `errorHandler` qualquer erro lançado por um handler `async`.

## Validação

- Valide toda entrada (body, params e query) com um schema Zod no middleware
  `validate`, na definição da rota.
- Leia os dados validados de `req.validated`. No Express 5, `req.query` é
  somente leitura, e os valores originais ainda são texto.
- Use `coercedIdSchema` para ids na URL e na query, e `bodyIdSchema` para ids
  no corpo JSON. Os dois rejeitam valores acima do limite do `INTEGER` do
  PostgreSQL.

## Camadas e nomes

- **Respeite a responsabilidade de cada camada.** Controller não tem SQL,
  service não toca em `req`/`res`, e repository não decide status HTTP. Veja a
  tabela em [Arquitetura](arquitetura.md#camadas).
- **Crie cada camada com uma função fábrica** que recebe as dependências, como
  `createXService({ xRepository })`. Monte tudo em `src/app.js`.
- **Use `camelCase` na API e no JavaScript, e `snake_case` no banco.** A
  conversão acontece no model (`toAuthor`, `toBook`).
- **Use nomes de arquivo no padrão `<entidade><Camada>.js`**, como
  `bookService.js` e `authorRoutes.js`.
- **Marque decisões no código.** Quando você escolher entre alternativas,
  deixe um comentário no formato
  `// DECISAO: <o que> — escolhido: <o quê>; alternativas: <outras>`.

## Testes

- Escreva o teste antes do código e veja ele falhar pelo motivo certo.
- Teste regras de negócio com testes unitários e fakes; teste SQL e endpoints
  com testes de integração.
- Use os helpers de `tests/helpers/` (`setupTestApp`, `createAuthor`,
  `createBook`, `validBook`) em vez de repetir montagem de dados.

## Como adicionar uma nova entidade

O exemplo adiciona uma entidade **editora** (`publishers`). Siga os passos
nesta ordem e escreva o teste de cada passo antes do código.

1. **Crie a tabela.** Adicione o `CREATE TABLE IF NOT EXISTS publishers` em
   `database/schema.sql` e rode `pnpm db:setup` e `pnpm db:setup:test`.
2. **Crie o model.** Em `src/models/publisherModel.js`, defina
   `publisherBodySchema`, `publisherListQuerySchema` (com `paginationShape`) e
   `toPublisher(row)`. Teste em `tests/unit/models/`.
3. **Crie o repository.** Em `src/repositories/publisherRepository.js`,
   exporte `createPublisherRepository(db)` com `findAll`, `findById`,
   `create`, `update` e `remove`, sempre com SQL parametrizado. Teste em
   `tests/integration/repositories/`.
4. **Crie o service.** Em `src/services/publisherService.js`, exporte
   `createPublisherService({ publisherRepository })` e lance `NotFoundError`
   quando a editora não existir. Teste em `tests/unit/services/` com fakes.
5. **Crie o controller.** Em `src/controllers/publisherController.js`,
   exporte `createPublisherController({ publisherService })` e responda pelo
   helper de respostas. Teste em `tests/unit/controllers/`.
6. **Crie as rotas.** Em `src/routes/publisherRoutes.js`, ligue cada rota ao
   `validate` e ao controller. Registre o router em `src/routes/index.js`
   com `router.use('/publishers', ...)`.
7. **Monte as camadas.** Em `src/app.js`, crie o repository, o service e o
   controller e passe o controller para `createRoutes`.
8. **Teste os endpoints.** Crie `tests/integration/publishers.test.js` com os
   casos de sucesso e de erro.
9. **Documente.** Adicione os endpoints em [Consumo da API](api.md) e a tabela
   em [Arquitetura](arquitetura.md#modelo-de-dados).
