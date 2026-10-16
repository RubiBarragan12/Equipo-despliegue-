const { holaMundo } = require('../src/index');

test('Hola Mundo esta es una prueba unutaria', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});