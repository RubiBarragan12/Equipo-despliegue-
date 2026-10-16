const { holaMundo } = require('../src/index');

test('Hola Mundo esta es mi prueba unitaria', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});