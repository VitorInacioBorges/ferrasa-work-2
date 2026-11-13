-- Schema da API de livros e autores. Pode rodar mais de uma vez (idempotente).

CREATE TABLE IF NOT EXISTS authors (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  isbn             VARCHAR(13)  NOT NULL UNIQUE,
  publication_year INTEGER      NOT NULL,
  genre            VARCHAR(100) NOT NULL,
  page_count       INTEGER      NOT NULL,
  cover_path       VARCHAR(255),
  -- Apagar um autor apaga os livros dele.
  author_id        INTEGER      NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS books_author_id_idx ON books (author_id);
