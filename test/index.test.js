const { holaMundo } = require('../src/index');

test('Debe retornar el mensaje de Hola Mundo correctamente', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});