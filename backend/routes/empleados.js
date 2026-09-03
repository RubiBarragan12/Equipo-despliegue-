import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// GET /roles — devuelve todos los roles excepto Dueño (id=1)
router.get('/roles', async (req, res) => {
  try {
    const result = await db.query('SELECT idrol, rol FROM roles WHERE idrol != 1 ORDER BY idrol');
    logger.app.info(`📋 Roles obtenidos: ${result.rows.length}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error al obtener roles: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener roles' });
  }
});

// GET /empleados — lista todos los empleados con su rol sin listar Dueños
router.get('/empleados', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.idempleado, e.nombre, e.correo, e.telefono, e.fecha_nacimiento,
             r.rol, r.idrol,
             t.idtatuador, t.porcentajecomision
      FROM empleado e
      LEFT JOIN roles r ON e.idrol = r.idrol
      LEFT JOIN tatuador t ON t.idempleado = e.idempleado
      WHERE e.idrol != 1
      ORDER BY e.idempleado DESC
    `);
    logger.app.info(`👥 Empleados listados: ${result.rows.length}`);
    return res.json({ status: 'ok', data: result.rows });
  } catch (error) {
    logger.app.error(`Error al listar empleados: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al listar empleados' });
  }
});

// GET /empleados/:id — obtener un empleado por ID
router.get('/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT e.idempleado, e.nombre, e.correo, e.telefono, e.fecha_nacimiento, e.idrol,
             r.rol,
             t.idtatuador, t.porcentajecomision
      FROM empleado e
      LEFT JOIN roles r ON e.idrol = r.idrol
      LEFT JOIN tatuador t ON t.idempleado = e.idempleado
      WHERE e.idempleado = $1
    `, [id]);

    if (result.rows.length === 0) {
      logger.app.warn(`Empleado no encontrado: id=${id}`);
      return res.status(404).json({ status: 'error', message: 'Empleado no encontrado' });
    }
    logger.app.info(`👤 Empleado obtenido: id=${id} - ${result.rows[0].nombre}`);
    return res.json({ status: 'ok', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error al obtener empleado: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener empleado' });
  }
});

// POST /empleados — crear un nuevo empleado
router.post('/empleados', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { nombre, correo, contrasenia, telefono, fechaNacimiento, idRol, porcentajeComision, horarioSemanal, idEmpresa } = req.body;

    // Validar campos requeridos
    if (!nombre || !correo || !contrasenia || !telefono || !idRol) {
      logger.app.warn(`POST /empleados — campos faltantes`);
      return res.status(400).json({
        status: 'error',
        message: 'Nombre, correo, contraseña, teléfono y rol son requeridos'
      });
    }

    // Verificar correo duplicado en empleado y cliente
    const checkEmail = await db.query(
      'SELECT correo FROM empleado WHERE correo = $1 UNION SELECT correo FROM cliente WHERE correo = $1',
      [correo]
    );

    if (checkEmail.rows.length > 0) {
      logger.app.warn(`POST /empleados — correo duplicado: ${correo}`);
      return res.status(409).json({ status: 'error', message: 'El correo ya está registrado' });
    }

    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
        email: correo,
        password: contrasenia,
        email_confirm: true // opcional (evita confirmación por correo)
    });

    if(error) {
      logger.app.error(`Error en Supabase Auth: ${error.message}`);
      return res.status(400).json({ status: 'error', message: error.message });
    }

    const user = data.user;

    await client.query('BEGIN');
    console.log('Creando empleado en DB con user_id:', user.id, 'y idEmpresa:', idEmpresa);
    // Insertar empleado
    const insertEmpleado = `
      INSERT INTO empleado (nombre, correo, contrasenia, telefono, fecha_nacimiento, idrol, user_id, idempresa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING idempleado, nombre, correo, telefono, fecha_nacimiento, idrol
    `;
    const empResult = await client.query(insertEmpleado, [
      nombre, correo, contrasenia, telefono, fechaNacimiento || null, idRol, user.id, idEmpresa
    ]);
    const empleado = empResult.rows[0];

    // Si es tatuador, insertar en tabla tatuador
    const rolResult = await client.query('SELECT rol FROM roles WHERE idrol = $1', [idRol]);
    const rolNombre = rolResult.rows[0]?.rol?.toLowerCase();

    let tatuador = null;
    if (rolNombre === 'tatuador') {
      const insertTatuador = `
        INSERT INTO tatuador (porcentajecomision, idempleado)
        VALUES ($1, $2)
        RETURNING idtatuador, porcentajecomision
      `;
      const tatResult = await client.query(insertTatuador, [
        porcentajeComision || 0, empleado.idempleado
      ]);
      tatuador = tatResult.rows[0];

      // Guardar horario base semanal (max 7 filas)
      if (horarioSemanal && Array.isArray(horarioSemanal) && horarioSemanal.length > 0) {
        for (const entry of horarioSemanal) {
          const { dia, horaInicio, horaFin } = entry;
          if (dia == null || !horaInicio || !horaFin) continue;

          await client.query(
            `INSERT INTO horario_base (idtatuador, dia_semana, hora_inicio, hora_fin, activo)
             VALUES ($1, $2, $3, $4, true)`,
            [tatuador.idtatuador, dia, horaInicio, horaFin]
          );
        }
      }
    }

    await client.query('COMMIT');

    logger.app.info(`✅ Empleado creado: ${empleado.idempleado} - ${empleado.correo} (${rolNombre})`);

    return res.status(201).json({
      status: 'success',
      message: 'Empleado registrado exitosamente',
      data: { ...empleado, rol: rolNombre, tatuador, user_id: user.id }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al crear empleado: ${error.message}`);

    if (error.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'El correo ya está registrado' });
    }
    return res.status(500).json({ status: 'error', message: 'Error al crear empleado' });
  } finally {
    client.release();
  }
});

// PUT /empleados/:id — actualizar un empleado
router.put('/empleados/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { nombre, correo, telefono, fechaNacimiento, idRol, porcentajeComision, horarioSemanal } = req.body;

    // Verificar que exista
    const exists = await client.query('SELECT idempleado, idrol, user_id FROM empleado WHERE idempleado = $1', [id]);
    if (exists.rows.length === 0) {
      logger.app.warn(`PUT /empleados/${id} — no encontrado`);
      return res.status(404).json({ status: 'error', message: 'Empleado no encontrado' });
    }

    const user_id = exists.rows[0].user_id;

    
    await client.query('BEGIN');
    
    const updateQuery = `
    UPDATE empleado
    SET nombre = COALESCE($1, nombre),
    correo = COALESCE($2, correo),
    telefono = COALESCE($3, telefono),
    fecha_nacimiento = COALESCE($4, fecha_nacimiento),
    idrol = COALESCE($5, idrol)
    WHERE idempleado = $6
    RETURNING idempleado, nombre, correo, telefono, fecha_nacimiento, idrol
    `;
    const result = await client.query(updateQuery, [
      nombre, correo, telefono, fechaNacimiento, idRol, id
    ]);
    
    console.log('Empleado actualizado en DB:', result.rows[0]);

    // si tiene correo en users de supabase auth actualizarlo
    if (correo) {
      const { error } = await supabase.auth.admin.updateUserById(user_id, { email: correo });
      if (error){
        return res.status(400).json({ status: 'error', message: 'Error al actualizar correo en Supabase Auth' });
      };
    }

    console.log('Empleado actualizado en Supabase Auth:', correo);
    
    // Manejar tabla tatuador
    const rolResult = await client.query('SELECT rol FROM roles WHERE idrol = $1', [idRol || exists.rows[0].idrol]);
    const rolNombre = rolResult.rows[0]?.rol?.toLowerCase();

    if (rolNombre === 'tatuador') {
      // Upsert en tatuador
      const tatExists = await client.query('SELECT idtatuador FROM tatuador WHERE idempleado = $1', [id]);
      if (tatExists.rows.length > 0) {
        await client.query('UPDATE tatuador SET porcentajecomision = $1 WHERE idempleado = $2', [porcentajeComision || 0, id]);
      } else {
        await client.query('INSERT INTO tatuador (porcentajecomision, idempleado) VALUES ($1, $2)', [porcentajeComision || 0, id]);
      }

      // Actualizar horario base si se proporcionó
      if (horarioSemanal && Array.isArray(horarioSemanal)) {
        const tatId = await client.query('SELECT idtatuador FROM tatuador WHERE idempleado = $1', [id]);
        const idTatuador = tatId.rows[0]?.idtatuador;
        if (idTatuador) {
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
        }
      }
    } else {
      // Si ya no es tatuador, eliminar horario base y de tabla tatuador
      const tatId = await client.query('SELECT idtatuador FROM tatuador WHERE idempleado = $1', [id]);
      if (tatId.rows.length > 0) {
        await client.query('DELETE FROM horario_base WHERE idtatuador = $1', [tatId.rows[0].idtatuador]);
      }
      await client.query('DELETE FROM tatuador WHERE idempleado = $1', [id]);
    }

    await client.query('COMMIT');

    logger.app.info(`✅ Empleado actualizado: ${id}`);
    return res.json({ status: 'success', message: 'Empleado actualizado', data: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al actualizar empleado: ${error.message}`);
    if (error.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'El correo ya está en uso' });
    }
    return res.status(500).json({ status: 'error', message: 'Error al actualizar empleado' });
  } finally {
    client.release();
  }
});

