import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /horarios/semanal/:idTatuador — obtener horario base semanal
router.get('/horarios/semanal/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    const result = await db.query(
      `SELECT id, idtatuador, dia_semana, hora_inicio, hora_fin, activo
       FROM horario_base
       WHERE idtatuador = $1
       ORDER BY dia_semana`,
      [idTatuador]
    );

    const schedule = result.rows.map(row => ({
      dia: row.dia_semana,
      horaInicio: row.hora_inicio?.substring(0, 5) || null,
      horaFin: row.hora_fin?.substring(0, 5) || null,
    }));

    logger.app.info(`📅 Horario obtenido: tatuador=${idTatuador}, ${schedule.length} días configurados`);
    return res.json({ status: 'ok', data: schedule });
  } catch (error) {
    logger.app.error(`Error al obtener horario semanal: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener horario semanal' });
  }
});

// POST /horarios — guardar horario base semanal (max 7 filas por tatuador)
// Body: { idTatuador, horarioSemanal: [{ dia: 0-6, horaInicio: "09:00", horaFin: "18:00" }, ...] }
router.post('/horarios', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { idTatuador, horarioSemanal } = req.body;

    if (!idTatuador || !horarioSemanal || !Array.isArray(horarioSemanal)) {
      logger.app.warn(`POST /horarios — datos inválidos`);
      return res.status(400).json({ status: 'error', message: 'idTatuador y horarioSemanal son requeridos' });
    }

    await client.query('BEGIN');

    // Eliminar horario base existente y reinsertar
    await client.query('DELETE FROM horario_base WHERE idtatuador = $1', [idTatuador]);

    for (const entry of horarioSemanal) {
      const { dia, horaInicio, horaFin } = entry;
      if (dia == null || !horaInicio || !horaFin) continue;

      await client.query(
        `INSERT INTO horario_base (idtatuador, dia_semana, hora_inicio, hora_fin, activo)
         VALUES ($1, $2, $3, $4, true)`,
        [idTatuador, dia, horaInicio, horaFin]
      );
    }

    await client.query('COMMIT');

    logger.app.info(`✅ Horario base guardado para tatuador ${idTatuador} (${horarioSemanal.length} días)`);
    return res.status(201).json({ status: 'success', message: 'Horario guardado exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al guardar horario: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al guardar horario' });
  } finally {
    client.release();
  }
});

// PUT /horarios/:idTatuador — actualizar horario base completo
router.put('/horarios/:idTatuador', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { idTatuador } = req.params;
    const { horarioSemanal } = req.body;

    if (!horarioSemanal || !Array.isArray(horarioSemanal)) {
      logger.app.warn(`PUT /horarios/${idTatuador} — datos inválidos`);
      return res.status(400).json({ status: 'error', message: 'horarioSemanal es requerido' });
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM horario_base WHERE idtatuador = $1', [idTatuador]);

    for (const entry of horarioSemanal) {
      const { dia, horaInicio, horaFin } = entry;
      if (dia == null || !horaInicio || !horaFin) continue;

      await client.query(
        `INSERT INTO horario_base (idtatuador, dia_semana, hora_inicio, hora_fin, activo)
         VALUES ($1, $2, $3, $4, true)`,
        [idTatuador, dia, horaInicio, horaFin]
      );
    }

    await client.query('COMMIT');

    logger.app.info(`✅ Horario base actualizado para tatuador ${idTatuador} (${horarioSemanal.length} días)`);
    return res.json({ status: 'success', message: 'Horario actualizado exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al actualizar horario: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al actualizar horario' });
  } finally {
    client.release();
  }
});

// DELETE /horarios/:idTatuador — eliminar horario base completo de un tatuador
router.delete('/horarios/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    await db.query('DELETE FROM horario_base WHERE idtatuador = $1', [idTatuador]);
    logger.app.info(`🗑️ Horario eliminado: tatuador=${idTatuador}`);
    return res.json({ status: 'success', message: 'Horario eliminado' });
  } catch (error) {
    logger.app.error(`Error al eliminar horario: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al eliminar horario' });
  }
});

