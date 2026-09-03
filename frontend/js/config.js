// Ruta relativa — funciona en dev y producción (backend sirve el frontend)
export const API_BASE_URL = '/api';

export const logger = {
  info: (...args) => console.log('ℹ️', ...args),
  error: (...args) => console.error('❌', ...args),
  success: (...args) => console.log('✅', ...args),
  app: {
    info: (msg) => console.log(`[APP] ${msg}`),
    error: (msg) => console.error(`[APP ERROR] ${msg}`)
  }
};
