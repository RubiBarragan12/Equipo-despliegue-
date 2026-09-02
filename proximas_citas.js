import express from 'express';
import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// GET /api/proximas-citas?idempresa=5
// Citas futuras filtradas por empresa via:
// cita → tatuador → empleado → empresa
// ============================================
router.get('/', async (req, res) => {
    try {
        const { idempresa } = req.query;

        if (!idempresa) {
            return res.status(400).json({ message: 'Se requiere idempresa' });
        }

        // 1. idempleado de la empresa
        const { data: empleados, error: errEmp } = await supabase
            .from('empleado')
            .select('idempleado')
            .eq('idempresa', idempresa);

        if (errEmp) throw new Error(errEmp.message);
        if (!empleados?.length) return res.json({ citas: [] });

        const idsEmpleados = empleados.map(e => e.idempleado);

        // 2. idtatuador de esos empleados
        const { data: tatuadores, error: errTat } = await supabase
            .from('tatuador')
            .select('idtatuador')
            .in('idempleado', idsEmpleados);

        if (errTat) throw new Error(errTat.message);
        if (!tatuadores?.length) return res.json({ citas: [] });

        const idsTatuadores = tatuadores.map(t => t.idtatuador);

        // 3. Citas futuras con cliente y estado
        const hoy = new Date().toISOString().split('T')[0];

        const { data: citas, error: errCitas } = await supabase
            .from('cita')
            .select(`
                idcita,
                fecha,
                hora,
                zonacuerpo,
                idstatus_cita,
                cliente ( nombre, apellido_paterno ),
                status_cita ( nombre )
            `)
            .in('idtatuador', idsTatuadores)
            .gte('fecha', hoy)
            .not('idstatus_cita', 'in', '(3,4)')
            .order('fecha', { ascending: true })
            .order('hora',  { ascending: true })
            .limit(20);

        if (errCitas) throw new Error(errCitas.message);

        const resultado = (citas || []).map(c => ({
            id:       c.idcita,
            fecha:    c.fecha,
            hora:     c.hora ? c.hora.substring(0, 5) : '—',
            zona:     c.zonacuerpo || '—',
            cliente:  `${c.cliente?.nombre ?? ''} ${c.cliente?.apellido_paterno ?? ''}`.trim() || '—',
            estado:   c.status_cita?.nombre ?? '—',
            idEstado: c.idstatus_cita
        }));

        res.json({ citas: resultado });

    } catch (err) {
        logger.app.error('Error en GET /proximas-citas: ' + err.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

export default router;