import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFileStorage } from '../../../src/utils/fileStorage.js';

let rootDir;

beforeAll(async () => {
  rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'livros-storage-'));
  await fs.mkdir(path.join(rootDir, 'books'));
});

afterAll(async () => {
  await fs.rm(rootDir, { recursive: true, force: true });
});

const exists = (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

describe('fileStorage.remove', () => {
  test('removes an existing file', async () => {
    const file = path.join(rootDir, 'books', 'a.jpg');
    await fs.writeFile(file, 'x');
    const storage = createFileStorage({ rootDir, logger: { error: jest.fn() } });

    await storage.remove('books/a.jpg');

    expect(await exists(file)).toBe(false);
  });

  test('ignores missing file silently', async () => {
    const logger = { error: jest.fn() };
    const storage = createFileStorage({ rootDir, logger });

    await expect(storage.remove('books/missing.jpg')).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('logs other errors without throwing', async () => {
    await fs.mkdir(path.join(rootDir, 'books', 'folder.jpg'));
    const logger = { error: jest.fn() };
    const storage = createFileStorage({ rootDir, logger });

    await expect(storage.remove('books/folder.jpg')).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test('ignores null', async () => {
    const logger = { error: jest.fn() };
    const storage = createFileStorage({ rootDir, logger });

    await expect(storage.remove(null)).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
