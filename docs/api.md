# Consumo da API

Este guia descreve cada endpoint, o formato das respostas, os erros possíveis
e como chamar a API a partir de um front-end React.

Todos os endpoints ficam sob o prefixo `/api`. Nos exemplos, a API roda em
`http://localhost:3000`.

## Formato das respostas

Toda resposta usa o mesmo envelope JSON, então o front-end sempre sabe onde
encontrar os dados.

Uma resposta de sucesso tem `success: true` e os dados em `data`:

```json
{ "success": true, "data": { "id": 1, "name": "Machado de Assis" } }
```

As listagens também trazem `meta`, com os dados da paginação:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Uma resposta de erro tem `success: false` e o objeto `error`. O campo
`details` só aparece em erros de validação e lista cada campo com problema:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      {
        "field": "isbn",
        "message": "ISBN deve ter 10 ou 13 caracteres (dígitos, e X no final do ISBN-10)"
      }
    ]
  }
}
```

Respostas `204 No Content` não têm corpo.

## Formato dos dados

Os campos usam `camelCase`. As datas vêm em ISO 8601 (UTC).

### Autor

```json
{
  "id": 1,
  "name": "Machado de Assis",
  "nationality": "Brasileira",
  "createdAt": "2026-11-13T00:35:07.892Z",
  "updatedAt": "2026-11-13T00:35:07.892Z"
}
```

### Livro

Todo livro traz o autor embutido em `author`, então você não precisa de uma
segunda chamada para mostrar o nome do autor. O campo `coverUrl` é uma URL
completa, pronta para um `<img src>`, ou `null` quando o livro não tem capa.

```json
{
  "id": 1,
  "title": "Dom Casmurro",
  "isbn": "9788535910663",
  "publicationYear": 1899,
  "genre": "Romance",
  "pageCount": 256,
  "author": { "id": 1, "name": "Machado de Assis" },
  "coverUrl": "http://localhost:3000/uploads/books/63bd14e5-8093-459e-826f-2362ad8b7301.png",
  "createdAt": "2026-11-13T00:35:07.918Z",
  "updatedAt": "2026-11-13T00:35:07.980Z"
}
```

### Regras de validação

Ao criar ou atualizar, envie o corpo em JSON com o header
`Content-Type: application/json`. Campos desconhecidos são ignorados, e textos
têm os espaços das pontas removidos.

| Campo             | Regra                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| `name`            | Texto de 1 a 150 caracteres.                                            |
| `nationality`     | Texto de 2 a 100 caracteres.                                            |
| `title`           | Texto de 1 a 255 caracteres.                                            |
| `isbn`            | 10 caracteres (9 dígitos + dígito ou `X`) ou 13 dígitos. Hífens e espaços são aceitos e removidos. |
| `publicationYear` | Número inteiro de 1450 até o ano atual.                                 |
| `genre`           | Texto de 1 a 100 caracteres.                                            |
| `pageCount`       | Número inteiro de 1 a 10000.                                            |
| `authorId`        | Número inteiro positivo de um autor que existe.                         |

Os campos numéricos precisam ser números no JSON. O valor `"256"` (texto)
gera um erro 400. Em formulários React, converta o valor com `Number()` antes
de enviar.

A API só confere o formato do ISBN, não o dígito verificador.

## Paginação e filtros

As listagens aceitam estes parâmetros na query string:

| Parâmetro | Padrão | Regra                     |
| --------- | ------ | ------------------------- |
| `page`    | `1`    | Inteiro a partir de 1.    |
| `limit`   | `10`   | Inteiro de 1 a 100.       |

Valores fora dessas regras geram um erro 400. Uma página além da última
devolve `data: []`, com o `meta.total` real.

Os filtros de texto (`name`, `title` e `genre`) buscam trechos do texto, sem
diferenciar maiúsculas de minúsculas. Os caracteres `%` e `_` são buscados
literalmente. O filtro `authorId` busca o valor exato.

As listas vêm em ordem alfabética (autores por nome, livros por título).

## Endpoints

### Saúde

| Método | Caminho       | Resposta                                       |
| ------ | ------------- | ---------------------------------------------- |
| `GET`  | `/api/health` | `200` com `{ "status": "ok" }` em `data`.      |

### Autores

| Método   | Caminho                  | Corpo        | Sucesso                    | Erros              |
| -------- | ------------------------ | ------------ | -------------------------- | ------------------ |
| `GET`    | `/api/authors`           | —            | `200` com `meta`           | `400`              |
| `GET`    | `/api/authors/:id`       | —            | `200`                      | `400`, `404`       |
| `GET`    | `/api/authors/:id/books` | —            | `200` com `meta`           | `400`, `404`       |
| `POST`   | `/api/authors`           | autor        | `201` com header `Location` | `400`             |
| `PUT`    | `/api/authors/:id`       | autor        | `200`                      | `400`, `404`       |
| `DELETE` | `/api/authors/:id`       | —            | `204`                      | `400`, `404`       |

- `GET /api/authors` aceita `page`, `limit` e o filtro `name`.
- `GET /api/authors/:id/books` aceita `page` e `limit`.
- `PUT` substitui todos os campos: envie o autor completo.
- `DELETE` apaga o autor, todos os livros dele e as capas desses livros. Não
  há como desfazer.

Exemplo de criação:

```bash
curl -i -X POST http://localhost:3000/api/authors \
  -H "Content-Type: application/json" \
  -d '{"name":"Machado de Assis","nationality":"Brasileira"}'
