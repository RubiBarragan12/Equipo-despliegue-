import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function hoy() { return new Date().toISOString().split('T')[0]; }
function inicioAnio(anio) { return `${anio}-01-01`; }
function finAnio(anio)    { return `${anio}-12-31`; }

// ─── Reporte General ────────────────────────────────────────────────────────
// GET /api/reportes/general/:idEmpresa?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/reportes/general/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const anioActual = new Date().getFullYear();
    const desde = req.query.desde || inicioAnio(anioActual);
    const hasta = req.query.hasta || hoy();

    const [ventas, citas, nuevos, porMes] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(p.monto), 0) AS total
         FROM pago p
         JOIN cita c ON p.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND p.fecha BETWEEN $2 AND $3`,
        [idEmpresa, desde, hasta]
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND c.fecha BETWEEN $2 AND $3
           AND c.idstatus_cita NOT IN (
             SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada'
           )`,
        [idEmpresa, desde, hasta]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM (
           SELECT c.idcliente
           FROM cita c
           JOIN tatuador t ON c.idtatuador = t.idtatuador
           JOIN empleado e ON t.idempleado = e.idempleado
           WHERE e.idempresa = $1
           GROUP BY c.idcliente
           HAVING MIN(c.fecha) BETWEEN $2 AND $3
         ) sub`,
        [idEmpresa, desde, hasta]
      ),
      db.query(
        `SELECT EXTRACT(MONTH FROM p.fecha)::int AS mes,
                COALESCE(SUM(p.monto), 0) AS total
         FROM pago p
         JOIN cita c ON p.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND p.fecha BETWEEN $2 AND $3
         GROUP BY mes ORDER BY mes`,
        [idEmpresa, desde, hasta]
      ),
    ]);

    // Rellenar meses sin datos con 0
    const mesMap = {};
    porMes.rows.forEach(r => { mesMap[r.mes] = parseFloat(r.total); });
    const ventasPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i],
      total: mesMap[i + 1] || 0,
    }));

    return res.json({
      status: 'ok',
      data: {
        ventasTotales: parseFloat(ventas.rows[0].total),
        citasTotales:  parseInt(citas.rows[0].total),
        clientesNuevos: parseInt(nuevos.rows[0].total),
        ventasPorMes,
        desde,
        hasta,
      }
    });
  } catch (err) {
    logger.app.error(`Error reporte general: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener reporte general' });
  }
});

// ─── Reporte de Ventas ───────────────────────────────────────────────────────
// GET /api/reportes/ventas/:idEmpresa?anio=2024
router.get('/reportes/ventas/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const [total, mensual] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(p.monto), 0) AS total
         FROM pago p
         JOIN cita c ON p.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1
           AND EXTRACT(YEAR FROM p.fecha) = $2`,
        [idEmpresa, anio]
      ),
      db.query(
        `SELECT EXTRACT(MONTH FROM p.fecha)::int AS mes,
                COALESCE(SUM(p.monto), 0) AS total,
                COUNT(*) AS num_pagos
         FROM pago p
         JOIN cita c ON p.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1
           AND EXTRACT(YEAR FROM p.fecha) = $2
         GROUP BY mes ORDER BY mes`,
        [idEmpresa, anio]
      ),
    ]);

    const mesMap = {};
    mensual.rows.forEach(r => { mesMap[r.mes] = { total: parseFloat(r.total), pagos: parseInt(r.num_pagos) }; });

    const ventasMensuales = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i],
      total: mesMap[i + 1]?.total || 0,
      pagos: mesMap[i + 1]?.pagos || 0,
    }));

    return res.json({
      status: 'ok',
      data: {
        anio,
        total: parseFloat(total.rows[0].total),
        mensual: ventasMensuales,
      }
    });
  } catch (err) {
    logger.app.error(`Error reporte ventas: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener reporte de ventas' });
  }
});

