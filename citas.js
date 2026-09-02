import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.js';
import { crearNotificacion } from '../utils/notificaciones.js';

const router = express.Router();

// =====================================================
// FUNCIÓN PARA CREAR SEGUIMIENTO
// =====================================================
async function crearSeguimiento(client, idCita, idCliente, idTatuador) {
    try {
        const existente = await client.query(
            `SELECT idseguimiento FROM seguimiento WHERE idcita = $1`,
            [idCita]
        );
        
        if (existente.rows.length > 0) {
            logger.app.info(`⚠️ Ya existe seguimiento para cita ${idCita}`);
            return existente.rows[0].idseguimiento;
        }
        
        const result = await client.query(
            `INSERT INTO seguimiento (idcliente, idcita, idtatuador, estadocicatrizacion, estadoseguimiento, fechainicio)
             VALUES ($1, $2, $3, 'Curación Normal', 'Activo', CURRENT_DATE)
             RETURNING idseguimiento`,
            [idCliente, idCita, idTatuador]
        );
        
        const idSeguimiento = result.rows[0].idseguimiento;
        logger.app.info(`✅ Seguimiento #${idSeguimiento} creado para cita #${idCita}`);
        
        try {
            await client.query(
                `INSERT INTO chat_seguimiento (idseguimiento, idtipo_emisor, mensaje, fecha_envio)
                 VALUES ($1, 2, '🎉 ¡Tu cita ha sido confirmada! Este es el chat de seguimiento. Aquí podrás compartir fotos de tu proceso de curación y recibir indicaciones de tu tatuador.', NOW())`,
                [idSeguimiento]
            );
            logger.app.info(`💬 Mensaje de bienvenida agregado al chat #${idSeguimiento}`);
        } catch (chatError) {
            logger.app.warn(`⚠️ No se pudo agregar mensaje de bienvenida: ${chatError.message}`);
        }
        
        return idSeguimiento;
    } catch (error) {
        logger.app.error(`❌ Error creando seguimiento: ${error.message}`);
        return null;
    }
}

// ===== TATUADORES DE UNA EMPRESA =====
router.get('/tatuadores/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const result = await db.query(
      `SELECT t.idtatuador, e.nombre, e.foto_url,
              COALESCE(
                (SELECT string_agg(tec.nombretecnica, ', ')
                 FROM tatuador_tiene_tecnica ttt
                 JOIN tecnicas tec ON ttt.idtecnica = tec.idtecnica
                 WHERE ttt.idtatuador = t.idtatuador), 'General'
              ) AS estilos
       FROM tatuador t
       JOIN empleado e ON t.idempleado = e.idempleado
       WHERE e.idempresa = $1
       ORDER BY e.nombre`,
      [idEmpresa]
    );
    logger.app.info(`🎨 ${result.rows.length} tatuadores para empresa ${idEmpresa}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error tatuadores: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener tatuadores' });
  }
});

// ===== DISPONIBILIDAD DE UN TATUADOR EN UNA FECHA =====
router.get('/disponibilidad/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ status: 'error', message: 'Se requiere el parámetro fecha (YYYY-MM-DD)' });
    }

    const dateObj = new Date(fecha + 'T12:00:00');
    const jsDay = dateObj.getDay();
    const diaSemana = jsDay === 0 ? 6 : jsDay - 1;

    const horarioBase = await db.query(
      `SELECT hora_inicio, hora_fin FROM horario_base
       WHERE idtatuador = $1 AND dia_semana = $2 AND activo = true`,
      [idTatuador, diaSemana]
    );

    if (horarioBase.rows.length === 0) {
      return res.json({ status: 'ok', data: [], message: 'El tatuador no trabaja este día' });
    }

    const horaInicio = horarioBase.rows[0].hora_inicio;
    const horaFin = horarioBase.rows[0].hora_fin;

    const bloqueos = await db.query(
      `SELECT horainicio, horafin FROM horas_disponibles
       WHERE idtatuador = $1 AND estadodisponibilidad = false
       AND (
         (tipo_bloqueo = 'unico' AND fecha = $2)
         OR tipo_bloqueo = 'diario'
         OR (tipo_bloqueo = 'semanal' AND dia_semana = $3)
       )`,
      [idTatuador, fecha, diaSemana]
    );

    const citasExistentes = await db.query(
      `SELECT c.hora FROM cita c
       WHERE c.idtatuador = $1 AND c.fecha = $2
       AND c.idstatus_cita NOT IN (
         SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) IN ('cancelada')
       )`,
      [idTatuador, fecha]
    );

    const slots = [];
    const inicio = parseInt(horaInicio.substring(0, 2));
    const fin = parseInt(horaFin.substring(0, 2));

    for (let h = inicio; h < fin; h++) {
      const horaSlot = `${String(h).padStart(2, '0')}:00`;

      const bloqueado = bloqueos.rows.some(b => {
        const bInicio = parseInt(b.horainicio.substring(0, 2));
        const bFin = parseInt(b.horafin.substring(0, 2));
        return h >= bInicio && h < bFin;
      });

      const ocupado = citasExistentes.rows.some(c => {
        return c.hora && c.hora.substring(0, 5) === horaSlot;
      });

      slots.push({
        hora: horaSlot,
        horaFin: `${String(h + 1).padStart(2, '0')}:00`,
        disponible: !bloqueado && !ocupado
      });
    }

    return res.json({ status: 'ok', data: slots });
  } catch (error) {
    logger.app.error(`Error disponibilidad: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener disponibilidad' });
  }
});

