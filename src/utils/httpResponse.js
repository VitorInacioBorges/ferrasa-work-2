// Helper de respostas: todo controller responde por aqui, para o front
// receber sempre o mesmo envelope { success, data, meta? }.

export function ok(res, data) {
  return res.status(200).json({ success: true, data });
}

export function created(res, data, location) {
  // DECISAO: informar onde o recurso criado mora — escolhido: header Location no 201; alternativas: só o corpo com o id
  res.set('Location', location);
  return res.status(201).json({ success: true, data });
}

export function paginated(res, data, meta) {
  return res.status(200).json({ success: true, data, meta });
}

export function noContent(res) {
  return res.status(204).end();
}

export function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
