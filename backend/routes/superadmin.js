import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.js';

const router = express.Router();

// ===== OBTENER TODOS LOS ADMINISTRADORES (PARA EL DIRECTORIO) =====
router.get('/administradores', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.idempleado, 
        e.nombre, 
        e.foto_url, 
        COALESCE(emp.nombre, 'Sin empresa asignada') AS nombre_empresa,
        e.idempresa
      FROM empleado e
      LEFT JOIN empresa emp ON e.idempresa = emp.idempresa
      JOIN roles r ON e.idrol = r.idrol
      WHERE r.idrol = 1 -- Solo rol Admin 
      AND LOWER(r.rol) NOT LIKE '%super%'
      ORDER BY e.nombre ASC;
    `;
    
    const result = await db.query(query);
    
    // Obtenemos el total de admins para el bento de stats
    const totalAdmins = result.rows.length;

    logger.app.info(`👥 SuperAdmin listó ${totalAdmins} administradores`);
    
    return res.json({ 
      status: 'ok', 
      total: totalAdmins,
      data: result.rows 
    });
  } catch (error) {
    logger.app.error(`Error al obtener administradores: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ===== DETALLES Y STATS DE UN ADMINISTRADOR ESPECÍFICO =====
router.get('/administradores/:idEmpleado', async (req, res) => {
  try {
    const { idEmpleado } = req.params;

    const query = `
      SELECT 
        e.idempleado, e.nombre, e.correo, e.telefono, e.fecha_nacimiento, e.foto_url,
        e.idempresa, 
        COALESCE(emp.nombre, 'Sin empresa asignada') AS empresa_nombre, 
        emp.direccion, emp.ciudad,
        -- Si idempresa es nulo, estas subconsultas devolverán 0 automáticamente
        (SELECT COUNT(*) FROM empleado emp2 WHERE emp2.idempresa = e.idempresa AND emp2.idempleado != e.idempleado) AS total_staff,
        (SELECT COUNT(*) FROM tatuador t JOIN empleado emp3 ON t.idempleado = emp3.idempleado WHERE emp3.idempresa = e.idempresa) AS total_tatuadores,
        (SELECT COUNT(*) FROM cita c JOIN tatuador t2 ON c.idtatuador = t2.idtatuador JOIN empleado emp4 ON t2.idempleado = emp4.idempleado WHERE emp4.idempresa = e.idempresa) AS total_citas
      FROM empleado e
      LEFT JOIN empresa emp ON e.idempresa = emp.idempresa
      WHERE e.idempleado = $1;
    `;

    const result = await db.query(query, [idEmpleado]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Administrador no encontrado' });
    }

    return res.json({ status: 'ok', data: result.rows[0] });
  } catch (error) {
    logger.app.error(`Error al obtener detalle del admin: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Error al obtener detalles' });
  }
});

// ===== REGISTRAR NUEVO ADMINISTRADOR (SUPABASE AUTH + DB) =====
router.post('/administradores', async (req, res) => {
  const client = await db.pool.connect();
  const { nombre, correo, contrasenia, fechaNacimiento, telefono} = req.body;

  try {
    // 1. Validaciones previas
    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
    }

    // 2. Verificar si el correo ya existe en la DB local
    const checkEmail = await db.query(
      'SELECT correo FROM empleado WHERE correo = $1 UNION SELECT correo FROM cliente WHERE correo = $1',
      [correo]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'El correo ya está registrado' });
    }

    // 3. Crear usuario en Supabase Auth usando el service_role (Admin API)
    // Esto no cierra la sesión del Super Admin que está operando
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: correo,
      password: contrasenia,
      email_confirm: true,
      user_metadata: { full_name: nombre, role: 'admin' }
    });

    if (authError) {
      logger.app.error(`Error Supabase Auth: ${authError.message}`);
      return res.status(400).json({ status: 'error', message: authError.message });
    }

    const supabaseUser = authData.user;

    // 4. Iniciar transacción en la DB local
    await client.query('BEGIN');

    // 5. Insertar en tabla empleado vinculando el user_id de Supabase
    const insertEmpleado = `
      INSERT INTO empleado (idrol, nombre, correo, contrasenia, fecha_nacimiento, telefono, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING idempleado, nombre, correo;
    `;

    const empResult = await client.query(insertEmpleado, [
      1, // idrol para Admin (ajustar si es diferente)
      nombre,
      correo,
      contrasenia, // Guardamos referencia (opcional si ya está en Auth)
      fechaNacimiento || null,
      telefono || null,
      supabaseUser.id // <--- ID de Supabase
    ]);

    await client.query('COMMIT');
    logger.app.info(`✅ Admin creado en Auth y DB: ${correo}`);

    return res.status(201).json({
      status: 'success',
      message: 'Administrador registrado con éxito',
      data: empResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.app.error(`Error en registro admin: ${error.message}`);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    client.release();
  }
});

export default router;