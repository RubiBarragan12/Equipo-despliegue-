const { holaMundo } = require('../src/index');

test('Hola Mundo Bienvenido a mi prueba unitaria', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});