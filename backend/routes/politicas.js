import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/politicas
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT idpolitica, idempresa, titulo, contenido, es_activa, fecha_creacion 
      FROM politica 
      ORDER BY idpolitica DESC
    `);
    logger.app.info(`📋 Políticas obtenidas: ${result.rows.length}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error al obtener políticas: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener políticas' });
  }
});

// POST /api/politicas
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { idempresa, titulo, contenido, es_activa } = req.body;

    if (!titulo || !contenido) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'El título y el contenido son obligatorios' 
      });
    }

    await client.query('BEGIN');
    const insertQuery = `
      INSERT INTO politica (idempresa, titulo, contenido, es_activa, fecha_creacion)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      idempresa || null,
      titulo,
      contenido,
      es_activa !== undefined ? es_activa : true
    ]);

    await client.query('COMMIT');
    logger.app.info(`✅ Política creada exitosamente: ${titulo}`);
    return res.status(201).json({ status: 'success', data: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al crear política: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/politicas/:id
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { titulo, contenido, es_activa } = req.body;

    await client.query('BEGIN');
    const updateQuery = `
      UPDATE politica
      SET titulo = COALESCE($1, titulo),
          contenido = COALESCE($2, contenido),
          es_activa = COALESCE($3, es_activa)
      WHERE idpolitica = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [titulo, contenido, es_activa, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Política no encontrada' });
    }

    await client.query('COMMIT');
    logger.app.info(`🔄 Política actualizada: ID ${id}`);
    return res.json({ status: 'success', data: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/politicas/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM politica WHERE idpolitica = $1 RETURNING idpolitica', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Política no encontrada' });
    }

    logger.app.info(`🗑️ Política eliminada: ID ${id}`);
    return res.json({ status: 'success', message: 'Política eliminada correctamente' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }

  function irAEditar(id) {
    // Redirigimos a la página de edición pasando el ID por la URL
    window.location.href = `editar_politica.html?id=${id}`;
  }
});

export default router;
