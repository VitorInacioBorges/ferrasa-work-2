import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Retorna os livros e os metadados da página solicitada, preservando o cancelamento da requisição.
export async function listBooks(params, signal) {
  const { data } = await api.get('/books', { params, signal });
  return { books: data.data, meta: data.meta };
}

// Reúne todas as páginas de autores para preencher as opções do filtro.
export async function listAuthors(signal) {
  const authors = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await api.get('/authors', { params: { page, limit: 100 }, signal });
    authors.push(...data.data);
    totalPages = data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return authors;
}
