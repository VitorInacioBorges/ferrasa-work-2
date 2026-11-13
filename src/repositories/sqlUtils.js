// Escapa os curingas do LIKE para o texto digitado ser buscado literalmente.
// Usado junto com "ILIKE $n ESCAPE '\'".
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function offsetOf({ page, limit }) {
  return (page - 1) * limit;
}
