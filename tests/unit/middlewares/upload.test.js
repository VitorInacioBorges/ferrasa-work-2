import { describe, expect, jest, test } from '@jest/globals';
import { imageFileFilter } from '../../../src/middlewares/upload.js';
import { InvalidFileError } from '../../../src/errors/AppError.js';

function filter(file) {
  const cb = jest.fn();
  imageFileFilter({}, file, cb);
  return cb;
}

describe('imageFileFilter', () => {
  test.each([
    ['cover.png', 'image/png'],
    ['cover.JPG', 'image/jpeg'],
    ['cover.jpeg', 'image/jpeg'],
    ['cover.webp', 'image/webp'],
  ])('accepts %s (%s)', (originalname, mimetype) => {
    expect(filter({ originalname, mimetype })).toHaveBeenCalledWith(null, true);
  });

  test('rejects text/plain', () => {
    const cb = filter({ originalname: 'notes.txt', mimetype: 'text/plain' });

    expect(cb.mock.calls[0][0]).toBeInstanceOf(InvalidFileError);
  });

  test('rejects image/png named cover.exe', () => {
    const cb = filter({ originalname: 'cover.exe', mimetype: 'image/png' });

    expect(cb.mock.calls[0][0]).toBeInstanceOf(InvalidFileError);
  });

  test('rejects image/gif', () => {
    const cb = filter({ originalname: 'cover.gif', mimetype: 'image/gif' });

    expect(cb.mock.calls[0][0]).toBeInstanceOf(InvalidFileError);
  });
});
