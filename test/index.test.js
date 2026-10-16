const { holaMundo } = require('../src/index');

test('Verificar que tattora retorne el mensaje de Hola Mundo correctamente', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});