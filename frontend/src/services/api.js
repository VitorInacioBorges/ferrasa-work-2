import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

// Retorna os livros e os metadados da página solicitada, preservando o cancelamento da requisição.
export async function listBooks(params, signal) {
  const { data } = await api.get("/books", { params, signal });
  return { books: data.data, meta: data.meta };
}

export async function createBook(book) {
  const { data } = await api.post("/books", book);
  return data.data;
}

export async function getBook(id, signal) {
  const { data } = await api.get(`/books/${id}`, { signal });
  return data.data;
}

export async function updateBook(id, book) {
  const { data } = await api.put(`/books/${id}`, book);
  return data.data;
}

export async function deleteBook(id) {
  await api.delete(`/books/${id}`);
}

export async function uploadBookCover(id, file) {
  const form = new FormData();
  form.append("cover", file);
  await api.post(`/books/${id}/cover`, form);
}

// Reúne todas as páginas de autores para preencher as opções do filtro.
export async function listAuthors(signal) {
  const authors = [];
  let page = 1;
  let totalPages;
  do {
    const { data } = await api.get("/authors", {
      params: { page, limit: 100 },
      signal,
    });
    authors.push(...data.data);
    totalPages = data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return authors;
}

// Huehuller: Busca uma página de autores e os dados da paginação.
export async function listAuthorsPage(params, signal) {
  const { data } = await api.get("/authors", { params, signal });
  return { authors: data.data, meta: data.meta };
}

// Huehuller: Envia nome e nacionalidade e devolve o autor cadastrado.
export async function createAuthor(author) {
  const { data } = await api.post("/authors", author);
  return data.data;
}