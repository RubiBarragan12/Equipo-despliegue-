import express from 'express';
import Stripe from 'stripe';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import { crearNotificacion } from '../utils/notificaciones.js';

const router = express.Router();

// Inicialización lazy para no crashear el servidor si la variable no está configurada aún
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no configurado en variables de entorno');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAnticipoPct(idCotizacion) {
  const res = await db.query(
    `SELECT COALESCE(emp.anticipo_pct, 50) AS anticipo_pct
     FROM cotizacion co
     JOIN cita c ON co.idcita = c.idcita
     JOIN tatuador t ON c.idtatuador = t.idtatuador
     JOIN empleado e ON t.idempleado = e.idempleado
     JOIN empresa emp ON e.idempresa = emp.idempresa
     WHERE co.idcotizacion = $1`,
    [idCotizacion]
  );
  return res.rows.length > 0 ? parseFloat(res.rows[0].anticipo_pct) : 50;
}

// Consulta cuánto pagó realmente el cliente de anticipo (inmune a cambios posteriores de anticipo_pct)
async function getAnticipoPagado(idCotizacion) {
  const res = await db.query(
    `SELECT COALESCE(SUM(p.monto), 0) AS anticipo_pagado
     FROM pago p
     JOIN tipo_pagos tp ON p.idtipo_pagos = tp.idtipo_pagos
     WHERE p.idcotizacion = $1
     AND LOWER(tp.nombre) = 'anticipo'`,
    [idCotizacion]
  );
  return parseFloat(res.rows[0]?.anticipo_pagado || 0);
}

