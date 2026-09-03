import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// POST /login - Autenticar usuario
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.app.warn('POST /login — correo o contraseña vacíos');
      return res.status(400).json({
        status: 'error',
        message: 'Correo y contraseña son requeridos'
      });
    }

    logger.app.info(`🔍 Intento de login: ${email}`);

    // 1. Buscar en la tabla de clientes
    const clienteResult = await db.query(
      'SELECT idcliente, nombre, apellido_paterno, correo, contrasenia FROM cliente WHERE correo = $1',
      [email]
    );

    if (clienteResult.rows.length > 0) {
      const cliente = clienteResult.rows[0];

      if (cliente.contrasenia !== password) {
        logger.app.warn(`❌ Login fallido (cliente): ${email} — contraseña incorrecta`);
        return res.status(401).json({
          status: 'error',
          message: 'Correo o contraseña incorrectos'
        });
      }

      logger.app.info(`✅ Login exitoso (cliente): ${email}`);
      return res.json({
        status: 'ok',
        message: 'Login exitoso',
        data: {
          id: cliente.idcliente,
          nombre: cliente.nombre,
          apellido: cliente.apellido_paterno || '',
          correo: cliente.correo,
          rol: 'cliente',
          tipo: 'cliente'
        }
      });
    }

    // 2. Buscar en la tabla de empleados (con rol y tatuador)
    const empleadoResult = await db.query(
      `SELECT e.idempleado, e.nombre, e.correo, e.contrasenia, e.idempresa, r.rol,
              t.idtatuador,
              emp.nombre AS empresa_nombre, emp.direccion AS empresa_direccion,
              emp.ciudad AS empresa_ciudad, emp.estado AS empresa_estado,
              emp.pais AS empresa_pais, emp.telefono AS empresa_telefono
       FROM empleado e
       LEFT JOIN roles r ON e.idrol = r.idrol
       LEFT JOIN tatuador t ON e.idempleado = t.idempleado
       LEFT JOIN empresa emp ON e.idempresa = emp.idempresa
       WHERE e.correo = $1`,
      [email]
    );

    if (empleadoResult.rows.length === 0) {
      logger.app.warn(`❌ Login fallido: ${email} — no encontrado`);
      return res.status(401).json({
        status: 'error',
        message: 'Correo o contraseña incorrectos'
      });
    }

    const empleado = empleadoResult.rows[0];

    if (empleado.contrasenia !== password) {
      logger.app.warn(`❌ Login fallido (${empleado.rol || 'empleado'}): ${email} — contraseña incorrecta`);
      return res.status(401).json({
        status: 'error',
        message: 'Correo o contraseña incorrectos'
      });
    }

    // Normalizar rol a minúsculas
    const rol = (empleado.rol || 'dueño').toLowerCase();
    const esTatuador = rol === 'tatuador';

    // 🔥 IMPORTANTE: Para tatuadores, usar idtatuador como ID principal
    const userId = esTatuador && empleado.idtatuador ? empleado.idtatuador : empleado.idempleado;

    logger.app.info(`✅ Login exitoso (${rol}): ${email}, ID: ${userId}, idtatuador: ${empleado.idtatuador || 'N/A'}`);

    res.json({
      status: 'ok',
      message: 'Login exitoso',
      data: {
        id: userId,  // ← Para tatuadores, esto es idtatuador
        idempleado: empleado.idempleado,
        idtatuador: empleado.idtatuador || null,
        nombre: empleado.nombre,
        correo: empleado.correo,
        rol: rol,
        tipo: 'empleado',
        empresa: empleado.idempresa ? {
          idEmpresa: empleado.idempresa,
          nombre: empleado.empresa_nombre,
          direccion: empleado.empresa_direccion,
          ciudad: empleado.empresa_ciudad,
          estado: empleado.empresa_estado,
          pais: empleado.empresa_pais,
          telefono: empleado.empresa_telefono
        } : null
      }
    });

  } catch (error) {
    logger.app.error(`❌ Error en login: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Error en el servidor'
    });
  }
});

// ============================================
// GET /user-info/:id - Obtener información del usuario
// ============================================
router.get('/user-info/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Intentar buscar en empleados (con su rol)
    const empResult = await db.query(
      `SELECT e.*, r.rol, emp.nombre AS empresa_nombre
       FROM empleado e
       LEFT JOIN roles r ON e.idrol = r.idrol
       LEFT JOIN empresa emp ON e.idempresa = emp.idempresa
       WHERE e.user_id = $1`,
      [id]
    );

    if (empResult.rows.length > 0) {
      const empleado = empResult.rows[0];
      // Normalizamos el rol para que siempre empiece con Mayúscula
      const rolFixed = empleado.rol.charAt(0).toUpperCase() + empleado.rol.slice(1).toLowerCase();
      return res.json({ ...empleado, rol: rolFixed });
    }

    // 2. Si no es empleado, buscar en clientes
    const cliResult = await db.query(
      'SELECT * FROM cliente WHERE user_id = $1',
      [id]
    );

    if (cliResult.rows.length > 0) {
      return res.json({ ...cliResult.rows[0], rol: 'cliente' });
    }

    return res.status(404).json({ message: 'Usuario no encontrado' });

  } catch (error) {
    console.error('Error en user-info:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ============================================
// POST /reset-password - Restablecer contraseña
// ============================================
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email y nueva contraseña son requeridos' 
            });
        }
        
        // Buscar en tabla cliente
        const clienteResult = await db.query(
            'SELECT idcliente FROM cliente WHERE correo = $1',
            [email]
        );
        
        if (clienteResult.rows.length > 0) {
            await db.query(
                'UPDATE cliente SET contrasenia = $1 WHERE correo = $2',
                [newPassword, email]
            );
            
            logger.app.info(`✅ Contraseña actualizada para cliente: ${email}`);
            return res.json({ 
                status: 'ok', 
                message: 'Contraseña actualizada correctamente',
                tipo: 'cliente'
            });
        }
        
        // Buscar en tabla empleado
        const empleadoResult = await db.query(
            'SELECT idempleado FROM empleado WHERE correo = $1',
            [email]
        );
        
        if (empleadoResult.rows.length > 0) {
            await db.query(
                'UPDATE empleado SET contrasenia = $1 WHERE correo = $2',
                [newPassword, email]
            );
            
            logger.app.info(`✅ Contraseña actualizada para empleado: ${email}`);
            return res.json({ 
                status: 'ok', 
                message: 'Contraseña actualizada correctamente',
                tipo: 'empleado'
            });
        }
        
        return res.status(404).json({ 
            status: 'error', 
            message: 'Usuario no encontrado' 
        });
        
    } catch (error) {
        logger.app.error(`Error en reset-password: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error en el servidor' });
    }
});

export default router;