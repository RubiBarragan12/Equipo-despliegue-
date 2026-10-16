const { holaMundo } = require('../src/index');

test('Hola Mundoooo', () => {
  expect(holaMundo()).toBe("Hola Mundo - Tattoora API");
});