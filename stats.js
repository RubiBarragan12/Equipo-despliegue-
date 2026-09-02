import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/stats/empresa/:idEmpresa
// Estadísticas del dashboard del admin/dueño
router.get('/stats/empresa/:idEmpresa', async (req, res) => {
  try {
    const { idEmpresa } = req.params;

    const hoy = new Date().toISOString().split('T')[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1);
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];

    const [citasHoy, ingresosHoy, ingresosSemana, artistas] = await Promise.all([
      // Citas de hoy para esta empresa
      db.query(
        `SELECT COUNT(*) AS total
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND c.fecha = $2
         AND c.idstatus_cita NOT IN (
           SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) IN ('cancelada')
         )`,
        [idEmpresa, hoy]
      ),
      // Ingresos del día
      db.query(
        `SELECT COALESCE(SUM(p.monto), 0) AS total
         FROM pago p
         JOIN cotizacion co ON p.idcotizacion = co.idcotizacion
         JOIN cita c ON co.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND p.fecha = $2`,
        [idEmpresa, hoy]
      ),
      // Ingresos de la semana
      db.query(
        `SELECT COALESCE(SUM(p.monto), 0) AS total
         FROM pago p
         JOIN cotizacion co ON p.idcotizacion = co.idcotizacion
         JOIN cita c ON co.idcita = c.idcita
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND p.fecha >= $2`,
        [idEmpresa, inicioSemanaStr]
      ),
      // Citas por artista esta semana (para ocupación)
      db.query(
        `SELECT e.nombre AS tatuador_nombre,
                COUNT(c.idcita) AS citas_semana
         FROM cita c
         JOIN tatuador t ON c.idtatuador = t.idtatuador
         JOIN empleado e ON t.idempleado = e.idempleado
         WHERE e.idempresa = $1 AND c.fecha >= $2
         AND c.idstatus_cita NOT IN (
           SELECT idstatus_cita FROM status_cita WHERE LOWER(nombre) IN ('cancelada')
         )
         GROUP BY e.nombre
         ORDER BY citas_semana DESC
         LIMIT 5`,
        [idEmpresa, inicioSemanaStr]
      ),
    ]);

    // Calcular % de ocupación relativo al que más tiene
    const maxCitas = artistas.rows.length > 0
      ? Math.max(...artistas.rows.map(a => parseInt(a.citas_semana)))
      : 1;

    const artistasConPct = artistas.rows.map(a => ({
      nombre: a.tatuador_nombre,
      citasSemana: parseInt(a.citas_semana),
      pct: maxCitas > 0 ? Math.round((parseInt(a.citas_semana) / maxCitas) * 100) : 0,
    }));

    return res.json({
      status: 'ok',
      data: {
        citasHoy: parseInt(citasHoy.rows[0].total),
        ingresosHoy: parseFloat(ingresosHoy.rows[0].total),
        ingresosSemana: parseFloat(ingresosSemana.rows[0].total),
        artistas: artistasConPct,
      }
    });

  } catch (error) {
    logger.app.error(`Error stats empresa: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener estadísticas' });
  }
});

// GET /api/stats/agenda-dia/:idTatuador?fecha=YYYY-MM-DD
// Agenda del día para un tatuador
router.get('/stats/agenda-dia/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT c.idcita, c.hora, c.zonacuerpo, c.tamanio,
              sc.nombre AS estado,
              cl.nombre AS cliente_nombre, cl.apellido_paterno AS cliente_apellido,
              tec.nombretecnica AS tecnica
       FROM cita c
       JOIN status_cita sc ON c.idstatus_cita = sc.idstatus_cita
       JOIN cliente cl ON c.idcliente = cl.idcliente
       LEFT JOIN tecnicas tec ON c.idtecnica = tec.idtecnica
       WHERE c.idtatuador = $1 AND c.fecha = $2
       AND LOWER(sc.nombre) NOT IN ('cancelada')
       ORDER BY c.hora`,
      [idTatuador, fecha]
    );

    return res.json({
      status: 'ok',
      data: result.rows.map(r => ({
        idCita: r.idcita,
        hora: r.hora?.substring(0, 5) || '—',
        zona: r.zonacuerpo || '—',
        tamanio: r.tamanio || null,
        estado: r.estado,
        cliente: `${r.cliente_nombre} ${r.cliente_apellido || ''}`.trim(),
        tecnica: r.tecnica || null,
      }))
    });

  } catch (error) {
    logger.app.error(`Error agenda-dia: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener agenda' });
  }
});

export default router;
