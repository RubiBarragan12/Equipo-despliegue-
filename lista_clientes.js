import express from 'express';
import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// GET /api/lista-clientes?idempresa=1
// Clientes que tienen al menos una cita con
// un tatuador de la empresa dada.
// Sin idempresa → devuelve todos (fallback).
// ============================================
router.get('/', async (req, res) => {
    try {
        const { idempresa, search } = req.query;

        let idsClientes = null;

        if (idempresa) {
            // 1. Empleados de la empresa
            const { data: empleados, error: errEmp } = await supabase
                .from('empleado')
                .select('idempleado')
                .eq('idempresa', idempresa);

            if (errEmp) throw new Error(errEmp.message);
            if (!empleados?.length) return res.json({ clientes: [] });

            const idsEmpleados = empleados.map(e => e.idempleado);

            // 2. Tatuadores de esos empleados
            const { data: tatuadores, error: errTat } = await supabase
                .from('tatuador')
                .select('idtatuador')
                .in('idempleado', idsEmpleados);

            if (errTat) throw new Error(errTat.message);
            if (!tatuadores?.length) return res.json({ clientes: [] });

            const idsTatuadores = tatuadores.map(t => t.idtatuador);

            // 3. idcliente DISTINCT con cita en esos tatuadores
            const { data: citas, error: errCitas } = await supabase
                .from('cita')
                .select('idcliente')
                .in('idtatuador', idsTatuadores);

            if (errCitas) throw new Error(errCitas.message);
            if (!citas?.length) return res.json({ clientes: [] });

            // Deduplicar ids
            idsClientes = [...new Set(citas.map(c => c.idcliente))];
        }

        // 4. Traer datos de los clientes filtrados
        let query = supabase
            .from('cliente')
            .select('idcliente, nombre, apellido_paterno, apellido_materno, correo, telefono')
            .order('nombre', { ascending: true });

        if (idsClientes) {
            query = query.in('idcliente', idsClientes);
        }

        if (search?.trim()) {
            query = query.or(
                `nombre.ilike.%${search}%,apellido_paterno.ilike.%${search}%,correo.ilike.%${search}%,telefono.ilike.%${search}%`
            );
        }

        const { data: clientes, error: errClientes } = await query;
        if (errClientes) throw new Error(errClientes.message);

        const resultado = (clientes || []).map(c => ({
            id:               c.idcliente,
            nombre:           c.nombre           ?? '',
            apellido_paterno: c.apellido_paterno  ?? '',
            apellido_materno: c.apellido_materno  ?? '',
            correo:           c.correo            ?? '',
            telefono:         c.telefono          ?? '',
        }));

        res.json({ clientes: resultado });

    } catch (err) {
        logger.app.error('Error en GET /lista-clientes: ' + err.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

export default router;