// DELETE /empleados/:id — eliminar un empleado
router.delete('/empleados/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    
    // Revisar si el empleado tiene un user_id asociado en Supabase Auth y eliminarlo ANTES de eliminar el empleado para evitar inconsistencias
    const userIdResult = await client.query('SELECT user_id FROM empleado WHERE idempleado = $1', [id]);
    const userId = userIdResult.rows[0]?.user_id;

    const exists = await client.query('SELECT idempleado FROM empleado WHERE idempleado = $1', [id]);
    if (exists.rows.length === 0) {
      logger.app.warn(`DELETE /empleados/${id} — no encontrado`);
      return res.status(404).json({ status: 'error', message: 'Empleado no encontrado' });
    }

    await client.query('BEGIN');
    
    // Eliminar horario base del tatuador si existe
    const tatId = await client.query('SELECT idtatuador FROM tatuador WHERE idempleado = $1', [id]);
    if (tatId.rows.length > 0) {
      // Revisar que no tenga registros relacionados que impidan la eliminación (ej. citas, ventas, etc)
      const tatuadorConCitas = await client.query('SELECT 1 FROM cita WHERE idtatuador = $1 LIMIT 1', [tatId.rows[0].idtatuador]);

      if(tatuadorConCitas.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ status: 'error', message: 'El tatuador tiene citas asociadas y no puede ser eliminado' });
      }

      await client.query('DELETE FROM horario_base WHERE idtatuador = $1', [tatId.rows[0].idtatuador]);
    }
    // Eliminar tatuador si existe (FK)
    await client.query('DELETE FROM tatuador WHERE idempleado = $1', [id]);

    // Eliminar empleado
    await client.query('DELETE FROM empleado WHERE idempleado = $1', [id]);

    // Eliminamos de supabase auth si tiene user_id asociado para evitar usuarios huérfanos
    if (userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        logger.app.error(`Error al eliminar usuario en Supabase Auth: ${error.message}`);
        return res.status(400).json({ status: 'error', message: 'Error al eliminar usuario en Supabase Auth' });
      }
    }

    await client.query('COMMIT');

    logger.app.info(`🗑️ Empleado eliminado: ${id}`);
    
    return res.json({ status: 'success', message: 'Empleado eliminado' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error al eliminar empleado: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al eliminar empleado' });
  } finally {
    client.release();
  }
});

export default router;