```

```
HTTP/1.1 201 Created
Location: /api/authors/1

{"success":true,"data":{"id":1,"name":"Machado de Assis","nationality":"Brasileira","createdAt":"2026-11-13T00:35:07.892Z","updatedAt":"2026-11-13T00:35:07.892Z"}}
```

### Livros

| Método   | Caminho                | Corpo     | Sucesso                     | Erros                     |
| -------- | ---------------------- | --------- | --------------------------- | ------------------------- |
| `GET`    | `/api/books`           | —         | `200` com `meta`            | `400`                     |
| `GET`    | `/api/books/:id`       | —         | `200`                       | `400`, `404`              |
| `POST`   | `/api/books`           | livro     | `201` com header `Location` | `400`, `409`, `422`       |
| `PUT`    | `/api/books/:id`       | livro     | `200`                       | `400`, `404`, `409`, `422` |
| `DELETE` | `/api/books/:id`       | —         | `204`                       | `400`, `404`              |
| `POST`   | `/api/books/:id/cover` | multipart | `200` com o livro           | `400`, `404`, `413`       |

- `GET /api/books` aceita `page`, `limit` e os filtros `title`, `genre` e
  `authorId`. Um `authorId` sem livros devolve uma lista vazia, não um 404.
  Filtros vazios, como `?authorId=` vindo de um formulário com "todos os
  autores", são ignorados.
- `PUT` substitui todos os campos: envie o livro completo. O livro pode
  manter o próprio ISBN; o erro 409 só acontece se o ISBN for de outro livro.
- `DELETE` também apaga a capa do disco.

Exemplo de criação:

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Dom Casmurro","isbn":"978-85-359-1066-3","publicationYear":1899,"genre":"Romance","pageCount":256,"authorId":1}'
```

Exemplo de listagem com filtro:

```bash
curl "http://localhost:3000/api/books?title=dom&page=1&limit=10"
```

### Capa do livro

Para enviar a capa, use `multipart/form-data` com o arquivo no campo `cover`.

- Formatos aceitos: JPEG, PNG e WEBP (extensões `.jpg`, `.jpeg`, `.png` e
  `.webp`).
- Tamanho máximo: o valor de `MAX_UPLOAD_SIZE_MB` (2 MB por padrão).
- Enviar uma nova capa substitui a anterior e apaga o arquivo antigo.

```bash
curl -X POST http://localhost:3000/api/books/1/cover \
  -F "cover=@capa.png;type=image/png"
```

A resposta traz o livro atualizado, com a nova `coverUrl`.

