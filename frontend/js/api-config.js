// js/api-config.js
// Configuración para conectar con tu backend

// Ruta relativa — funciona en dev y producción
const API_BASE_URL = '/api';

// Logger utility
const logger = {
  app: {
    info: (msg) => console.log(`[APP] ${msg}`),
    error: (msg) => console.error(`[APP ERROR] ${msg}`)
  },
  api: {
    info: (msg) => console.log(`[API] ${msg}`),
    error: (msg) => console.error(`[API ERROR] ${msg}`)
  }
};

console.log('✅ API Config cargado');
console.log('Modo:', isDev ? 'Desarrollo' : 'Producción');
console.log('API URL:', API_BASE_URL);