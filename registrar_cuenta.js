import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.js';


const router = express.Router();

/**
 * POST /registrar
 * Registrar un nuevo cliente en la tabla Cliente
 */
router.post('/registrar', async (req, res) => {
    try {
        const { nombre, correo, apellido_paterno, apellido_materno, telefono, contrasenia } = req.body;

        logger.app.info(`📝 Intento de registro con: ${correo}`);

        if (!nombre || !correo || !apellido_paterno || !apellido_materno || !telefono || !contrasenia) {
            return res.status(400).json({
                status: 'error',
                message: 'Todos los campos son requeridos'
            });
        }

        // 🔹 1. Crear usuario en Supabase Auth
        const { data, error } = await supabase.auth.admin.createUser({
            email: correo,
            password: contrasenia,
            email_confirm: true // opcional (evita confirmación por correo)
        });

        if (error) {
            logger.app.error(`❌ Error en Supabase Auth: ${error.message}`);
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }

        const user = data.user;

        // 🔹 2. Validar si ya existe en tu tabla (extra seguridad)
        const checkEmail = 'SELECT correo FROM cliente WHERE correo = $1';
        const emailResult = await db.query(checkEmail, [correo]);

        if (emailResult.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'El correo ya está registrado'
            });
        }

        // 🔹 3. Insertar en tu tabla (guardando el id de Supabase)
        const insertQuery = `
            INSERT INTO cliente (nombre, apellido_paterno, apellido_materno, correo, contrasenia, telefono, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING idcliente, nombre, correo, telefono
        `;

        const result = await db.query(insertQuery, [
            nombre,
            apellido_paterno,
            apellido_materno,
            correo,
            contrasenia,
            telefono,
            user.id // 👈 ID de Supabase
        ]);

        const cliente = result.rows[0];

        logger.app.info(`✅ Cliente registrado: ${cliente.idcliente}`);

        return res.status(201).json({
            status: 'success',
            message: 'Cliente registrado exitosamente',
            cliente
        });

    } catch (error) {
        logger.app.error(`❌ Error en registro: ${error.message}`);

        return res.status(500).json({
            status: 'error',
            message: 'Error al registrar el cliente',
            error: error.message
        });
    }
});

export default router;
