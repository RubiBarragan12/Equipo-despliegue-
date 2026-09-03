import webpush from 'web-push';
import db from '../config/db.js';
import logger from './logger.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@tattoostudio.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.app.warn('⚠️  VAPID keys no configuradas — push notifications desactivadas');
}

/**
 * Envía una notificación push a todas las suscripciones activas de un usuario.
 * idTipoUsuario: 1=Cliente, 2=Empleado/Tatuador
 * idUsuario: idCliente | idTatuador | idEmpleado (según auth.js)
 * Fire-and-forget — no lanza excepciones.
 */
export async function notificarUsuario(idTipoUsuario, idUsuario, { titulo, cuerpo, url = '/' }) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  let subs;
  try {
    const result = await db.query(
      `SELECT idsubscription, endpoint, p256dh, auth
       FROM push_subscription
       WHERE idtipo_usuario = $1 AND idusuario = $2 AND activo = true`,
      [idTipoUsuario, idUsuario]
    );
    subs = result.rows;
  } catch (err) {
    logger.app.error(`pushService: error consultando subs: ${err.message}`);
    return;
  }

  logger.app.info(`pushService: tipo=${idTipoUsuario} usuario=${idUsuario} → ${subs.length} suscripción(es) activa(s)`);
  if (!subs.length) return;

  const payload = JSON.stringify({ title: titulo, body: cuerpo, url });

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };
    try {
      await webpush.sendNotification(pushSub, payload);
      await db.query(
        `INSERT INTO push_notificacion (idsubscription, titulo, cuerpo, url_destino, enviada, fecha_envio)
         VALUES ($1, $2, $3, $4, true, NOW())`,
        [sub.idsubscription, titulo, cuerpo, url]
      );
      logger.app.info(`🔔 Push enviada → tipo=${idTipoUsuario} usuario=${idUsuario}`);
    } catch (err) {
      const code = err.statusCode || err.status;
      if (code === 410 || code === 404) {
        await db.query(
          `UPDATE push_subscription SET activo = false WHERE idsubscription = $1`,
          [sub.idsubscription]
        ).catch(() => {});
        logger.app.info(`🗑️  Sub #${sub.idsubscription} expirada — desactivada`);
      }
      await db.query(
        `INSERT INTO push_notificacion (idsubscription, titulo, cuerpo, url_destino, enviada, error, fecha_envio)
         VALUES ($1, $2, $3, $4, false, $5, NOW())`,
        [sub.idsubscription, titulo, cuerpo, url, err.message]
      ).catch(() => {});
      logger.app.error(`pushService: fallo sub #${sub.idsubscription}: ${err.message}`);
    }
  }
}
