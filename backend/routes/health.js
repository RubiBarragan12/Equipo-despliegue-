import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health
 * Verificar que el servidor está funcionando
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /test-db
 * Probar conexión a la base de datos
 */
router.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as timestamp');
    
    res.json({ 
      status: 'ok',
      message: 'Conexión a base de datos exitosa',
      data: result.rows
    });
  } catch (error) {
    logger.app.error(`Error en test-db: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

/**
 * GET /debug/tables
 * Listar todas las tablas de la base de datos (para debugging)
 */
router.get('/debug/tables', async (req, res) => {
  try {
    const query = `
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `;
    const result = await db.query(query);
    
    res.json({ 
      status: 'ok',
      message: 'Tablas disponibles',
      data: result.rows
    });
  } catch (error) {
    logger.app.error(`Error en debug/tables: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

/**
 * GET /debug/cliente
 * Ver estructura de la tabla Cliente (para debugging)
 */
router.get('/debug/cliente', async (req, res) => {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Cliente'
      ORDER BY ordinal_position;
    `;
    const result = await db.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Tabla Cliente no encontrada',
        suggestion: 'Ejecuta GET /api/debug/tables para ver las tablas disponibles'
      });
    }

    res.json({ 
      status: 'ok',
      message: 'Estructura de la tabla Cliente',
      columns: result.rows
    });
  } catch (error) {
    logger.app.error(`Error en debug/cliente: ${error.message}`);
    res.status(500).json({ 
      status: 'error',
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

export default router;
