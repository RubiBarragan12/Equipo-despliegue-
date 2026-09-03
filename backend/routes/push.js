import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import { notificarUsuario } from '../utils/pushService.js';

const router = express.Router();

// GET /api/push/vapid-key — el frontend lo necesita para suscribirse
router.get('/push/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ status: 'error', message: 'Push notifications no configuradas' });
  }
  res.json({ status: 'ok', publicKey: key });
});

// POST /api/push/subscribe — guarda o actualiza la suscripción del dispositivo
router.post('/push/subscribe', async (req, res) => {
  try {
    const { subscription, idTipoUsuario, idUsuario, idEmpresa } = req.body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ status: 'error', message: 'Suscripción inválida' });
    }
    if (!idTipoUsuario || !idUsuario) {
      return res.status(400).json({ status: 'error', message: 'idTipoUsuario e idUsuario son requeridos' });
    }

    await db.query(
      `INSERT INTO push_subscription (idtipo_usuario, idusuario, idempresa, endpoint, p256dh, auth, activo)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (endpoint) DO UPDATE SET
         idtipo_usuario  = EXCLUDED.idtipo_usuario,
         idusuario       = EXCLUDED.idusuario,
         idempresa       = EXCLUDED.idempresa,
         p256dh          = EXCLUDED.p256dh,
         auth            = EXCLUDED.auth,
         activo          = true,
         fecha_registro  = CURRENT_TIMESTAMP`,
      [idTipoUsuario, idUsuario, idEmpresa || null,
       subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    logger.app.info(`✅ Push sub registrada: tipo=${idTipoUsuario}, usuario=${idUsuario}`);
    res.json({ status: 'ok', message: 'Suscripción registrada' });
  } catch (err) {
    logger.app.error(`Error push subscribe: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Error al registrar suscripción' });
  }
});

// DELETE /api/push/unsubscribe — desactiva la suscripción (cuando el usuario revoca el permiso)
router.delete('/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ status: 'error', message: 'endpoint requerido' });
    }
    await db.query(
      `UPDATE push_subscription SET activo = false WHERE endpoint = $1`,
      [endpoint]
    );
    res.json({ status: 'ok', message: 'Suscripción desactivada' });
  } catch (err) {
    logger.app.error(`Error push unsubscribe: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Error al desactivar suscripción' });
  }
});

// GET /api/push/historial?idTipoUsuario=X&idUsuario=Y — historial de notificaciones del usuario
router.get('/push/historial', async (req, res) => {
  const { idTipoUsuario, idUsuario } = req.query;
  if (!idTipoUsuario || !idUsuario) {
    return res.status(400).json({ status: 'error', message: 'idTipoUsuario e idUsuario requeridos' });
  }
  try {
    const result = await db.query(
      `SELECT pn.idnotificacion, pn.titulo, pn.cuerpo, pn.url_destino, pn.enviada, pn.fecha_envio, pn.fecha_creacion
       FROM push_notificacion pn
       JOIN push_subscription ps ON pn.idsubscription = ps.idsubscription
       WHERE ps.idtipo_usuario = $1 AND ps.idusuario = $2
       ORDER BY pn.fecha_creacion DESC
       LIMIT 30`,
      [parseInt(idTipoUsuario), parseInt(idUsuario)]
    );
    res.json({ status: 'ok', data: result.rows });
  } catch (err) {
    logger.app.error(`Error push historial: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/push/test — envía notificación de prueba al usuario indicado
router.post('/push/test', async (req, res) => {
  const { idTipoUsuario, idUsuario } = req.body;
  if (!idTipoUsuario || !idUsuario) {
    return res.status(400).json({ status: 'error', message: 'idTipoUsuario e idUsuario requeridos' });
  }
  await notificarUsuario(parseInt(idTipoUsuario), parseInt(idUsuario), {
    titulo: '¡Push funcionando!',
    cuerpo: 'Las notificaciones push están configuradas correctamente.',
    url: '/'
  });
  res.json({ status: 'ok', message: 'Notificación de prueba enviada — revisa los logs del servidor' });
});

export default router;
