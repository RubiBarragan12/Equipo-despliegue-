import webpush from 'web-push';
import db from '../config/db.js';
import logger from './logger.js';

// ── VAPID setup ──────────────────────────────────────────────────────────────
const VAPID_OK = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (VAPID_OK) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@tattoostudio.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  logger.app.info('✅ VAPID configurado — push notifications activas');
} else {
  logger.app.warn('⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no definidas → push DESACTIVADO');
}

// ── notificarUsuario ─────────────────────────────────────────────────────────
/**
 * Envía push a todos los dispositivos activos del usuario.
 * idTipoUsuario: 1=Cliente, 2=Empleado/Tatuador
 * idUsuario: idCliente | idEmpleado (según pushService)
 */
export async function notificarUsuario(idTipoUsuario, idUsuario, { titulo, cuerpo, url = '/' }) {
  if (!VAPID_OK) {
    logger.app.warn(`pushService: VAPID no configurado — omitiendo tipo=${idTipoUsuario} usuario=${idUsuario}`);
    return;
  }

  // 1. Buscar suscripciones activas
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
    logger.app.error(`pushService: error al consultar push_subscription → ${err.message}`);
    return;
  }

  logger.app.info(`pushService: tipo=${idTipoUsuario} usuario=${idUsuario} → ${subs.length} suscripción(es)`);
  if (!subs.length) return;

  const payload = JSON.stringify({ title: titulo, body: cuerpo, url });

  for (const sub of subs) {
    const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    let enviada = false;
    let errorMsg = null;

    // 2. Intentar enviar
    try {
      await webpush.sendNotification(pushSub, payload);
      enviada = true;
      logger.app.info(`🔔 Push enviada → sub #${sub.idsubscription}`);
    } catch (err) {
      const code = err.statusCode ?? err.status ?? 0;
      errorMsg = `HTTP ${code}: ${err.message}`;
      logger.app.error(`pushService: fallo envío sub #${sub.idsubscription} → ${errorMsg}`);

      // Desactivar subs expiradas/inválidas
      if (code === 410 || code === 404) {
        try {
          await db.query(`UPDATE push_subscription SET activo = false WHERE idsubscription = $1`, [sub.idsubscription]);
          logger.app.info(`🗑️  Sub #${sub.idsubscription} desactivada (endpoint inválido)`);
        } catch (e) {
          logger.app.error(`pushService: error desactivando sub → ${e.message}`);
        }
      }
    }

    // 3. Registrar en historial (siempre, éxito o fallo)
    try {
      await db.query(
        `INSERT INTO push_notificacion (idsubscription, titulo, cuerpo, url_destino, enviada, error, fecha_envio)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sub.idsubscription, titulo, cuerpo, url, enviada, errorMsg]
      );
    } catch (dbErr) {
      logger.app.error(`pushService: error al insertar en push_notificacion → ${dbErr.message}`);
      logger.app.error('  → ¿Existe la tabla push_notificacion? Ejecuta el SQL del README.');
    }
  }
}
