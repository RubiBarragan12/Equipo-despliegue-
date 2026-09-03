import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Pool de conexión a PostgreSQL
 * Configurado para Supabase/Render/Heroku con SSL
 */
logger.db.info('Configurando pool de BD...');
logger.db.info(`DATABASE_URL disponible: ${process.env.DATABASE_URL ? '✅ SÍ' : '❌ NO'}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Eventos de conexión
pool.on('connect', () => {
  logger.db.info('Conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  logger.db.error({ err }, 'Error inesperado en BD');
});

// Test de conexión inicial
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.db.error({ err }, 'Error en test de conexión inicial');
  } else {
    logger.db.info('Test de conexión exitoso');
  }
});

export default {
  query: (text, params) => pool.query(text, params),
  pool: pool
};