// ─── Reporte de Clientes ─────────────────────────────────────────────────────
// GET /api/reportes/clientes/:idEmpresa?anio=2024
router.get('/reportes/clientes/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const hace90str = hace90.toISOString().split('T')[0];

    const [total, nuevosAnio, activos, topClientes, crecimientoMensual] = await Promise.all([
      // Total clientes con al menos una cita en esta empresa
      db.query(
        `SELECT COUNT(DISTINCT c.idcliente) AS total
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1`,
        [idEmpresa]
      ),
      // Nuevos este año: primera cita en este año
      db.query(
        `SELECT COUNT(*) AS total FROM (
           SELECT c.idcliente
           FROM cita c
           JOIN tatuador t ON c.idtatuador = t.idtatuador
           JOIN empleado e ON t.idempleado = e.idempleado
           WHERE e.idempresa = $1
           GROUP BY c.idcliente
           HAVING MIN(c.fecha) BETWEEN $2 AND $3
         ) sub`,
        [idEmpresa, inicioAnio(anio), finAnio(anio)]
      ),
      // Activos: con cita en últimos 90 días
      db.query(
        `SELECT COUNT(DISTINCT c.idcliente) AS total
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND c.fecha >= $2
           AND c.idstatus_cita NOT IN (
             SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada'
           )`,
        [idEmpresa, hace90str]
      ),
      // Top 5 clientes por número de citas
      db.query(
        `SELECT cl.idcliente,
                cl.nombre || ' ' || COALESCE(cl.apellido_paterno, '') AS nombre,
                COUNT(c.idcita) AS total_citas
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         JOIN cliente cl ON c.idcliente = cl.idcliente
         WHERE e.idempresa = $1
           AND c.idstatus_cita NOT IN (
             SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada'
           )
         GROUP BY cl.idcliente, cl.nombre, cl.apellido_paterno
         ORDER BY total_citas DESC
         LIMIT 5`,
        [idEmpresa]
      ),
      // Crecimiento mensual: nuevos clientes por mes del año seleccionado
      db.query(
        `SELECT EXTRACT(MONTH FROM primera)::int AS mes, COUNT(*) AS total
         FROM (
           SELECT c.idcliente, MIN(c.fecha) AS primera
           FROM cita c
           JOIN tatuador t ON c.idtatuador = t.idtatuador
           JOIN empleado e ON t.idempleado = e.idempleado
           WHERE e.idempresa = $1
           GROUP BY c.idcliente
           HAVING MIN(c.fecha) BETWEEN $2 AND $3
         ) sub
         GROUP BY mes ORDER BY mes`,
        [idEmpresa, inicioAnio(anio), finAnio(anio)]
      ),
    ]);

    const mesMap = {};
    crecimientoMensual.rows.forEach(r => { mesMap[r.mes] = parseInt(r.total); });
    const clientesPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i].substring(0, 3).toUpperCase(),
      total: mesMap[i + 1] || 0,
    }));

    return res.json({
      status: 'ok',
      data: {
        anio,
        totalClientes: parseInt(total.rows[0].total),
        clientesNuevos: parseInt(nuevosAnio.rows[0].total),
        clientesActivos: parseInt(activos.rows[0].total),
        topClientes: topClientes.rows.map(r => ({
          nombre: r.nombre.trim(),
          citas: parseInt(r.total_citas),
        })),
        clientesPorMes,
      }
    });
  } catch (err) {
    logger.app.error(`Error reporte clientes: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener reporte de clientes' });
  }
});

// ─── Reporte de Productividad ────────────────────────────────────────────────
// GET /api/reportes/productividad/:idEmpresa?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/reportes/productividad/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const anioActual = new Date().getFullYear();
    const desde = req.query.desde || inicioAnio(anioActual);
    const hasta = req.query.hasta || hoy();

    const [ranking, ticketPromedio, listaArtistas] = await Promise.all([
      // Ranking: citas + ingresos por artista en el período
      db.query(
        `SELECT e.nombre AS nombre,
                COUNT(DISTINCT c.idcita) AS total_citas,
                COALESCE(SUM(p.monto), 0) AS ingresos
         FROM empleado e
         JOIN tatuador t ON e.idempleado = t.idempleado
         LEFT JOIN cita c ON t.idtatuador = c.idtatuador
           AND c.fecha BETWEEN $2 AND $3
           AND c.idstatus_cita NOT IN (
             SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) = 'cancelada'
           )
         LEFT JOIN pago p ON c.idcita = p.idcita
           AND p.fecha BETWEEN $2 AND $3
         WHERE e.idempresa = $1
         GROUP BY e.idempleado, e.nombre
         ORDER BY total_citas DESC, ingresos DESC`,
        [idEmpresa, desde, hasta]
      ),
      // Ticket promedio general (pago.monto / citas con pago)
      db.query(
        `SELECT COALESCE(AVG(sub.total_cita), 0) AS ticket
         FROM (
           SELECT c.idcita, SUM(p.monto) AS total_cita
           FROM pago p
           JOIN cita c ON p.idcita = c.idcita
           JOIN tatuador t ON c.idtatuador = t.idtatuador
           JOIN empleado e ON t.idempleado = e.idempleado
           WHERE e.idempresa = $1 AND p.fecha BETWEEN $2 AND $3
           GROUP BY c.idcita
         ) sub`,
        [idEmpresa, desde, hasta]
      ),
      // Lista de artistas para el dropdown de filtros
      db.query(
        `SELECT e.idempleado, e.nombre
         FROM empleado e
         JOIN tatuador t ON e.idempleado = t.idempleado
         WHERE e.idempresa = $1
         ORDER BY e.nombre`,
        [idEmpresa]
      ),
    ]);

    return res.json({
      status: 'ok',
      data: {
        desde,
        hasta,
        ranking: ranking.rows.map((r, i) => ({
          posicion: i + 1,
          nombre: r.nombre,
          citas: parseInt(r.total_citas),
          ingresos: parseFloat(r.ingresos),
        })),
        ticketPromedio: parseFloat(ticketPromedio.rows[0].ticket),
        artistas: listaArtistas.rows.map(r => ({ id: r.idempleado, nombre: r.nombre })),
      }
    });
  } catch (err) {
    logger.app.error(`Error reporte productividad: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener reporte de productividad' });
  }
});

