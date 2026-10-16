const { holaMundo } = require('../src/index');

test('Hola Mundo bienvenido a mi prueba unitaria', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});