# Como executar

Este guia mostra como instalar, configurar e rodar a API e os testes na sua
máquina.

## Pré-requisitos

Antes de começar, instale:

- Node.js 20 ou mais novo (o projeto usa `node --watch` e ES Modules).
- pnpm. A versão fica fixada no `package.json`, e o pnpm baixa a versão certa
  sozinho.
- PostgreSQL rodando localmente, com um usuário que possa criar bancos.

Os exemplos usam o PostgreSQL na porta `5433`. A porta padrão do PostgreSQL é
`5432`; se a sua instalação usa outra porta, troque o número nos comandos e no
`.env`. Para descobrir a porta, rode `pg_isready`.

## Instale as dependências

Na raiz do projeto, rode:

```bash
pnpm install
```

## Crie os bancos de dados

A API usa dois bancos: um para desenvolvimento e outro só para os testes de
integração. Os testes apagam os dados das tabelas, então nunca aponte o banco
de teste para dados que você quer manter.

1. Crie o banco de desenvolvimento:

   ```bash
   createdb -h localhost -p 5433 -U postgres livros_dev
   ```

2. Crie o banco de teste. O nome precisa terminar em `_test`:

   ```bash
   createdb -h localhost -p 5433 -U postgres livros_test
   ```

Se preferir, crie os bancos pelo pgAdmin ou pelo `psql`.

## Configure as variáveis de ambiente

Os dados sensíveis, como a senha do banco, ficam em arquivos `.env`, que o git
ignora. O arquivo `.env.example` é o modelo versionado.

1. Copie o modelo para os dois arquivos:

   ```bash
   cp .env.example .env
   cp .env.example .env.test
   ```

2. No `.env`, preencha `DB_USER` e `DB_PASSWORD`.
3. No `.env.test`, preencha os mesmos campos e altere estes valores:

   ```
   NODE_ENV=test
   PORT=3001
   PUBLIC_URL=http://localhost:3001
   DB_NAME=livros_test
   ```

A tabela abaixo descreve cada variável.

| Variável             | Obrigatória | Padrão                  | Para que serve                                    |
| -------------------- | ----------- | ----------------------- | ------------------------------------------------- |
| `NODE_ENV`           | Não         | `development`           | Ambiente: `development`, `test` ou `production`.  |
| `PORT`               | Não         | `3000`                  | Porta HTTP da API.                                |
| `PUBLIC_URL`         | Sim         | —                       | Endereço público da API, usado na `coverUrl`.     |
| `CORS_ORIGIN`        | Não         | `http://localhost:5173` | Origem do front-end liberada no CORS.             |
| `DB_HOST`            | Sim         | —                       | Host do PostgreSQL.                               |
| `DB_PORT`            | Sim         | —                       | Porta do PostgreSQL.                              |
| `DB_USER`            | Sim         | —                       | Usuário do PostgreSQL.                            |
| `DB_PASSWORD`        | Sim         | —                       | Senha do PostgreSQL.                              |
| `DB_NAME`            | Sim         | —                       | Nome do banco.                                    |
| `UPLOAD_DIR`         | Não         | `uploads`               | Pasta onde as capas são gravadas.                 |
| `MAX_UPLOAD_SIZE_MB` | Não         | `2`                     | Tamanho máximo de uma capa, em megabytes.         |

Se faltar uma variável obrigatória, a API não sobe e mostra uma mensagem que
começa com `Variáveis de ambiente inválidas:` e cita cada chave com problema.

## Crie as tabelas

O script `db:setup` aplica o arquivo `database/schema.sql` no banco
configurado. Ele pode rodar mais de uma vez sem erro.

```bash
pnpm db:setup
pnpm db:setup:test
```

A saída esperada é `Schema aplicado em livros_dev` e
`Schema aplicado em livros_test`.

## Rode a API

Para desenvolver, use o modo que reinicia sozinho a cada alteração:

```bash
pnpm dev
```

Para rodar sem reinício automático, use:

```bash
pnpm start
```

A API mostra `API ouvindo em http://localhost:3000`. Para confirmar que ela
responde, rode:

```bash
curl http://localhost:3000/api/health
```

A resposta esperada é `{"success":true,"data":{"status":"ok"}}`.

## Rode os testes

Os testes de integração usam o banco configurado em `.env.test`.

| Comando                 | O que faz                                            |
| ----------------------- | ---------------------------------------------------- |
| `pnpm test`             | Roda todos os testes.                                |
| `pnpm test:unit`        | Roda só os testes unitários (não precisam de banco). |
| `pnpm test:integration` | Roda só os testes de integração.                     |
| `pnpm test:coverage`    | Roda tudo e gera o relatório de cobertura.           |

O relatório de cobertura fica na pasta `coverage/`. O comando falha se a
cobertura de linhas ou de funções ficar abaixo de 80%.

## Problemas comuns

**`connect ECONNREFUSED 127.0.0.1:5433`.** O PostgreSQL não está rodando ou
usa outra porta. Rode `pg_isready` para ver a porta certa e corrija `DB_PORT`.

**`password authentication failed for user`.** O usuário ou a senha no `.env`
estão errados. Teste os mesmos dados com
`psql -h localhost -p 5433 -U postgres`.

**`database "livros_dev" does not exist`.** O banco não foi criado. Volte para
[Crie os bancos de dados](#crie-os-bancos-de-dados).

**`relation "authors" does not exist`.** As tabelas não foram criadas. Rode
`pnpm db:setup` (ou `pnpm db:setup:test` para o banco de teste).

**`Testes de integração exigem NODE_ENV=test e DB_NAME terminando em _test`.**
Essa trava protege seus dados. Confira se o `.env.test` tem `NODE_ENV=test` e
um `DB_NAME` que termina em `_test`.

**`ERR_PNPM_IGNORED_BUILDS` no `pnpm install`.** O arquivo
`pnpm-workspace.yaml` já desliga o build opcional que causa esse erro. Confira
se o arquivo existe na raiz do projeto.
