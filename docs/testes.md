# Testes

O projeto usa Jest para testes unitários e de integração. O código foi
escrito com TDD: primeiro o teste que falha, depois o código mínimo para ele
passar.

## Como rodar

| Comando                 | O que faz                                            |
| ----------------------- | ---------------------------------------------------- |
| `pnpm test`             | Roda todos os testes.                                |
| `pnpm test:unit`        | Roda só os testes unitários.                         |
| `pnpm test:integration` | Roda só os testes de integração.                     |
| `pnpm test:coverage`    | Roda tudo e gera o relatório em `coverage/`.         |

Os testes de integração precisam do banco de teste configurado. Veja
[Como executar](execucao.md#crie-os-bancos-de-dados).

O Jest roda com ES Modules nativos, por isso os scripts chamam o Jest com
`node --experimental-vm-modules`. Esse formato funciona no Linux, no macOS e
no Windows. Nos testes, importe `jest`, `test` e `expect` de `@jest/globals`.

## Estratégia

### Testes unitários (`tests/unit`)

Os testes unitários não usam banco. Cada camada recebe versões falsas das suas
dependências, criadas com `jest.fn()`. Isso é possível porque toda camada é
criada por uma função fábrica (veja [Arquitetura](arquitetura.md#injeção-de-dependências-por-fábrica)).

Eles cobrem:

- **models**: cada regra de validação e a conversão dos dados do banco.
- **services**: as regras de negócio, como 404, 409, 422 e a remoção de capas.
- **controllers**: o status e o envelope de cada resposta.
- **middlewares**: validação, filtro de upload e conversão de erros.
- **utils**: o helper de respostas e a remoção de arquivos.
- **config**: a validação das variáveis de ambiente.

### Testes de integração (`tests/integration`)

Os testes de integração sobem o app real com Supertest e usam o banco
PostgreSQL de teste. Eles cobrem os repositories (SQL de verdade) e os
endpoints de ponta a ponta.

- Antes de cada teste, as tabelas são esvaziadas com
  `TRUNCATE ... RESTART IDENTITY CASCADE`.
- Os uploads vão para uma pasta temporária, apagada no fim.
- Os testes rodam em série (`--runInBand`), porque compartilham o banco.

### Trava do banco de teste

Os testes apagam dados. Para impedir que isso aconteça no banco errado, o
helper `tests/helpers/testDb.js` só conecta se o `.env.test` tiver
`NODE_ENV=test` e um `DB_NAME` que termina em `_test`. Caso contrário, os
testes param com a mensagem
`Testes de integração exigem NODE_ENV=test e DB_NAME terminando em _test`.

## Erros conhecidos cobertos

Os testes cobrem quatro grupos de erros:

1. **Dados inválidos (400)**: campo obrigatório faltando, tipo errado (por
   exemplo, `"256"` em vez de `256`), ISBN mal formatado, ano e páginas fora
   do intervalo, JSON malformado e requisição sem corpo.
2. **Conflitos e vínculos**: ISBN duplicado no `POST` e no `PUT` (409),
   `authorId` inexistente (422), `PUT` que mantém o próprio ISBN (200) e
   exclusão de autor que apaga os livros e as capas.
3. **Não encontrado**: id inexistente (404), id não numérico ou maior que o
   limite do `INTEGER` (400) e rota inexistente (404).
4. **Upload e banco**: arquivo que não é imagem (400), arquivo grande demais
   (413), upload sem arquivo ou com o campo errado (400), upload para um livro
   inexistente (404, sem deixar arquivo no disco) e banco fora do ar (500,
   sem vazar detalhes internos).

Os testes também cobrem os casos de sucesso do CRUD, a paginação (incluindo
uma página além da última), os filtros e a busca literal de `%` e `_`.

## Cobertura

O `jest.config.js` exige no mínimo 80% de linhas e de funções. Se a
cobertura ficar abaixo disso, `pnpm test:coverage` falha.

## Como o TDD aparece no histórico

As camadas (erros, ambiente, models, middlewares, services, controllers,
repositories e o app) entraram em pares de commits: um `test:` com o teste
falhando e um `feat:` com o código que o faz passar. Para ver a sequência,
rode:

```bash
git log --oneline --reverse
```

Dois commits `test:` não têm um `feat:` logo depois: os testes de ponta a
ponta dos endpoints de livros e os de upload, cascata e banco fora do ar.
Eles testam comportamento que os testes unitários das camadas já tinham
guiado e passaram na primeira execução. Funcionam como testes de regressão
da API completa.

Depois da revisão de código, os problemas encontrados entraram da mesma forma:
um commit `test:` que reproduz cada falha e um commit `fix:` que a corrige.