// ===== TÉCNICAS DE UNA EMPRESA =====
router.get('/tecnicas/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const result = await db.query(
      `SELECT idtecnica, nombretecnica, dificultad 
       FROM tecnicas 
       WHERE idempresa = $1 
       ORDER BY nombretecnica ASC`,
      [idEmpresa]
    );
    logger.app.info(`📋 ${result.rows.length} técnicas para empresa ${idEmpresa}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error tecnicas: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener técnicas' });
  }
});

// ===== TAMAÑOS Y PRECIOS =====
router.get('/tamanios/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const result = await db.query(
      `SELECT idtamano, tamanio, precio, anchomin, anchomax, altomin, altomax 
       FROM precio_tamano 
       WHERE idempresa = $1 
       ORDER BY anchomin ASC`,
      [idEmpresa]
    );
    logger.app.info(`📏 ${result.rows.length} tamaños para empresa ${idEmpresa}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error tamanios: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener tamaños' });
  }
});

// ===== CREAR CITA + COTIZACION =====
router.post('/citas', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { idCliente, idTatuador, fecha, hora, zonaCuerpo, tamanio, idTecnica, descripcion, idEmpresa, fotoBase64 } = req.body;

    if (!idCliente || !idTatuador || !fecha || !hora) {
      return res.status(400).json({ status: 'error', message: 'idCliente, idTatuador, fecha y hora son requeridos' });
    }

    let fotoReferenciaUrl = null;
    if (fotoBase64 && supabase) {
      try {
        const match = fotoBase64.match(/^data:([^;]+);base64,/);
        const mimeType = match ? match[1] : 'image/png';
        const ext = mimeType.split('/')[1].replace('+xml', '').replace('jpeg', 'jpg') || 'png';
        const rawData = fotoBase64.split(',')[1];
        if (!rawData) throw new Error('Base64 data vacía');
        const buffer = Buffer.from(rawData, 'base64');

        const idEmp = idEmpresa || 'general';
        const fileName = `empresa_${idEmp}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const { error: upError } = await supabase.storage
          .from('referencias')
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (!upError) {
          const { data: urlData } = supabase.storage.from('referencias').getPublicUrl(fileName);
          fotoReferenciaUrl = urlData.publicUrl;
        }
      } catch (imgErr) {
        logger.app.error(`❌ Error procesando imagen: ${imgErr.message}`);
      }
    }

    await client.query('BEGIN');

    const statusCita = await client.query(`SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'pendiente'`);
    if (statusCita.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Pendiente" no configurado' });
    }
    const idStatusCita = statusCita.rows[0].idstatus_cita;

    const tipoCita = await client.query(`SELECT idtipo_cita FROM tipo_cita WHERE LOWER(nombre) = 'tatuaje'`);
    if (tipoCita.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Tipo de cita "Tatuaje" no configurado' });
    }
    const idTipoCita = tipoCita.rows[0].idtipo_cita;

    const citaResult = await client.query(
      `INSERT INTO cita (idtipo_cita, idstatus_cita, idcliente, idtatuador, fecha, hora, zonacuerpo, tamanio, idtecnica, descripcion, foto_referecncia_url, foto_final_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING idcita`,
      [idTipoCita, idStatusCita, idCliente, idTatuador, fecha, hora, zonaCuerpo || null, tamanio || null, idTecnica || null, descripcion || null, fotoReferenciaUrl || null]
    );
    const idCita = citaResult.rows[0].idcita;

    let montoEstimado = 0;
    if (tamanio && idEmpresa) {
      const ancho = parseFloat(tamanio.split('x')[0]) || 0;
      const alto = parseFloat(tamanio.split('x')[1]) || 0;
      const precioResult = await client.query(
        `SELECT precio FROM precio_tamano
         WHERE idempresa = $1 AND $2 BETWEEN anchomin AND anchomax AND $3 BETWEEN altomin AND altomax
         LIMIT 1`,
        [idEmpresa, ancho, alto]
      );
      if (precioResult.rows.length > 0) {
        montoEstimado = parseFloat(precioResult.rows[0].precio);
      }
    }
    if (montoEstimado === 0) montoEstimado = 500;

    // Si hay técnica, multiplicar por dificultad
    if (idTecnica && montoEstimado > 0) {
      const tecnicaResult = await client.query(
        `SELECT dificultad FROM tecnicas WHERE idtecnica = $1 AND idempresa = $2`,
        [idTecnica, idEmpresa]
      );
      if (tecnicaResult.rows.length > 0) {
        const dificultad = parseFloat(tecnicaResult.rows[0].dificultad) || 1;
        montoEstimado = montoEstimado * dificultad;
        logger.app.info(`💰 Precio con técnica: base × ${dificultad} = ${montoEstimado}`);
      }
    }

    const statusCot = await client.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'enviada'`);
    if (statusCot.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Enviada" no configurado' });
    }
    const idStatusCot = statusCot.rows[0].idstatus;

    const cotResult = await client.query(
      `INSERT INTO cotizacion (idstatus, idcita, montoestimado, fecha_cotizacion)
       VALUES ($1, $2, $3, NOW())
       RETURNING idcotizacion`,
      [idStatusCot, idCita, montoEstimado]
    );

    await client.query(
      `INSERT INTO horas_disponibles (idtatuador, horainicio, horafin, fecha, estadodisponibilidad, motivo, tipo_bloqueo)
       VALUES ($1, $2, $3, $4, false, $5, 'unico')`,
      [idTatuador, hora, `${String(parseInt(hora.substring(0, 2)) + 1).padStart(2, '0')}:00`, fecha, `Cotización #${cotResult.rows[0].idcotizacion}`]
    );

    if (idEmpresa) {
      await client.query(
        `INSERT INTO cliente_en_empresa (idempresa, idcliente) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [idEmpresa, idCliente]
      );
    }

    await client.query('COMMIT');

    logger.app.info(`✅ Cita #${idCita} + Cotización #${cotResult.rows[0].idcotizacion} creada`);

    // Notificar al tatuador
    db.query(`SELECT idempleado FROM tatuador WHERE idtatuador = $1`, [idTatuador])
      .then(r => {
        if (!r.rows.length) return;
        crearNotificacion(2, r.rows[0].idempleado, {
          titulo: 'Nueva solicitud de cita',
          cuerpo: `Tienes una nueva cotización pendiente para el ${fecha} a las ${hora.substring(0, 5)}`,
          url: '/pages/tatuador/cotizaciones/cotizacion.html'
        });
      }).catch(err => logger.app.error(`notif nueva-cita tatuador: ${err.message}`));

    // Confirmación al cliente
    crearNotificacion(1, idCliente, {
      titulo: '¡Cita agendada!',
      cuerpo: `Tu solicitud fue enviada para el ${fecha} a las ${hora.substring(0, 5)}. El tatuador revisará tu cotización pronto.`,
      url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Cita y cotización creadas exitosamente',
      data: {
        idCita,
        idCotizacion: cotResult.rows[0].idcotizacion,
        montoEstimado
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al crear cita: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al crear cita y cotización' });
  } finally {
    client.release();
  }
});

// ===== COTIZACIONES DEL TATUADOR =====
router.get('/cotizaciones/tatuador/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    const result = await db.query(
      `SELECT co.idcotizacion, co.montoestimado, co.preciofinal, co.justificacion_ajuste,
              sc.nombre AS estado,
              c.idcita, c.fecha, c.hora, c.zonacuerpo, c.tamanio, c.descripcion, c.foto_referecncia_url,
              tec.nombretecnica AS estilo,
              cl.nombre AS cliente_nombre, cl.apellido_paterno AS cliente_apellido,
              cl.telefono AS cliente_telefono, cl.correo AS cliente_correo
       FROM cotizacion co
       JOIN cita c ON co.idcita = c.idcita
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN cliente cl ON c.idcliente = cl.idcliente
       LEFT JOIN tecnicas tec ON c.idtecnica = tec.idtecnica
       WHERE c.idtatuador = $1
       ORDER BY c.fecha DESC, c.hora DESC`,
      [idTatuador]
    );
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error cotizaciones tatuador: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener cotizaciones' });
  }
});

// ===== COTIZACIONES DEL CLIENTE =====
router.get('/cotizaciones/cliente/:idCliente', async (req, res) => {
  try {
    const { idCliente } = req.params;
    const { idEmpresa } = req.query;

    const params = [idCliente];
    let whereExtra = '';
    if (idEmpresa) {
      params.push(parseInt(idEmpresa));
      whereExtra = `AND e.idempresa = $${params.length}`;
    }

    const result = await db.query(
      `SELECT co.idcotizacion, co.montoestimado, co.preciofinal, co.justificacion_ajuste,
              sc.nombre AS estado,
              c.idcita, c.fecha, c.hora, c.zonacuerpo, c.tamanio, c.descripcion, c.foto_referecncia_url, c.foto_final_url,
              tec.nombretecnica AS estilo,
              e.nombre AS tatuador_nombre, e.foto_url AS tatuador_foto
       FROM cotizacion co
       JOIN cita c ON co.idcita = c.idcita
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       JOIN empleado e ON t.idempleado = e.idempleado
       LEFT JOIN tecnicas tec ON c.idtecnica = tec.idtecnica
       WHERE c.idcliente = $1 ${whereExtra}
       ORDER BY c.fecha DESC, c.hora DESC`,
      params
    );
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error cotizaciones cliente: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener cotizaciones' });
  }
});

// ===== DETALLE DE UNA COTIZACIÓN =====
router.get('/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT co.idcotizacion, co.montoestimado, co.preciofinal, co.justificacion_ajuste, co.idstatus,
              sc.nombre AS estado,
              c.idcita, c.fecha, c.hora, c.zonacuerpo, c.tamanio, c.descripcion, c.foto_referecncia_url,
              c.idcliente, c.idtatuador,
              tec.nombretecnica AS estilo,
              cl.nombre AS cliente_nombre, cl.apellido_paterno AS cliente_apellido,
              cl.telefono AS cliente_telefono, cl.correo AS cliente_correo,
              e.nombre AS tatuador_nombre, e.foto_url AS tatuador_foto
       FROM cotizacion co
       JOIN cita c ON co.idcita = c.idcita
       JOIN status_cotizacion sc ON co.idstatus = sc.idstatus
       JOIN cliente cl ON c.idcliente = cl.idcliente
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       JOIN empleado e ON t.idempleado = e.idempleado
       LEFT JOIN tecnicas tec ON c.idtecnica = tec.idtecnica
       WHERE co.idcotizacion = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }
    return res.json({ status: 'ok', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error detalle cotización: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener cotización' });
  }
});

// ===== TATUADOR REVISA COTIZACIÓN =====
router.put('/cotizaciones/:id/revisar', async (req, res) => {
  try {
    const { id } = req.params;
    const { precioFinal, justificacion } = req.body;

    if (!precioFinal || precioFinal <= 0) {
      return res.status(400).json({ status: 'error', message: 'Se requiere un precio final válido' });
    }

    const statusRev = await db.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'aceptada'`);
    if (statusRev.rows.length === 0) {
      return res.status(500).json({ status: 'error', message: 'Status "Aceptada" no configurado' });
    }

    const result = await db.query(
      `UPDATE cotizacion SET preciofinal = $1, justificacion_ajuste = $2, idstatus = $3
       WHERE idcotizacion = $4
       RETURNING *`,
      [precioFinal, justificacion || null, statusRev.rows[0].idstatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    logger.app.info(`✅ Cotización #${id} aceptada — precio: $${precioFinal}`);

    db.query(
      `SELECT c.idcliente FROM cotizacion co JOIN cita c ON co.idcita = c.idcita WHERE co.idcotizacion = $1`,
      [id]
    ).then(r => {
      if (!r.rows.length) return;
      crearNotificacion(1, r.rows[0].idcliente, {
        titulo: 'Tu cotización fue revisada',
        cuerpo: `Tu artista estableció el precio final: $${precioFinal}. ¡Revísala y confírmala!`,
        url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
      });
    }).catch(err => logger.app.error(`notif revisar: ${err.message}`));

    return res.json({ status: 'success', message: 'Cotización aceptada y enviada al cliente', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error al revisar cotización: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al revisar cotización' });
  }
});

// ===== TATUADOR RECHAZA COTIZACIÓN =====
router.put('/cotizaciones/:id/rechazar', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { justificacion } = req.body;

    await client.query('BEGIN');

    let statusRech = await client.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'rechazada'`);
    if (statusRech.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Rechazada" no configurado' });
    }

    const result = await client.query(
      `UPDATE cotizacion SET justificacion_ajuste = $1, idstatus = $2
       WHERE idcotizacion = $3
       RETURNING *`,
      [justificacion || 'Rechazada por el tatuador', statusRech.rows[0].idstatus, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    await client.query(
      `UPDATE cita SET idstatus_cita = (SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada' LIMIT 1)
       WHERE idcita = $1`,
      [result.rows[0].idcita]
    );

    await client.query(`DELETE FROM horas_disponibles WHERE motivo = $1`, [`Cotización #${id}`]);

    const idClienteRech = result.rows[0].idcita
      ? (await client.query(`SELECT idcliente FROM cita WHERE idcita = $1`, [result.rows[0].idcita])).rows[0]?.idcliente
      : null;

    await client.query('COMMIT');
    logger.app.info(`❌ Cotización #${id} rechazada`);

    if (idClienteRech) {
      crearNotificacion(1, idClienteRech, {
        titulo: 'Tu cotización fue rechazada',
        cuerpo: justificacion || 'El artista no pudo aceptar tu solicitud en este momento.',
        url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
      });
    }

    return res.json({ status: 'success', message: 'Cotización rechazada' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error rechazar: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al rechazar cotización' });
  } finally {
    client.release();
  }
});

// ===== CLIENTE ACEPTA COTIZACIÓN =====
router.put('/cotizaciones/:id/aceptar', async (req, res) => {
  try {
    const { id } = req.params;

    let statusAcep = await db.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'aceptada'`);
    if (statusAcep.rows.length === 0) {
      return res.status(500).json({ status: 'error', message: 'Status "Aceptada" no configurado' });
    }

    const result = await db.query(
      `UPDATE cotizacion SET idstatus = $1 WHERE idcotizacion = $2 RETURNING *`,
      [statusAcep.rows[0].idstatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    logger.app.info(`✅ Cotización #${id} aceptada por cliente`);

    db.query(
      `SELECT t.idempleado, c.idcliente FROM cotizacion co
       JOIN cita c ON co.idcita = c.idcita
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       WHERE co.idcotizacion = $1`,
      [id]
    ).then(r => {
      if (!r.rows.length) return;
      crearNotificacion(2, r.rows[0].idempleado, {
        titulo: 'Cliente aceptó la cotización',
        cuerpo: 'Tu cliente aceptó el precio y está listo para pagar el anticipo.',
        url: '/pages/tatuador/cotizaciones/cotizacion.html'
      });
      crearNotificacion(1, r.rows[0].idcliente, {
        titulo: 'Cotización aceptada',
        cuerpo: 'Aceptaste la cotización. Procede a pagar el anticipo para confirmar tu cita.',
        url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
      });
    }).catch(err => logger.app.error(`notif aceptar: ${err.message}`));

    return res.json({ status: 'success', message: 'Cotización aceptada', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error aceptar: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al aceptar cotización' });
  }
});

// ===== CLIENTE CANCELA COTIZACIÓN =====
router.put('/cotizaciones/:id/cancelar', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    let statusCanc = await client.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'cancelada'`);
    if (statusCanc.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Cancelada" no configurado' });
    }

    const result = await client.query(
      `UPDATE cotizacion SET idstatus = $1 WHERE idcotizacion = $2 RETURNING *`,
      [statusCanc.rows[0].idstatus, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    await client.query(
      `UPDATE cita SET idstatus_cita = (SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada' LIMIT 1)
       WHERE idcita = $1`,
      [result.rows[0].idcita]
    );

    await client.query(`DELETE FROM horas_disponibles WHERE motivo = $1`, [`Cotización #${id}`]);

    const idCitaCancelada = result.rows[0].idcita;
    await client.query('COMMIT');
    logger.app.info(`🚫 Cotización #${id} cancelada por cliente`);

    // Notificar al tatuador y obtener idcliente en un solo query
    db.query(
      `SELECT t.idempleado, c.idcliente FROM cita c
       JOIN tatuador t ON c.idtatuador = t.idtatuador
       WHERE c.idcita = $1`,
      [idCitaCancelada]
    ).then(r => {
      if (!r.rows.length) return;
      crearNotificacion(2, r.rows[0].idempleado, {
        titulo: 'Cotización cancelada por el cliente',
        cuerpo: `El cliente canceló la cotización #${id}. El horario quedó liberado.`,
        url: '/pages/tatuador/cotizaciones/cotizacion.html'
      });
      crearNotificacion(1, r.rows[0].idcliente, {
        titulo: 'Cotización cancelada',
        cuerpo: 'Tu cotización fue cancelada y el horario quedó liberado.',
        url: '/pages/cliente/cotizacion/mis_cotizaciones.html'
      });
    }).catch(err => logger.app.error(`notif cancelar: ${err.message}`));

    return res.json({ status: 'success', message: 'Cotización cancelada' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error cancelar: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al cancelar cotización' });
  } finally {
    client.release();
  }
});

// ===== SIMULAR PAGO Y CONFIRMAR CITA (CON CREACIÓN DE SEGUIMIENTO) =====
router.put('/cotizaciones/:id/pagar', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const cotData = await client.query(
      `SELECT co.*, c.idcita, c.idtatuador, c.idcliente, c.fecha, c.hora, co.preciofinal
       FROM cotizacion co 
       JOIN cita c ON co.idcita = c.idcita
       WHERE co.idcotizacion = $1`,
      [id]
    );

    if (cotData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Cotización no encontrada' });
    }

    const cot = cotData.rows[0];
    const monto = parseFloat(cot.preciofinal || cot.montoestimado || 0);
    const idCliente = cot.idcliente;
    const idTatuador = cot.idtatuador;
    const idCita = cot.idcita;

    logger.app.info(`💳 Procesando pago — Cotización #${id}: monto a cobrar=${monto}`);

    let statusPag = await client.query(`SELECT idstatus FROM status_cotizacion WHERE LOWER(nombre) = 'pagada'`);
    if (statusPag.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Pagada" no configurado' });
    }

    await client.query(
      `UPDATE cotizacion SET idstatus = $1 WHERE idcotizacion = $2`,
      [statusPag.rows[0].idstatus, id]
    );

    let statusConf = await client.query(`SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'confirmada'`);
    if (statusConf.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', message: 'Status "Confirmada" no configurado' });
    }

    await client.query(
      `UPDATE cita SET idstatus_cita = $1 WHERE idcita = $2`,
      [statusConf.rows[0].idstatus_cita, idCita]
    );

    let metodoPago = await client.query(`SELECT idmetodo FROM metodos_pagos WHERE LOWER(nombre) = 'tarjeta' LIMIT 1`);
    if (metodoPago.rows.length === 0) {
      metodoPago = await client.query(`INSERT INTO metodos_pagos (nombre) VALUES ('Tarjeta') RETURNING idmetodo`);
    }

    let tipoPago = await client.query(`SELECT idtipo_pagos FROM tipo_pagos WHERE LOWER(nombre) = 'deposito' LIMIT 1`);
    if (tipoPago.rows.length === 0) {
      tipoPago = await client.query(`INSERT INTO tipo_pagos (nombre) VALUES ('Deposito') RETURNING idtipo_pagos`);
    }

    await client.query(
      `INSERT INTO pago (idmetodo, idtipo_pagos, idcotizacion, idcita, monto)
       VALUES ($1, $2, $3, $4, $5)`,
      [metodoPago.rows[0].idmetodo, tipoPago.rows[0].idtipo_pagos, parseInt(id), idCita, monto]
    );

    const idSeguimiento = await crearSeguimiento(client, idCita, idCliente, idTatuador);
    
    await client.query('COMMIT');

    logger.app.info(`💰 Pago $${monto} procesado — Cita #${idCita} confirmada — Seguimiento #${idSeguimiento}`);

    db.query(`SELECT idempleado FROM tatuador WHERE idtatuador = $1`, [idTatuador])
      .then(r => {
        if (!r.rows.length) return;
        crearNotificacion(2, r.rows[0].idempleado, {
          titulo: 'Cita confirmada y pagada',
          cuerpo: `Tu cliente confirmó la cita del ${new Date(cot.fecha).toLocaleDateString('es-MX')} a las ${String(cot.hora).substring(0, 5)}`,
          url: '/pages/tatuador/cotizaciones/cotizacion.html'
        });
      }).catch(err => logger.app.error(`notif pagar: ${err.message}`));

    return res.json({
      status: 'success',
      message: 'Pago procesado y cita confirmada',
      data: {
        monto,
        idCita: idCita,
        idSeguimiento: idSeguimiento,
        fecha: cot.fecha,
        hora: cot.hora
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error pago: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al procesar pago' });
  } finally {
    client.release();
  }
});

// ===== OBTENER SEGUIMIENTO POR ID DE CITA =====
router.get('/seguimientos/por-cita/:idCita', async (req, res) => {
  try {
    const { idCita } = req.params;
    const result = await db.query(
      `SELECT idseguimiento FROM seguimiento WHERE idcita = $1`,
      [idCita]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No encontrado' });
    }
    
    return res.json({ seguimientoId: result.rows[0].idseguimiento });
  } catch (error) {
    logger.app.error(`Error: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error' });
  }
});

// ===== OBTENER idTatuador DEL EMPLEADO LOGUEADO =====
router.get('/tatuador-id/:idEmpleado', async (req, res) => {
  try {
    const { idEmpleado } = req.params;
    const result = await db.query(
      `SELECT idtatuador FROM tatuador WHERE idempleado = $1`,
      [idEmpleado]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No es tatuador' });
    }
    return res.json({ status: 'ok', data: { idTatuador: result.rows[0].idtatuador } });
  } catch (error) {
    logger.app.error(`Error tatuador-id: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error' });
  }
});

export default router;