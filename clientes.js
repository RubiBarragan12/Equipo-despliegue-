import express from 'express';
import db from '../config/db.js';
import supabase from '../config/supabase.js'; // Solo para storage de imágenes y listado de clientes
import logger from '../utils/logger.js';
import { crearNotificacion } from '../utils/notificaciones.js';

const router = express.Router();

function calcularDiasProceso(fechainicio) {
  if (!fechainicio) return 1;
  return Math.ceil(Math.abs(new Date() - new Date(fechainicio)) / (1000 * 60 * 60 * 24));
}

// ────────────────────────────────────────────────────────────────────────────
// GET / — Lista seguimientos (filtrado por idcliente o idtatuador)
//         Sin params → lista de clientes para el cajero
// ────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { idcliente, idtatuador, filter, search } = req.query;

  if (idcliente || idtatuador) {
    try {
      let rows;

      if (idcliente) {
        const r = await db.query(
          `SELECT s.idseguimiento, s.idcliente, s.idtatuador,
                  s.estadocicatrizacion, s.estadoseguimiento, s.fechainicio,
                  cl.nombre AS cliente_nombre,
                  e.nombre  AS tatuador_nombre
           FROM seguimiento s
           JOIN cliente  cl ON s.idcliente  = cl.idcliente
           JOIN tatuador t  ON s.idtatuador = t.idtatuador
           JOIN empleado e  ON t.idempleado = e.idempleado
           WHERE s.idcliente = $1`,
          [parseInt(idcliente)]
        );
        rows = r.rows;
      } else {
        // idtatuador param es idempleado del empleado logueado
        const tatR = await db.query(
          `SELECT idtatuador FROM tatuador WHERE idempleado = $1`, [parseInt(idtatuador)]
        );
        if (!tatR.rows.length) return res.json([]);
        const idTat = tatR.rows[0].idtatuador;
        const r = await db.query(
          `SELECT s.idseguimiento, s.idcliente, s.idtatuador,
                  s.estadocicatrizacion, s.estadoseguimiento, s.fechainicio,
                  cl.nombre AS cliente_nombre,
                  e.nombre  AS tatuador_nombre
           FROM seguimiento s
           JOIN cliente  cl ON s.idcliente  = cl.idcliente
           JOIN tatuador t  ON s.idtatuador = t.idtatuador
           JOIN empleado e  ON t.idempleado = e.idempleado
           WHERE s.idtatuador = $1`,
          [idTat]
        );
        rows = r.rows;
      }

      let resultado = rows.map(s => ({
        id:            s.idseguimiento,
        nombre:        s.cliente_nombre || `Cliente ${s.idcliente}`,
        nombreTatuador: s.tatuador_nombre || 'Tatuador',
        tattoo:        'Tatuaje en proceso',
        estado:        s.estadocicatrizacion || 'Curación Normal',
        diasProceso:   calcularDiasProceso(s.fechainicio),
        avatar:        `https://ui-avatars.com/api/?name=${encodeURIComponent(s.cliente_nombre || 'Cliente')}&background=ba9eff&color=fff`,
        clienteId:     s.idcliente,
        tatuadorId:    s.idtatuador
      }));

      if (filter === 'recent')    resultado = resultado.filter(c => c.diasProceso <= 5);
      else if (filter === 'critical')  resultado = resultado.filter(c => c.estado === 'Irritación Leve');
      else if (filter === 'completed') resultado = resultado.filter(c => c.estado === 'Curación Completada');
      if (search?.trim()) resultado = resultado.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));

      return res.json(resultado);
    } catch (err) {
      logger.app.error(`GET /clientes (seguimientos): ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
  }

  // Sin params → listado de clientes para cajero (mantiene Supabase)
  try {
    const { data: clientes, error } = await supabase
      .from('cliente')
      .select('idcliente, nombre, apellido_paterno, apellido_materno, correo, telefono')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ status: 'success', clientes: clientes ?? [] });
  } catch (err) {
    logger.app.error(`GET /clientes (list): ${err.message}`);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /admin/all — Todos los seguimientos (sin filtro de usuario)
// ────────────────────────────────────────────────────────────────────────────
router.get('/admin/all', async (req, res) => {
  try {
    const { search } = req.query;
    const r = await db.query(
      `SELECT s.idseguimiento, s.idcliente, s.idtatuador,
              s.estadocicatrizacion,
              cl.nombre AS cliente_nombre,
              e.nombre  AS tatuador_nombre
       FROM seguimiento s
       JOIN cliente  cl ON s.idcliente  = cl.idcliente
       JOIN tatuador t  ON s.idtatuador = t.idtatuador
       JOIN empleado e  ON t.idempleado = e.idempleado`
    );
    let resultado = r.rows.map(s => ({
      id:             s.idseguimiento,
      cliente_nombre: s.cliente_nombre || `Cliente ${s.idcliente}`,
      tatuador_nombre: s.tatuador_nombre || 'Tatuador no asignado',
      estado:         s.estadocicatrizacion || 'Curación Normal',
      avatar:         `https://ui-avatars.com/api/?name=${encodeURIComponent(s.cliente_nombre || 'Cliente')}&background=D93B3B&color=fff`
    }));
    if (search?.trim()) {
      const term = search.toLowerCase();
      resultado = resultado.filter(s =>
        s.cliente_nombre.toLowerCase().includes(term) || s.tatuador_nombre.toLowerCase().includes(term)
      );
    }
    return res.json(resultado);
  } catch (err) {
    logger.app.error(`GET /clientes/admin/all: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /:id — Detalle de un seguimiento
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { idcliente, idtatuador } = req.query;

    // Resolver idtatuador desde idempleado si viene del tatuador
    let idTatuador = null;
    if (idtatuador) {
      const tatR = await db.query(`SELECT idtatuador FROM tatuador WHERE idempleado = $1`, [parseInt(idtatuador)]);
      if (tatR.rows.length) idTatuador = tatR.rows[0].idtatuador;
    }

    const r = await db.query(
      `SELECT s.idseguimiento, s.idcliente, s.idtatuador,
              s.estadocicatrizacion, s.estadoseguimiento, s.fechainicio,
              cl.nombre AS cliente_nombre,
              e.nombre  AS tatuador_nombre
       FROM seguimiento s
       JOIN cliente  cl ON s.idcliente  = cl.idcliente
       JOIN tatuador t  ON s.idtatuador = t.idtatuador
       JOIN empleado e  ON t.idempleado = e.idempleado
       WHERE s.idseguimiento = $1`,
      [parseInt(id)]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Seguimiento no encontrado' });
    const s = r.rows[0];

    const esAdmin = !idcliente && !idtatuador;
    if (!esAdmin) {
      if (idcliente && s.idcliente !== parseInt(idcliente)) return res.status(403).json({ error: 'No tienes permiso' });
      if (idTatuador && s.idtatuador !== idTatuador)         return res.status(403).json({ error: 'No tienes permiso' });
    }

    return res.json({
      id:           s.idseguimiento,
      nombre:       s.cliente_nombre,
      nombreTatuador: s.tatuador_nombre,
      tattoo:       'Tatuaje en proceso',
      estado:       s.estadocicatrizacion || 'Curación Normal',
      diasProceso:  calcularDiasProceso(s.fechainicio),
      avatar:       `https://ui-avatars.com/api/?name=${encodeURIComponent(s.cliente_nombre)}&background=ba9eff&color=fff`,
      clienteId:    s.idcliente,
      tatuadorId:   s.idtatuador,
      fechaInicio:  s.fechainicio
    });
  } catch (err) {
    logger.app.error(`GET /clientes/${req.params.id}: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST / — Crear nuevo seguimiento
// ────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { idcliente, idcita, idtatuador } = req.body;
    const r = await db.query(
      `INSERT INTO seguimiento (idcliente, idcita, idtatuador, estadocicatrizacion, estadoseguimiento, fechainicio)
       VALUES ($1, $2, $3, 'Curación Normal', 'Activo', CURRENT_DATE)
       RETURNING idseguimiento`,
      [idcliente, idcita || null, idtatuador || null]
    );
    return res.status(201).json({
      id: r.rows[0].idseguimiento,
      nombre: 'Nuevo Cliente',
      tattoo: 'Tatuaje',
      estado: 'Curación Normal',
      diasProceso: 1,
      avatar: 'https://ui-avatars.com/api/?name=Cliente&background=ba9eff&color=fff'
    });
  } catch (err) {
    logger.app.error(`POST /clientes: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /:id/estado — Actualizar estado de cicatrización
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, idtatuador } = req.body;

    const tatR = await db.query(`SELECT idtatuador FROM tatuador WHERE idempleado = $1`, [parseInt(idtatuador)]);
    if (!tatR.rows.length) return res.status(403).json({ error: 'No eres tatuador' });
    const idTatuador = tatR.rows[0].idtatuador;

    const segR = await db.query(`SELECT idtatuador FROM seguimiento WHERE idseguimiento = $1`, [parseInt(id)]);
    if (!segR.rows.length) return res.status(404).json({ error: 'Seguimiento no encontrado' });
    if (segR.rows[0].idtatuador !== idTatuador) return res.status(403).json({ error: 'No tienes permiso' });

    let query = `UPDATE seguimiento SET estadocicatrizacion = $1`;
    const params = [estado, parseInt(id)];
    if (estado === 'Curación Completada') {
      query += `, fechafin = CURRENT_DATE, estadoseguimiento = 'Finalizado'`;
    }
    query += ` WHERE idseguimiento = $2`;
    await db.query(query, params);

    return res.json({ success: true, estado });
  } catch (err) {
    logger.app.error(`PUT /clientes/${req.params.id}/estado: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /:id/chat — Obtener mensajes del chat
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { idcliente, idtatuador } = req.query;

    const segR = await db.query(`SELECT idcliente, idtatuador FROM seguimiento WHERE idseguimiento = $1`, [parseInt(id)]);
    if (!segR.rows.length) return res.status(404).json({ error: 'Seguimiento no encontrado' });
    const seg = segR.rows[0];

    const esAdmin = !idcliente && !idtatuador;
    if (!esAdmin) {
      let idTatuador = null;
      if (idtatuador) {
        const tatR = await db.query(`SELECT idtatuador FROM tatuador WHERE idempleado = $1`, [parseInt(idtatuador)]);
        if (tatR.rows.length) idTatuador = tatR.rows[0].idtatuador;
      }
      const permiso = (idcliente && parseInt(idcliente) === seg.idcliente)
                   || (idTatuador && idTatuador === seg.idtatuador);
      if (!permiso) return res.status(403).json({ error: 'No tienes permiso' });
    }

    const msgs = await db.query(
      `SELECT idmensaje, idtipo_emisor, mensaje, fecha_envio
       FROM chat_seguimiento
       WHERE idseguimiento = $1
       ORDER BY fecha_envio ASC`,
      [parseInt(id)]
    );

    return res.json(msgs.rows.map(m => ({
      id:         m.idmensaje,
      remitente:  m.idtipo_emisor === 1 ? 'CLIENTE' : 'ARTISTA',
      mensaje:    m.mensaje,
      fecha:      m.fecha_envio ? new Date(m.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora',
      fecha_envio: m.fecha_envio
    })));
  } catch (err) {
    logger.app.error(`GET /clientes/${req.params.id}/chat: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /:id/chat — Enviar mensaje
// ────────────────────────────────────────────────────────────────────────────
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { remitente, mensaje, idcliente, idtatuador } = req.body;

    const segR = await db.query(`SELECT idcliente, idtatuador FROM seguimiento WHERE idseguimiento = $1`, [parseInt(id)]);
    if (!segR.rows.length) return res.status(404).json({ error: 'Seguimiento no encontrado' });
    const seg = segR.rows[0];

    let idTatuador = null;
    if (idtatuador) {
      const tatR = await db.query(`SELECT idtatuador FROM tatuador WHERE idempleado = $1`, [parseInt(idtatuador)]);
      if (tatR.rows.length) idTatuador = tatR.rows[0].idtatuador;
    }

    const permiso = (remitente === 'CLIENTE' && idcliente && parseInt(idcliente) === seg.idcliente)
                 || (remitente === 'ARTISTA' && idTatuador && idTatuador === seg.idtatuador);
    if (!permiso) return res.status(403).json({ error: 'No tienes permiso' });

    const idtipo_emisor = remitente === 'CLIENTE' ? 1 : 2;
    const r = await db.query(
      `INSERT INTO chat_seguimiento (idseguimiento, idtipo_emisor, mensaje, fecha_envio)
       VALUES ($1, $2, $3, NOW())
       RETURNING idmensaje, mensaje, fecha_envio`,
      [parseInt(id), idtipo_emisor, mensaje]
    );
    const data = r.rows[0];
    const hora = new Date(data.fecha_envio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

    logger.app.info(`💬 Mensaje #${data.idmensaje} en seguimiento #${id}`);

    // Notificar a la otra parte
    if (remitente === 'CLIENTE' && seg.idtatuador) {
      const tatR = await db.query(`SELECT idempleado FROM tatuador WHERE idtatuador = $1`, [seg.idtatuador]);
      if (tatR.rows.length) {
        crearNotificacion(2, tatR.rows[0].idempleado, {
          titulo: 'Nuevo mensaje en seguimiento',
          cuerpo: 'Tu cliente envió un mensaje en el chat de seguimiento',
          url: '/pages/tatuador/cotizaciones/mi-jornada.html'
        });
      }
    } else if (remitente === 'ARTISTA' && seg.idcliente) {
      crearNotificacion(1, seg.idcliente, {
        titulo: 'Nuevo mensaje de tu artista',
        cuerpo: 'Tu tatuador te envió un mensaje sobre tu seguimiento',
        url: '/pages/cliente/seguimiento/index.html'
      });
    }

    return res.json({ id: data.idmensaje, remitente, mensaje: data.mensaje, fecha: hora, fecha_envio: data.fecha_envio });
  } catch (err) {
    logger.app.error(`POST /clientes/${req.params.id}/chat: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /:id/fotos — Galería de seguimiento
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/fotos', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT idseguimiento_foto, foto_seguimiento_url, fecha_subida
       FROM seguimiento_fotos
       WHERE idseguimiento = $1
       ORDER BY fecha_subida DESC`,
      [parseInt(req.params.id)]
    );
    return res.json(r.rows.map(f => ({ id: f.idseguimiento_foto, url: f.foto_seguimiento_url, fecha: f.fecha_subida })));
  } catch (err) {
    logger.app.error(`GET /clientes/${req.params.id}/fotos: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /:id/fotos — Agregar foto
// ────────────────────────────────────────────────────────────────────────────
router.post('/:id/fotos', async (req, res) => {
  try {
    const { id } = req.params;
    const { foto_url } = req.body;

    const countR = await db.query(`SELECT COUNT(*) FROM seguimiento_fotos WHERE idseguimiento = $1`, [parseInt(id)]);
    const fotosExistentes = parseInt(countR.rows[0].count);

    const r = await db.query(
      `INSERT INTO seguimiento_fotos (idseguimiento, foto_seguimiento_url, fecha_subida)
       VALUES ($1, $2, NOW())
       RETURNING idseguimiento_foto, foto_seguimiento_url, fecha_subida`,
      [parseInt(id), foto_url]
    );
    const data = r.rows[0];

    if (fotosExistentes === 0) {
      const segR = await db.query(`SELECT idcita FROM seguimiento WHERE idseguimiento = $1`, [parseInt(id)]);
      if (segR.rows[0]?.idcita) {
        await db.query(`UPDATE cita SET foto_final_url = $1 WHERE idcita = $2`, [foto_url, segR.rows[0].idcita]);
      }
    }

    return res.json({ id: data.idseguimiento_foto, url: data.foto_seguimiento_url, fecha: data.fecha_subida });
  } catch (err) {
    logger.app.error(`POST /clientes/${req.params.id}/fotos: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /:id/notas — Última observación
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/notas', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT observaciones FROM observaciones WHERE idseguimiento = $1 ORDER BY idobserva DESC LIMIT 1`,
      [parseInt(req.params.id)]
    );
    return res.json({ contenido: r.rows[0]?.observaciones || '' });
  } catch (err) {
    logger.app.error(`GET /clientes/${req.params.id}/notas: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /:id/notas — Guardar observación
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id/notas', async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    if (!contenido) return res.status(400).json({ error: 'Contenido requerido' });

    const segR = await db.query(`SELECT idcita FROM seguimiento WHERE idseguimiento = $1`, [parseInt(id)]);
    if (!segR.rows.length) return res.status(404).json({ error: 'Seguimiento no encontrado' });

    const r = await db.query(
      `INSERT INTO observaciones (idseguimiento, idcita, observaciones)
       VALUES ($1, $2, $3)
       RETURNING idobserva, observaciones`,
      [parseInt(id), segR.rows[0].idcita, contenido]
    );
    return res.json({ success: true, contenido: r.rows[0].observaciones, id: r.rows[0].idobserva });
  } catch (err) {
    logger.app.error(`PUT /clientes/${req.params.id}/notas: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
