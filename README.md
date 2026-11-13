# API de livros e autores

API REST para cadastrar livros e autores, pronta para ser consumida por um
front-end React. Cada livro pertence a um autor, e um autor pode ter vários
livros. A API também recebe e serve a imagem de capa de cada livro.

## Stack

- Node.js 20 ou mais novo, com ES Modules
- Express 5
- PostgreSQL com o driver `pg` (SQL escrito à mão, sem ORM)
- Zod para validação
- multer para upload de imagens
- Jest e Supertest para testes unitários e de integração

## Início rápido

Para rodar a API na sua máquina, siga estes passos. O guia completo, com os
problemas mais comuns, está em [Como executar](docs/execucao.md).

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie os bancos de desenvolvimento e de teste no seu PostgreSQL:

   ```bash
   createdb -h localhost -p 5433 -U postgres livros_dev
   createdb -h localhost -p 5433 -U postgres livros_test
   ```

3. Copie `.env.example` para `.env` e para `.env.test` e preencha os valores
   (veja [Como executar](docs/execucao.md#configure-as-variáveis-de-ambiente)).
4. Crie as tabelas nos dois bancos:

   ```bash
   pnpm db:setup
   pnpm db:setup:test
   ```

5. Suba a API e confira se ela responde:

   ```bash
   pnpm dev
   curl http://localhost:3000/api/health
   ```

## Documentação

- [Como executar](docs/execucao.md): instalação, configuração, scripts e
  problemas comuns.
- [Arquitetura](docs/arquitetura.md): camadas, caminho de uma requisição,
  modelo de dados e decisões de projeto.
- [Consumo da API](docs/api.md): endpoints, formato das respostas, erros e
  exemplos em React.
- [Testes](docs/testes.md): estratégia de testes, TDD e banco de teste.
- [Boas práticas](docs/boas-praticas.md): convenções do projeto e como
  adicionar uma nova entidade.