## Erros

| Status | `code`                | Quando acontece                                                  |
| ------ | --------------------- | ---------------------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`    | Corpo, id ou query string inválidos. Veja `details`.             |
| `400`  | `INVALID_JSON`        | O corpo não é um JSON válido.                                    |
| `400`  | `INVALID_FILE`        | Upload sem arquivo, com formato não aceito, fora do campo `cover` ou com corpo multipart malformado. |
| `400`  | `BAD_REQUEST`         | Requisição malformada, como um caractere mal codificado na URL.  |
| `404`  | `NOT_FOUND`           | O autor ou o livro não existe.                                   |
| `404`  | `ROUTE_NOT_FOUND`     | O caminho não existe na API.                                     |
| `409`  | `ISBN_ALREADY_EXISTS` | O ISBN já pertence a outro livro.                                |
| `413`  | `FILE_TOO_LARGE`      | A imagem passa do tamanho máximo.                                |
| `413`  | `PAYLOAD_TOO_LARGE`   | O corpo JSON passa de 100 KB.                                    |
| `415`  | `UNSUPPORTED_MEDIA_TYPE` | O corpo usa um charset não suportado (use UTF-8).             |
| `422`  | `AUTHOR_NOT_FOUND`    | O `authorId` enviado não corresponde a nenhum autor.             |
| `500`  | `INTERNAL_ERROR`      | Erro inesperado, como o banco fora do ar. Os detalhes ficam só no log do servidor. |

## Exemplos em React

Os exemplos usam `fetch` e uma constante com o endereço da API.

```jsx
const API_URL = 'http://localhost:3000/api';

// Lança um erro com a mensagem da API quando success for false.
async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (response.status === 204) return null;

  const body = await response.json();
  if (!body.success) {
    const error = new Error(body.error.message);
    error.code = body.error.code;
    error.details = body.error.details ?? [];
    throw error;
  }
  return body;
}
```

### Listar livros com paginação

```jsx
import { useEffect, useState } from 'react';

function BookList({ page }) {
  const [books, setBooks] = useState([]);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    request(`/books?page=${page}&limit=10`).then((body) => {
      setBooks(body.data);
      setMeta(body.meta);
    });
  }, [page]);

  return (
    <>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            {book.coverUrl && <img src={book.coverUrl} alt={`Capa de ${book.title}`} />}
            {book.title} ({book.author.name})
          </li>
        ))}
      </ul>
      {meta && <p>Página {meta.page} de {meta.totalPages}</p>}
    </>
  );
}
```

### Criar um livro e mostrar os erros por campo

```jsx
async function createBook(form) {
  try {
    const body = await request('/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        isbn: form.isbn,
        genre: form.genre,
        // Inputs de formulário devolvem texto; a API exige números.
        publicationYear: Number(form.publicationYear),
        pageCount: Number(form.pageCount),
        authorId: Number(form.authorId),
      }),
    });
    return body.data;
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      // Por exemplo, { title: 'Demasiado pequeno: ...' } para mostrar ao lado de cada input.
      return { fieldErrors: Object.fromEntries(error.details.map((d) => [d.field, d.message])) };
    }
    throw error;
  }
}
```

### Enviar a capa com `FormData`

Cadastre o livro primeiro e envie a capa depois, com o `id` que a criação
devolveu. Não defina o header `Content-Type`: o navegador monta o
`multipart/form-data` sozinho.

```jsx
async function uploadCover(bookId, file) {
  const formData = new FormData();
  formData.append('cover', file);

  const body = await request(`/books/${bookId}/cover`, {
    method: 'POST',
    body: formData,
  });
  return body.data.coverUrl;
}

// Uso com um <input type="file" accept="image/png,image/jpeg,image/webp" />
// uploadCover(book.id, event.target.files[0]);
```

### CORS

A API libera a origem definida em `CORS_ORIGIN` (`http://localhost:5173`,
porta padrão do Vite). Se o seu front-end roda em outra porta, altere essa
variável no `.env` e reinicie a API.