// Lógica compartida entre webhook y confirmación en efectivo
async function procesarPagoConfirmado(client, { idCotizacion, tipo, monto, stripePaymentIntentId = null }) {
  const cotRes = await client.query(
    `SELECT co.*, c.idcita, c.idtatuador, c.idcliente
     FROM cotizacion co JOIN cita c ON co.idcita = c.idcita
     WHERE co.idcotizacion = $1`,
    [idCotizacion]
  );
  if (cotRes.rows.length === 0) throw new Error(`Cotización #${idCotizacion} no encontrada`);
  const cot = cotRes.rows[0];

  const isAnticipo = tipo === 'anticipo';

  // Actualizar estado de cotización
  const statusNombre = isAnticipo ? 'pagado anticipo' : 'pagada';
  const statusRes = await client.query(
    `SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = $1`,
    [statusNombre]
  );
  if (statusRes.rows.length > 0) {
    await client.query(
      `UPDATE cotizacion SET idstatus = $1 WHERE idcotizacion = $2`,
      [statusRes.rows[0].idstatus, idCotizacion]
    );
  }

  // Si es anticipo: confirmar la cita
  if (isAnticipo) {
    const confRes = await client.query(
      `SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'confirmada'`
    );
    if (confRes.rows.length > 0) {
      await client.query(
        `UPDATE cita SET idstatus_cita = $1 WHERE idcita = $2`,
        [confRes.rows[0].idstatus_cita, cot.idcita]
      );
    }
  }

  // Método de pago
  const metodoNombre = stripePaymentIntentId ? 'tarjeta' : 'efectivo';
  let metodoPago = await client.query(
    `SELECT idmetodo FROM metodos_pagos WHERE LOWER(nombre) = $1 LIMIT 1`,
    [metodoNombre]
  );
  if (metodoPago.rows.length === 0) {
    metodoPago = await client.query(
      `INSERT INTO metodos_pagos (nombre) VALUES ($1) RETURNING idmetodo`,
      [metodoNombre === 'tarjeta' ? 'Tarjeta' : 'Efectivo']
    );
  }

  // Tipo de pago: Anticipo o Liquidacion
  const tipoNombre = isAnticipo ? 'anticipo' : 'liquidacion';
  let tipoPago = await client.query(
    `SELECT idtipo_pagos FROM tipo_pagos WHERE LOWER(nombre) = $1 LIMIT 1`,
    [tipoNombre]
  );
  if (tipoPago.rows.length === 0) {
    tipoPago = await client.query(
      `INSERT INTO tipo_pagos (nombre) VALUES ($1) RETURNING idtipo_pagos`,
      [isAnticipo ? 'Anticipo' : 'Liquidacion']
    );
  }

  await client.query(
    `INSERT INTO pago (idmetodo, idtipo_pagos, idcotizacion, idcita, monto, stripe_payment_intent_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      metodoPago.rows[0].idmetodo,
      tipoPago.rows[0].idtipo_pagos,
      parseInt(idCotizacion),
      cot.idcita,
      monto,
      stripePaymentIntentId,
    ]
  );

  // Crear seguimiento solo al confirmar el anticipo
  if (isAnticipo) {
    const existente = await client.query(
      `SELECT idseguimiento FROM seguimiento WHERE idcita = $1`,
      [cot.idcita]
    );
    if (existente.rows.length === 0) {
      const segResult = await client.query(
        `INSERT INTO seguimiento (idcliente, idcita, idtatuador, estadocicatrizacion, estadoseguimiento, fechainicio)
         VALUES ($1, $2, $3, 'Curación Normal', 'Activo', CURRENT_DATE)
         RETURNING idseguimiento`,
        [cot.idcliente, cot.idcita, cot.idtatuador]
      );
      try {
        await client.query(
          `INSERT INTO chat_seguimiento (idseguimiento, idtipo_emisor, mensaje, fecha_envio)
           VALUES ($1, 2, '🎉 ¡Tu cita ha sido confirmada! Este es el chat de seguimiento. Aquí podrás compartir fotos de tu proceso de curación y recibir indicaciones de tu tatuador.', NOW())`,
          [segResult.rows[0].idseguimiento]
        );
      } catch (_) {}
    }
  }

  // Notificar al cliente (fire-and-forget, fuera de la transacción)
  setImmediate(() => {
    crearNotificacion(1, cot.idcliente, {
      titulo: isAnticipo ? '¡Anticipo pagado! Cita confirmada' : '¡Pago completo!',
      cuerpo: isAnticipo
        ? 'Tu cita está confirmada. El saldo restante se paga el día del tatuaje.'
        : '¡Tu tatuaje está totalmente pagado! Nos vemos en la cita.',
      url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
    });
  });

  return cot;
}

// ─── Checkout: Anticipo ──────────────────────────────────────────────────────

router.post('/checkout', async (req, res) => {
  const { idCotizacion } = req.body;
  if (!idCotizacion) return res.status(400).json({ status: 'error', message: 'idCotizacion requerido' });

  try {
    const cotRes = await db.query(
      `SELECT co.idcotizacion, co.preciofinal, co.montoestimado,
              sc.nombre AS estado,
              c.fecha, c.hora,
              e.nombre AS tatuador_nombre,
              cl.correo AS cliente_correo
       FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN cita c ON co.idcita = c.idcita
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       JOIN empleado e ON t.idempleado = e.idempleado
       JOIN cliente cl ON c.idcliente = cl.idcliente
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );

    if (cotRes.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    const cot = cotRes.rows[0];
    const estadoLower = (cot.estado || '').toLowerCase();

    if (estadoLower === 'pagado anticipo' || estadoLower === 'pagada') {
      return res.status(400).json({ status: 'error', message: 'Esta cotización ya tiene anticipo registrado' });
    }

    const precioTotal = parseFloat(cot.preciofinal || cot.montoestimado || 0);
    if (precioTotal <= 0) return res.status(400).json({ status: 'error', message: 'Precio no válido' });

    const anticipoPct = await getAnticipoPct(idCotizacion);
    const anticipoCentavos = Math.round(precioTotal * (anticipoPct / 100) * 100);

    const fechaFmt = cot.fecha
      ? new Date(cot.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: `Anticipo de reserva (${anticipoPct}%) — Tatuaje`,
            description: `Con ${cot.tatuador_nombre} · ${fechaFmt}${cot.hora ? ' ' + cot.hora.substring(0, 5) : ''}`,
          },
          unit_amount: anticipoCentavos,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: cot.cliente_correo || undefined,
      success_url: `${req.protocol}://${req.get('host')}/pages/cliente/cotizacion/pago_exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/pages/cliente/cotizacion/pagar_stripe_cotizacion.html`,
      metadata: { idCotizacion: idCotizacion.toString(), tipo: 'anticipo' },
    });

    await db.query(
      `UPDATE cotizacion SET stripe_session_id = $1 WHERE idcotizacion = $2`,
      [session.id, idCotizacion]
    );

    logger.app.info(`💳 Anticipo Checkout ${session.id} — Cotización #${idCotizacion} — $${(anticipoCentavos / 100).toFixed(2)} MXN`);
    return res.json({ status: 'ok', url: session.url, anticipoPct, precioTotal });

  } catch (error) {
    logger.app.error(`Error checkout anticipo: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al crear sesión de pago' });
  }
});

// ─── Checkout: Liquidación ───────────────────────────────────────────────────

router.post('/checkout-liquidacion', async (req, res) => {
  const { idCotizacion } = req.body;
  if (!idCotizacion) return res.status(400).json({ status: 'error', message: 'idCotizacion requerido' });

  try {
    const cotRes = await db.query(
      `SELECT co.idcotizacion, co.preciofinal, co.montoestimado,
              sc.nombre AS estado,
              c.fecha, c.hora,
              e.nombre AS tatuador_nombre,
              cl.correo AS cliente_correo
       FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN cita c ON co.idcita = c.idcita
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       JOIN empleado e ON t.idempleado = e.idempleado
       JOIN cliente cl ON c.idcliente = cl.idcliente
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );

    if (cotRes.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    const cot = cotRes.rows[0];

    if ((cot.estado || '').toLowerCase() !== 'pagado anticipo') {
      return res.status(400).json({ status: 'error', message: 'La cotización debe tener el anticipo pagado primero' });
    }

    const precioTotal = parseFloat(cot.preciofinal || cot.montoestimado || 0);
    const anticipoPagado = await getAnticipoPagado(idCotizacion);
    const liquidacion = Math.round((precioTotal - anticipoPagado) * 100) / 100;
    if (liquidacion <= 0) {
      return res.status(400).json({ status: 'error', message: 'La cotización no tiene saldo pendiente' });
    }
    const liquidacionCentavos = Math.round(liquidacion * 100);

    const fechaFmt = cot.fecha
      ? new Date(cot.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: 'Liquidación de Tatuaje',
            description: `Con ${cot.tatuador_nombre} · ${fechaFmt}${cot.hora ? ' ' + cot.hora.substring(0, 5) : ''}`,
          },
          unit_amount: liquidacionCentavos,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: cot.cliente_correo || undefined,
      success_url: `${req.protocol}://${req.get('host')}/pages/cliente/cotizacion/pago_exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/pages/cliente/cotizacion/pagar_stripe_cotizacion.html`,
      metadata: { idCotizacion: idCotizacion.toString(), tipo: 'liquidacion' },
    });

    await db.query(
      `UPDATE cotizacion SET stripe_session_id = $1 WHERE idcotizacion = $2`,
      [session.id, idCotizacion]
    );

    logger.app.info(`💳 Liquidación Checkout ${session.id} — Cotización #${idCotizacion} — $${(liquidacionCentavos / 100).toFixed(2)} MXN`);
    return res.json({ status: 'ok', url: session.url });

  } catch (error) {
    logger.app.error(`Error checkout liquidacion: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al crear sesión de liquidación' });
  }
});

// ─── Webhook Stripe ──────────────────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.app.error('STRIPE_WEBHOOK_SECRET no configurado');
    return res.status(500).send('Webhook secret no configurado');
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.app.error(`Webhook signature inválida: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type !== 'checkout.session.completed') return res.json({ received: true });

  const session = event.data.object;
  const { idCotizacion, tipo } = session.metadata || {};

  if (!idCotizacion || !tipo) {
    logger.app.error('Webhook: metadata incompleta (idCotizacion o tipo faltante)');
    return res.json({ received: true });
  }

  const monto = (session.amount_total || 0) / 100;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await procesarPagoConfirmado(client, {
      idCotizacion,
      tipo,
      monto,
      stripePaymentIntentId: session.payment_intent,
    });
    await client.query('COMMIT');
    logger.app.info(`✅ Webhook pago ${tipo} confirmado — Cotización #${idCotizacion} — $${monto} MXN`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error en webhook: ${error.message}`);
  } finally {
    client.release();
  }

  return res.json({ received: true });
});

// ─── Info de montos reales de una cotización (para mostrar en la UI antes de pagar) ─

router.get('/info/:idCotizacion', async (req, res) => {
  const { idCotizacion } = req.params;
  try {
    const cotRes = await db.query(
      `SELECT co.preciofinal, co.montoestimado, sc.nombre AS estado
       FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );
    if (!cotRes.rows.length) return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });

    const cot         = cotRes.rows[0];
    const precioTotal = parseFloat(cot.preciofinal || cot.montoestimado || 0);
    const anticipoPct = await getAnticipoPct(idCotizacion);
    const anticipoPagado     = await getAnticipoPagado(idCotizacion);
    const montoAnticipo      = Math.round(precioTotal * (anticipoPct / 100) * 100) / 100;
    const liquidacionPendiente = Math.max(0, Math.round((precioTotal - anticipoPagado) * 100) / 100);

    res.json({
      status: 'ok',
      data: { precioTotal, anticipoPct, montoAnticipo, anticipoPagado, liquidacionPendiente }
    });
  } catch (err) {
    logger.app.error(`Error pagos/info: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Verificar sesión Stripe (fallback cuando el webhook no llega) ───────────
// El frontend llama a esto con el session_id que Stripe pone en la URL de éxito.
// Si el webhook ya procesó el pago, simplemente devuelve los datos. Si no, lo procesa aquí.

router.post('/verificar-session', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ status: 'error', message: 'sessionId requerido' });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.json({ status: 'pendiente' });
    }

    const { idCotizacion, tipo } = session.metadata || {};
    if (!idCotizacion || !tipo) {
      return res.status(400).json({ status: 'error', message: 'Metadata de sesión incompleta' });
    }

    const montoPagado = (session.amount_total || 0) / 100;

    // Verificar estado actual
    const cotCheck = await db.query(
      `SELECT sc.nombre AS estado FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );
    const estadoActual = (cotCheck.rows[0]?.estado || '').toLowerCase();
    // Para anticipo: ya procesado si es 'pagado anticipo' o 'pagada'
    // Para liquidacion: 'pagado anticipo' es el estado INICIAL esperado, solo 'pagada' indica que ya se procesó
    const yaProcessado = tipo === 'liquidacion'
      ? estadoActual === 'pagada'
      : ['pagado anticipo', 'pagada'].includes(estadoActual);

    if (!yaProcessado) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await procesarPagoConfirmado(client, {
          idCotizacion, tipo, monto: montoPagado,
          stripePaymentIntentId: session.payment_intent,
        });
        await client.query('COMMIT');
        logger.app.info(`✅ Pago confirmado vía verificar-session — Cot #${idCotizacion} — $${montoPagado}`);
      } catch (err) {
        await client.query('ROLLBACK');
        // Si falló porque ya fue procesado por el webhook, continuar normalmente
        logger.app.warn(`verificar-session rollback (probablemente ya procesado): ${err.message}`);
      } finally {
        client.release();
      }
    }

    // Devolver datos actualizados de la cotizacion
    const cotFinal = await db.query(
      `SELECT co.idcotizacion, co.preciofinal, co.montoestimado,
              c.fecha, c.hora, c.idcita,
              e.nombre AS tatuador_nombre,
              sc.nombre AS estado
       FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN cita c ON co.idcita = c.idcita
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       JOIN empleado e ON t.idempleado = e.idempleado
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );

    return res.json({ status: 'ok', tipo, montoPagado, cotizacion: cotFinal.rows[0] });

  } catch (err) {
    logger.app.error(`Error verificar-session: ${err.message}`);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Confirmar pago en efectivo (solo tatuador) ──────────────────────────────

router.put('/confirmar-efectivo', async (req, res) => {
  const { idCotizacion, tipo } = req.body;

  if (!idCotizacion || !['anticipo', 'liquidacion'].includes(tipo)) {
    return res.status(400).json({ status: 'error', message: 'idCotizacion y tipo (anticipo|liquidacion) requeridos' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cotRes = await client.query(
      `SELECT co.preciofinal, co.montoestimado, sc.nombre AS estado
       FROM cotizacion co
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       WHERE co.idcotizacion = $1`,
      [idCotizacion]
    );

    if (cotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    const cot = cotRes.rows[0];
    const estadoLower = (cot.estado || '').toLowerCase();

    if (tipo === 'anticipo' && (estadoLower === 'pagado anticipo' || estadoLower === 'pagada')) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'El anticipo ya fue registrado' });
    }
    if (tipo === 'liquidacion' && estadoLower === 'pagada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'La liquidación ya fue registrada' });
    }
    if (tipo === 'liquidacion' && estadoLower !== 'pagado anticipo') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Primero debe registrarse el anticipo' });
    }

    const precioTotal = parseFloat(cot.preciofinal || cot.montoestimado || 0);
    let monto;
    if (tipo === 'anticipo') {
      const anticipoPct = await getAnticipoPct(idCotizacion);
      monto = Math.round(precioTotal * (anticipoPct / 100) * 100) / 100;
    } else {
      const anticipoPagado = await getAnticipoPagado(idCotizacion);
      monto = Math.round((precioTotal - anticipoPagado) * 100) / 100;
      if (monto <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'La cotización no tiene saldo pendiente' });
      }
    }

    await procesarPagoConfirmado(client, { idCotizacion, tipo, monto, stripePaymentIntentId: null });

    await client.query('COMMIT');
    logger.app.info(`💵 Efectivo ${tipo} confirmado — Cotización #${idCotizacion} — $${monto} MXN`);
    return res.json({ status: 'success', message: `Pago en efectivo (${tipo}) confirmado`, monto });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error confirmar-efectivo: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al confirmar pago' });
  } finally {
    client.release();
  }
});

export default router;
