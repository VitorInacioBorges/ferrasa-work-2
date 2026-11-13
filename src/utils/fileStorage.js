import fs from 'node:fs/promises';
import path from 'node:path';

// Remove arquivos de capa sem nunca derrubar a requisição:
// arquivo que já não existe é ignorado; outros erros de disco vão só para o log.
export function createFileStorage({ rootDir, logger = console }) {
  return {
    async remove(relativePath) {
      if (!relativePath) return;

      try {
        await fs.unlink(path.join(rootDir, relativePath));
      } catch (err) {
        if (err.code !== 'ENOENT') logger.error(err);
      }
    },
  };
}
