import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /empresas
 * Obtener todas las empresas de tatuaje disponibles
 */
router.get('/empresas', async (req, res) => {
  try {
    logger.app.info('📋 Solicitando lista de empresas');

    const query = 'SELECT * FROM empresa ORDER BY nombre ASC';
    const result = await db.query(query);

    logger.app.info(`✅ ${result.rows.length} empresas encontradas`);

    return res.status(200).json({
      status: 'success',
      message: 'Empresas obtenidas correctamente',
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    logger.app.error(`❌ Error al obtener empresas: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener empresas',
      error: error.message
    });
  }
});

/**
 * GET /empresas/:id
 * Obtener una empresa específica por ID
 */
router.get('/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.app.info(`🔍 Buscando empresa con ID: ${id}`);

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de empresa requerido'
      });
    }

    const query = 'SELECT * FROM empresa WHERE idempresa = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      logger.app.warn(`⚠️ Empresa con ID ${id} no encontrada`);
      return res.status(404).json({
        status: 'error',
        message: 'Empresa no encontrada'
      });
    }

    logger.app.info(`✅ Empresa encontrada: ${result.rows[0].nombre}`);

    return res.status(200).json({
      status: 'success',
      message: 'Empresa obtenida correctamente',
      data: result.rows[0]
    });

  } catch (error) {
    logger.app.error(`❌ Error al obtener empresa: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener empresa',
      error: error.message
    });
  }
});

/**
 * PUT /empresas/:id/anticipo-pct
 * Actualizar el porcentaje de anticipo requerido por la empresa
 */
router.put('/empresas/:id/anticipo-pct', async (req, res) => {
  try {
    const { id } = req.params;
    const { anticipo_pct } = req.body;

    if (anticipo_pct === undefined || anticipo_pct === null) {
      return res.status(400).json({ status: 'error', message: 'anticipo_pct requerido' });
    }

    const pct = parseFloat(anticipo_pct);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ status: 'error', message: 'anticipo_pct debe ser un número entre 1 y 100' });
    }

    const result = await db.query(
      `UPDATE empresa SET anticipo_pct = $1 WHERE idempresa = $2 RETURNING idempresa, nombre, anticipo_pct`,
      [pct, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Empresa no encontrada' });
    }

    logger.app.info(`✅ Anticipo actualizado: Empresa #${id} → ${pct}%`);
    return res.json({ status: 'success', message: 'Porcentaje de anticipo actualizado', data: result.rows[0] });

  } catch (error) {
    logger.app.error(`❌ Error actualizando anticipo_pct: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al actualizar porcentaje de anticipo' });
  }
});

export default router;