// ─── Reporte de Expedientes ──────────────────────────────────────────────────
// GET /api/reportes/expedientes/:idEmpresa?search=
router.get('/reportes/expedientes/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;
    const search = (req.query.search || '').trim();

    let query = `
      SELECT cl.idcliente,
             cl.nombre || ' ' || COALESCE(cl.apellido_paterno, '') AS nombre_completo,
             cl.correo,
             cl.telefono,
             MIN(c.fecha) AS primera_cita,
             MAX(c.fecha) AS ultima_cita,
             COUNT(DISTINCT c.idcita) AS total_citas,
             COALESCE(SUM(p.monto), 0) AS total_gastado
      FROM cliente cl
      JOIN cita c ON cl.idcliente = c.idcliente
      JOIN tatuador t ON c.idtatuador = t.idtatuador
      JOIN empleado e ON t.idempleado = e.idempleado
      LEFT JOIN pago p ON c.idcita = p.idcita
      WHERE e.idempresa = $1`;

    const params = [idEmpresa];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (cl.nombre ILIKE $${params.length}
                   OR cl.apellido_paterno ILIKE $${params.length}
                   OR cl.correo ILIKE $${params.length})`;
    }

    query += ` GROUP BY cl.idcliente, cl.nombre, cl.apellido_paterno, cl.correo, cl.telefono
               ORDER BY cl.nombre`;

    const result = await db.query(query, params);

    return res.json({
      status: 'ok',
      data: result.rows.map(r => ({
        id: r.idcliente,
        nombre: r.nombre_completo.trim(),
        correo: r.correo || '',
        telefono: r.telefono || '',
        primeraCita: r.primera_cita,
        ultimaCita: r.ultima_cita,
        totalCitas: parseInt(r.total_citas),
        totalGastado: parseFloat(r.total_gastado),
      }))
    });
  } catch (err) {
    logger.app.error(`Error reporte expedientes: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener expedientes' });
  }
});

// ─── Detalle completo de un expediente ──────────────────────────────────────
// GET /api/reportes/expediente-detalle/:idCliente/:idEmpresa
router.get('/reportes/expediente-detalle/:idCliente/:idEmpresa', async (req, res) => {
  try {
    const { idCliente, idEmpresa } = req.params;

    const [clienteRes, citasRes] = await Promise.all([
      db.query(
        `SELECT nombre, apellido_paterno, apellido_materno, correo, telefono
         FROM cliente WHERE idcliente = $1`,
        [idCliente]
      ),
      db.query(
        `SELECT c.idcita,
                c.fecha,
                c.hora,
                c.zonacuerpo,
                c.tamanio,
                sc.nombre AS estado_cita,
                e.nombre AS tatuador,
                tec.nombretecnica AS tecnica,
                COALESCE(co.preciofinal, co.montoestimado, 0) AS precio,
                COALESCE(sco.nombre, '—') AS estado_pago,
                COALESCE(SUM(p.monto), 0) AS pagado
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         JOIN status_cita sc ON c.idstatus_cita = sc.idstatus_cita
         LEFT JOIN tecnicas tec ON c.idtecnica = tec.idtecnica
         LEFT JOIN cotizacion co ON co.idcita = c.idcita
         LEFT JOIN status_cotizacion sco ON co.idstatus = sco.idstatus
         LEFT JOIN pago p ON p.idcita = c.idcita
         WHERE c.idcliente = $1 AND e.idempresa = $2
         GROUP BY c.idcita, c.fecha, c.hora, c.zonacuerpo, c.tamanio,
                  sc.nombre, e.nombre, tec.nombretecnica,
                  co.preciofinal, co.montoestimado, sco.nombre
         ORDER BY c.fecha DESC`,
        [idCliente, idEmpresa]
      ),
    ]);

    if (!clienteRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Cliente no encontrado' });
    }

    const cl = clienteRes.rows[0];
    return res.json({
      status: 'ok',
      data: {
        cliente: {
          nombre: `${cl.nombre} ${cl.apellido_paterno || ''}`.trim(),
          correo: cl.correo || '',
          telefono: cl.telefono || '',
        },
        citas: citasRes.rows.map(r => ({
          idCita:    r.idcita,
          fecha:     r.fecha,
          hora:      r.hora?.substring(0, 5) || '—',
          zona:      r.zonacuerpo || '—',
          tamanio:   r.tamanio   || '—',
          estado:    r.estado_cita,
          tatuador:  r.tatuador,
          tecnica:   r.tecnica   || '—',
          precio:    parseFloat(r.precio),
          estadoPago: r.estado_pago,
          pagado:    parseFloat(r.pagado),
        })),
      }
    });
  } catch (err) {
    logger.app.error(`Error expediente-detalle: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener expediente' });
  }
});

export default router;
