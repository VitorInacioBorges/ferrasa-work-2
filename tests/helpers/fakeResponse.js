import { jest } from '@jest/globals';

// Imita o objeto res do Express para testar controllers e helpers sem servidor.
export function createFakeResponse() {
  const res = {
    statusCode: undefined,
    body: undefined,
    headers: {},
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  res.set = jest.fn((name, value) => {
    res.headers[name] = value;
    return res;
  });
  res.end = jest.fn(() => res);
  return res;
}