// ===== BLOQUEOS (usa tabla horas_disponibles con estadodisponibilidad = false) =====

// GET /horarios/bloqueos/:idTatuador — obtener horas bloqueadas
router.get('/horarios/bloqueos/:idTatuador', async (req, res) => {
  try {
    const { idTatuador } = req.params;
    const result = await db.query(
      `SELECT idhora, idtatuador, horainicio, horafin, fecha, estadodisponibilidad, motivo, tipo_bloqueo, dia_semana
       FROM horas_disponibles
       WHERE idtatuador = $1 AND estadodisponibilidad = false
       AND (tipo_bloqueo != 'unico' OR fecha >= CURRENT_DATE)
       ORDER BY tipo_bloqueo, fecha DESC, horainicio`,
      [idTatuador]
    );

    logger.app.info(`🚫 Bloqueos obtenidos: tatuador=${idTatuador}, ${result.rows.length} bloqueos`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error al obtener bloqueos: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener bloqueos' });
  }
});

// POST /horarios/bloqueos — crear bloqueo (1 fila por regla)
// Body: { idTatuador, tipo: 'unico'|'semanal'|'diario', fecha?, diaSemana?, horaInicio, horaFin, motivo? }
router.post('/horarios/bloqueos', async (req, res) => {
  try {
    const { idTatuador, tipo, fecha, diaSemana, horaInicio, horaFin, motivo } = req.body;

    if (!idTatuador || !horaInicio || !horaFin || !tipo) {
      logger.app.warn('POST /horarios/bloqueos — datos faltantes');
      return res.status(400).json({ status: 'error', message: 'idTatuador, tipo, horaInicio y horaFin son requeridos' });
    }

    if (tipo === 'unico' && !fecha) {
      return res.status(400).json({ status: 'error', message: 'La fecha es requerida para bloqueos de única vez' });
    }

    if (tipo === 'semanal' && diaSemana == null) {
      return res.status(400).json({ status: 'error', message: 'El día de la semana es requerido para bloqueos semanales' });
    }

    // 1 sola fila por regla de bloqueo
    const result = await db.query(
      `INSERT INTO horas_disponibles (idtatuador, horainicio, horafin, fecha, estadodisponibilidad, motivo, tipo_bloqueo, dia_semana)
       VALUES ($1, $2, $3, $4, false, $5, $6, $7)
       RETURNING *`,
      [
        idTatuador,
        horaInicio,
        horaFin,
        tipo === 'unico' ? fecha : null,
        motivo || null,
        tipo,
        tipo === 'semanal' ? diaSemana : null
      ]
    );

    logger.app.info(`🚫 Bloqueo creado: tatuador=${idTatuador}, tipo=${tipo}, ${horaInicio}-${horaFin}`);
    return res.status(201).json({ status: 'success', message: 'Bloqueo creado exitosamente', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error al crear bloqueo: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al crear bloqueo' });
  }
});

// DELETE /horarios/bloqueos/:id — eliminar un bloqueo específico
router.delete('/horarios/bloqueos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM horas_disponibles WHERE idhora = $1 AND estadodisponibilidad = false RETURNING idhora',
      [id]
    );

    if (result.rows.length === 0) {
      logger.app.warn(`DELETE /horarios/bloqueos/${id} — no encontrado`);
      return res.status(404).json({ status: 'error', message: 'Bloqueo no encontrado' });
    }

    logger.app.info(`🗑️ Bloqueo eliminado: id=${id}`);
    return res.json({ status: 'success', message: 'Bloqueo eliminado' });
  } catch (error) {
    logger.app.error(`Error al eliminar bloqueo: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al eliminar bloqueo' });
  }
});

export default router;
