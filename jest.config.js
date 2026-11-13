export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  // DECISAO: exigir cobertura mínima — escolhido: 80% de linhas e funções; alternativas: sem limite, 90%+
  coverageThreshold: {
    global: { lines: 80, functions: 80 },
  },
};
