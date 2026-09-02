import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/notificaciones?idTipoUsuario=1&idUsuario=5
router.get('/', async (req, res) => {
  const { idTipoUsuario, idUsuario } = req.query;
  if (!idTipoUsuario || !idUsuario) {
    return res.status(400).json({ status: 'error', message: 'Faltan idTipoUsuario e idUsuario' });
  }
  try {
    const result = await db.query(
      `SELECT idnotificacion, titulo, cuerpo, url_destino, leida, fecha_creacion
       FROM notificacion
       WHERE idtipousuario = $1 AND idusuario = $2
       ORDER BY fecha_creacion DESC
       LIMIT 30`,
      [parseInt(idTipoUsuario), parseInt(idUsuario)]
    );
    const noLeidas = result.rows.filter(r => !r.leida).length;
    res.json({ status: 'ok', data: result.rows, noLeidas });
  } catch (err) {
    logger.app.error(`GET /notificaciones: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PATCH /api/notificaciones/leer-todas — marcar todas como leídas
router.patch('/leer-todas', async (req, res) => {
  const { idTipoUsuario, idUsuario } = req.body;
  if (!idTipoUsuario || !idUsuario) {
    return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
  }
  try {
    await db.query(
      `UPDATE notificacion SET leida = true
       WHERE idtipousuario = $1 AND idusuario = $2 AND leida = false`,
      [parseInt(idTipoUsuario), parseInt(idUsuario)]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    logger.app.error(`PATCH /notificaciones/leer-todas: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
