import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /negocio/:idEmpresa - Obtener datos de la empresa
router.get('/negocio/:idEmpresa', async (req, res) => {
    try {
        const { idEmpresa } = req.params;
        const result = await db.query('SELECT * FROM Empresa WHERE idEmpresa = $1', [idEmpresa]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Empresa no encontrada' });
        }

        return res.json({ status: 'ok', data: result.rows[0] });
    } catch (error) {
        logger.app.error(`Error al obtener empresa: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error interno' });
    }
});

// POST /negocio/configurar - Crear o Actualizar Negocio y Perfil
router.post('/negocio/configurar', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { 
            idEmpleado, idEmpresa, // IDs para identificar
            nombreDueno, telefonoDueno, // Datos Empleado
            nombreBiz, telefonoBiz, direccion, ciudad, estado, pais // Datos Empresa
        } = req.body;

        await client.query('BEGIN');

        let currentIdEmpresa = idEmpresa;

        // 1. Manejo de la Empresa
        if (!currentIdEmpresa) {
            // CREAR EMPRESA si no existe
            const bizRes = await client.query(
                `INSERT INTO Empresa (nombre, telefono, direccion, ciudad, estado, pais) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING idEmpresa`,
                [nombreBiz, telefonoBiz, direccion, ciudad, estado, pais]
            );
            currentIdEmpresa = bizRes.rows[0].idempresa;

            // Vincular al Empleado con la nueva empresa
            await client.query(
                `UPDATE Empleado SET idEmpresa = $1 WHERE idEmpleado = $2`,
                [currentIdEmpresa, idEmpleado]
            );
        } else {
            // ACTUALIZAR EMPRESA existente
            await client.query(
                `UPDATE Empresa SET nombre=$1, telefono=$2, direccion=$3, ciudad=$4, estado=$5, pais=$6 
                 WHERE idEmpresa = $7`,
                [nombreBiz, telefonoBiz, direccion, ciudad, estado, pais, currentIdEmpresa]
            );
        }

        // 2. Actualizar datos del Dueño (Empleado)
        const userRes = await client.query(
            `UPDATE Empleado SET nombre=$1, telefono=$2 WHERE idEmpleado = $3 RETURNING *`,
            [nombreDueno, telefonoDueno, idEmpleado]
        );

        await client.query('COMMIT');

        logger.app.info(`🏢 Configuración actualizada: Empleado ${idEmpleado}, Empresa ${currentIdEmpresa}`);
        
        return res.json({ 
            status: 'success', 
            message: 'Datos guardados correctamente',
            data: {
                user: userRes.rows[0],
                idEmpresa: currentIdEmpresa
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.app.error(`Error en configuración de negocio: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'No se pudo guardar la configuración' });
    } finally {
        client.release();
    }
});

export default router;