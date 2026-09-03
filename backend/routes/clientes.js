import express from 'express';
import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';
import { notificarUsuario } from '../utils/pushService.js';

const router = express.Router();

function calcularDiasProceso(fechainicio) {
    if (!fechainicio) return 1;
    const inicio = new Date(fechainicio);
    const hoy = new Date();
    const diffTime = Math.abs(hoy - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ============================================
// GET / - Listar todos los clientes (para cajero)
// ============================================
router.get('/', async (req, res) => {
    logger.app.info(`📥 GET /clientes | Query: ${JSON.stringify(req.query)}`);
    // Si viene query de seguimientos (idcliente o idtatuador), redirigir a esa lógica
    const { idcliente, idtatuador, filter, search } = req.query;

    if (idcliente || idtatuador) {
        logger.app.info('🔄 Dirigiendo a la lógica de listado de seguimientos');
        // ── Lógica de seguimientos ──────────────────────────────────────────
        try {
            logger.app.info(`🔍 Buscando idtatuador para el idempleado: ${idtatuador}`);
            const idtatuadorQuery = await supabase
                .from('tatuador')
                .select('idtatuador')
                .eq('idempleado', idtatuador)
                .single();

            let idTatuador = null;
            if (idtatuadorQuery.data) {
                idTatuador = idtatuadorQuery.data.idtatuador;
                logger.app.info(`✅ idtatuador encontrado: ${idTatuador}`);
            }

            let query = supabase.from('seguimiento').select('*');

            if (idcliente) {
                logger.app.info(`🔍 Filtrando por idcliente: ${idcliente}`);
                query = query.eq('idcliente', parseInt(idcliente));
            } else if (idTatuador) {
                logger.app.info(`🔍 Filtrando por idtatuador: ${idTatuador}`);
                query = query.eq('idtatuador', parseInt(idTatuador));
            } else {
                logger.app.warn('⚠️ Intento de acceder a seguimientos sin filtro de usuario válido');
                return res.json([]);
            }

            logger.app.info('⏳ Consultando seguimientos en Supabase...');
            const { data: seguimientos, error: errorSeg } = await query;

            if (errorSeg) {
                logger.app.error(`❌ Error al obtener seguimientos: ${errorSeg.message}`);
                return res.status(500).json({ error: errorSeg.message });
            }

            if (!seguimientos || seguimientos.length === 0) {
                logger.app.info('ℹ️ No se encontraron seguimientos.');
                return res.json([]);
            }

            logger.app.info(`📊 Obtenidos ${seguimientos.length} seguimientos. Mapeando clientes y tatuadores...`);

            const idsClientes = [...new Set(seguimientos.map(s => s.idcliente).filter(id => id))];
            let clientesMap = {};
            if (idsClientes.length > 0) {
                const { data: clientes } = await supabase
                    .from('cliente').select('idcliente, nombre').in('idcliente', idsClientes);
                if (clientes) clientesMap = Object.fromEntries(clientes.map(c => [c.idcliente, c]));
            }

            const idsTatuadores = [...new Set(seguimientos.map(s => s.idtatuador).filter(id => id))];
            let tatuadoresMap = {};
            if (idsTatuadores.length > 0) {
                const { data: tatuadoresRel } = await supabase
                    .from('tatuador').select('idtatuador, idempleado').in('idtatuador', idsTatuadores);
                if (tatuadoresRel && tatuadoresRel.length > 0) {
                    const idsEmpleados = [...new Set(tatuadoresRel.map(t => t.idempleado).filter(id => id))];
                    if (idsEmpleados.length > 0) {
                        const { data: empleados } = await supabase
                            .from('empleado').select('idempleado, nombre').in('idempleado', idsEmpleados);
                        if (empleados) {
                            const empleadosMap = Object.fromEntries(empleados.map(e => [e.idempleado, e.nombre]));
                            tatuadoresMap = Object.fromEntries(
                                tatuadoresRel.map(t => [t.idtatuador, empleadosMap[t.idempleado] || 'Tatuador'])
                            );
                        }
                    }
                }
            }

            let resultado = seguimientos.map(s => ({
                id: s.idseguimiento,
                nombre: clientesMap[s.idcliente]?.nombre || `Cliente ${s.idcliente || '?'}`,
                nombreTatuador: tatuadoresMap[s.idtatuador] || 'Tatuador',
                tattoo: 'Tatuaje en proceso',
                estado: s.estadocicatrizacion || 'Curación Normal',
                diasProceso: calcularDiasProceso(s.fechainicio),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientesMap[s.idcliente]?.nombre || 'Cliente')}&background=ba9eff&color=fff`,
                clienteId: s.idcliente,
                tatuadorId: s.idtatuador
            }));

            if (filter === 'recent')    resultado = resultado.filter(c => c.diasProceso <= 5);
            else if (filter === 'critical')  resultado = resultado.filter(c => c.estado === 'Irritación Leve');
            else if (filter === 'completed') resultado = resultado.filter(c => c.estado === 'Curación Completada');

            if (search && search.trim()) {
                resultado = resultado.filter(c =>
                    c.nombre.toLowerCase().includes(search.toLowerCase())
                );
            }

            logger.app.info(`✅ Retornando ${resultado.length} seguimientos después de filtros.`);
            return res.json(resultado);

        } catch (error) {
            logger.app.error(`❌ Error en GET /clientes (seguimientos): ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }

    // ── Sin query params → devolver lista de clientes para el cajero ─────────
    logger.app.info('🔄 Dirigiendo a la lógica de listado general de clientes (Cajero)');
    try {
        logger.app.info('⏳ Consultando tabla de clientes en Supabase...');
        const { data: clientes, error } = await supabase
            .from('cliente')
            .select('idcliente, nombre, apellido_paterno, apellido_materno, correo, telefono')
            .order('nombre', { ascending: true });

        if (error) throw error;

        logger.app.info(`✅ Se obtuvieron ${clientes ? clientes.length : 0} clientes correctamente`);
        return res.status(200).json({
            status: 'success',
            clientes: clientes ?? []
        });

    } catch (error) {
        logger.app.error(`❌ Error al obtener clientes (general): ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de clientes',
            error: error.message
        });
    }
});

// ============================================
// GET /:id - Obtener un seguimiento por ID
// ============================================
router.get('/:id', async (req, res) => {
    logger.app.info(`📥 GET /clientes/${req.params.id} | Query: ${JSON.stringify(req.query)}`);
    try {
        const { id } = req.params;
        const { idcliente, idtatuador } = req.query;

        logger.app.info(`🔍 Validando idtatuador para idempleado: ${idtatuador}`);
        const idtatuadorQuery = await supabase.from('tatuador').select('idtatuador').eq('idempleado', idtatuador).single();

        let idTatuador = null;
        if (idtatuadorQuery.data) {
            idTatuador = idtatuadorQuery.data.idtatuador;
        }

        logger.app.info(`⏳ Consultando seguimiento #${id} en Supabase...`);
        const { data: seguimiento, error } = await supabase
            .from('seguimiento')
            .select('*')
            .eq('idseguimiento', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                logger.app.warn(`⚠️ Seguimiento #${id} no encontrado en base de datos`);
                return res.status(404).json({ error: 'Seguimiento no encontrado' });
            }
            throw error;
        }

        logger.app.info(`🔒 Verificando permisos de acceso al seguimiento #${id}`);
        if (idcliente && seguimiento.idcliente !== parseInt(idcliente)) {
            logger.app.warn(`⛔ Acceso denegado: El idcliente (${idcliente}) no coincide con el del seguimiento`);
            return res.status(403).json({ error: 'No tienes permiso' });
        }
        if (idTatuador && seguimiento.idtatuador !== parseInt(idTatuador)) {
            logger.app.warn(`⛔ Acceso denegado: El idtatuador (${idTatuador}) no coincide con el del seguimiento`);
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        logger.app.info(`✅ Permisos validados. Obteniendo datos del cliente y tatuador...`);
        let nombreCliente = 'Cliente';
        if (seguimiento.idcliente) {
            const { data: cliente } = await supabase
                .from('cliente').select('nombre').eq('idcliente', seguimiento.idcliente).single();
            if (cliente) nombreCliente = cliente.nombre;
        }

        let nombreTatuador = 'Tatuador';
        if (seguimiento.idtatuador) {
            const { data: tatuadorData } = await supabase
                .from('tatuador').select('idempleado').eq('idtatuador', seguimiento.idtatuador).single();
            if (tatuadorData) {
                const { data: empleadoData } = await supabase
                    .from('empleado').select('nombre').eq('idempleado', tatuadorData.idempleado).single();
                if (empleadoData) nombreTatuador = empleadoData.nombre;
            }
        }

        logger.app.info(`✅ Datos del seguimiento #${id} listos para enviar`);
        res.json({
            id: seguimiento.idseguimiento,
            nombre: nombreCliente,
            nombreTatuador,
            tattoo: 'Tatuaje en proceso',
            estado: seguimiento.estadocicatrizacion || 'Curación Normal',
            diasProceso: calcularDiasProceso(seguimiento.fechainicio),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCliente)}&background=ba9eff&color=fff`,
            clienteId: seguimiento.idcliente,
            tatuadorId: seguimiento.idtatuador,
            fechaInicio: seguimiento.fechainicio,
        });

    } catch (error) {
        logger.app.error(`❌ Error en GET /clientes/${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST / - Crear nuevo seguimiento
// ============================================
router.post('/', async (req, res) => {
    logger.app.info(`📥 POST /clientes | Creando nuevo seguimiento. Body: ${JSON.stringify(req.body)}`);
    try {
        const { idcliente, idcita, idtatuador } = req.body;

        logger.app.info(`⏳ Insertando nuevo seguimiento en Supabase...`);
        const { data, error } = await supabase
            .from('seguimiento')
            .insert([{
                idcliente,
                idcita: idcita || null,
                idtatuador: idtatuador || null,
                estadocicatrizacion: 'Curación Normal',
                estadoseguimiento: 'Activo',
                fechainicio: new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (error) throw error;

        logger.app.info(`✅ Nuevo seguimiento creado exitosamente: ID ${data.idseguimiento}`);
        res.status(201).json({
            id: data.idseguimiento,
            nombre: 'Nuevo Cliente',
            tattoo: 'Tatuaje',
            estado: 'Curación Normal',
            diasProceso: 1,
            avatar: 'https://ui-avatars.com/api/?name=Cliente&background=ba9eff&color=fff'
        });

    } catch (error) {
        logger.app.error(`❌ Error en POST /clientes: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PUT /:id/estado - Actualizar estado de cicatrización
// ============================================
router.put('/:id/estado', async (req, res) => {
    logger.app.info(`📥 PUT /clientes/${req.params.id}/estado | Actualizando estado`);
    try {
        const { id } = req.params;
        const { estado, idtatuador } = req.body;

        logger.app.info(`🔍 Verificando credenciales del tatuador para actualización...`);
        const idtatuadorQuery = await supabase.from('tatuador').select('idtatuador').eq('idempleado', idtatuador).single();

        let idTatuador = null;
        if (idtatuadorQuery.data) {
            idTatuador = idtatuadorQuery.data.idtatuador;
        }

        const { data: seguimiento, error: findError } = await supabase
            .from('seguimiento').select('idtatuador').eq('idseguimiento', id).single();

        if (findError) throw findError;

        if (seguimiento.idtatuador !== idTatuador) {
            logger.app.warn(`⛔ Tatuador ${idTatuador} no tiene permisos para actualizar seguimiento ${id}`);
            return res.status(403).json({ error: 'No tienes permiso para modificar este seguimiento' });
        }

        const updateData = { estadocicatrizacion: estado };
        if (estado === 'Curación Completada') {
            updateData.fechafin = new Date().toISOString().split('T')[0];
            updateData.estadoseguimiento = 'Finalizado';
            logger.app.info(`🎉 El seguimiento #${id} será marcado como Completado/Finalizado.`);
        }

        logger.app.info(`⏳ Actualizando estado en base de datos a: ${estado}`);
        const { error } = await supabase.from('seguimiento').update(updateData).eq('idseguimiento', id);
        if (error) throw error;

        logger.app.info(`✅ Seguimiento ${id} actualizado correctamente a: ${estado}`);
        res.json({ success: true, estado });

    } catch (error) {
        logger.app.error(`❌ Error en PUT /clientes/${req.params.id}/estado: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CHAT - Mensajes
// ============================================
router.get('/:id/chat', async (req, res) => {
    logger.app.info(`📥 GET /clientes/${req.params.id}/chat | Solicitando mensajes`);
    try {
        const { id } = req.params;
        const { idcliente, idtatuador } = req.query;
        
        // 🔥 PERMITIR ACCESO A ADMIN (sin parámetros)
        // Si no vienen parámetros, asumimos que es admin y permitimos
        const esAdmin = !idcliente && !idtatuador;
        
        console.log('📡 Chat request - id:', id, 'esAdmin:', esAdmin);
        
        const { data: seguimiento, error: findError } = await supabase
            .from('seguimiento').select('idcliente, idtatuador').eq('idseguimiento', id).single();

        if (findError) {
            logger.app.warn(`⚠️ Seguimiento #${id} no encontrado al intentar acceder al chat`);
            return res.status(404).json({ error: 'Seguimiento no encontrado' });
        }

        let tienePermiso = false;
        
        if (esAdmin) {
            tienePermiso = true;
            console.log('🔓 Admin accediendo al chat');
        } else if (idcliente && parseInt(idcliente) === seguimiento.idcliente) {
            tienePermiso = true;
        } else if (idtatuador && parseInt(idtatuador) === seguimiento.idtatuador) {
            tienePermiso = true;
        }
        
        if (!tienePermiso) {
            logger.app.warn(`⛔ Acceso denegado al chat del seguimiento #${id}`);
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        logger.app.info(`⏳ Consultando mensajes de chat en Supabase...`);
        const { data, error } = await supabase
            .from('chat_seguimiento').select('*').eq('idseguimiento', id).order('fecha_envio', { ascending: true });

        if (error) throw error;

        const mensajes = (data || []).map(msg => ({
            id: msg.idmensaje,
            remitente: msg.idtipo_emisor === 1 ? 'CLIENTE' : 'ARTISTA',
            mensaje: msg.mensaje,
            fecha: msg.fecha_envio ? new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora',
            fecha_envio: msg.fecha_envio
        }));

        logger.app.info(`✅ Se recuperaron ${mensajes.length} mensajes del chat #${id}`);
        res.json(mensajes);

    } catch (error) {
        logger.app.error(`❌ Error en GET /clientes/${req.params.id}/chat: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/chat', async (req, res) => {
    logger.app.info(`📥 POST /clientes/${req.params.id}/chat | Nuevo mensaje de: ${req.body.remitente}`);
    try {
        const { id } = req.params;
        const { remitente, mensaje, idcliente, idtatuador } = req.body;

        const idtatuadorQuery = await supabase.from('tatuador').select('idtatuador').eq('idempleado', idtatuador).single();
        let idTatuador = null;
        if (idtatuadorQuery.data) idTatuador = idtatuadorQuery.data.idtatuador;

        logger.app.info(`🔒 Verificando permisos para enviar mensaje al chat #${id}`);
        const { data: seguimiento, error: findError } = await supabase
            .from('seguimiento').select('idcliente, idtatuador').eq('idseguimiento', id).single();

        if (findError) {
            logger.app.warn(`⚠️ Seguimiento #${id} no encontrado al intentar enviar mensaje`);
            return res.status(404).json({ error: 'Seguimiento no encontrado' });
        }

        let tienePermiso = false;
        if (remitente === 'CLIENTE' && idcliente && parseInt(idcliente) === seguimiento.idcliente) tienePermiso = true;
        if (remitente === 'ARTISTA' && idTatuador && parseInt(idTatuador) === seguimiento.idtatuador) tienePermiso = true;
        
        if (!tienePermiso) {
            logger.app.warn(`⛔ Acción denegada: Emisor sin permisos intentó enviar mensaje al chat #${id}`);
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        const idtipo_emisor = remitente === 'CLIENTE' ? 1 : 2;
        const ahora = new Date();
        const horaMexico = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

        logger.app.info(`⏳ Insertando mensaje en Supabase...`);
        const { data, error } = await supabase
            .from('chat_seguimiento')
            .insert([{ idseguimiento: id, idtipo_emisor, mensaje, fecha_envio: new Date().toISOString() }])
            .select().single();

        if (error) throw error;

        const horaFormateada = horaMexico.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

        logger.app.info(`✅ Mensaje insertado correctamente con ID: ${data.idmensaje}`);

        // Notificar al destinatario (el que NO envió el mensaje)
        if (remitente === 'CLIENTE' && seguimiento.idtatuador) {
          supabase.from('tatuador').select('idempleado').eq('idtatuador', seguimiento.idtatuador).single()
            .then(({ data }) => {
              if (data?.idempleado) {
                notificarUsuario(2, data.idempleado, {
                  titulo: 'Nuevo mensaje en seguimiento',
                  cuerpo: `Tu cliente envió un mensaje en el chat de seguimiento`,
                  url: `/pages/tatuador/cotizaciones/mi-jornada.html`
                }).catch(() => {});
              }
            }).catch(() => {});
        } else if (remitente === 'ARTISTA' && seguimiento.idcliente) {
          notificarUsuario(1, seguimiento.idcliente, {
            titulo: 'Nuevo mensaje de tu artista',
            cuerpo: `Tu tatuador te envió un mensaje sobre tu seguimiento`,
            url: `/pages/cliente/seguimiento/index.html`
          }).catch(() => {});
        }

        res.json({ id: data.idmensaje, remitente, mensaje: data.mensaje, fecha: horaFormateada, fecha_envio: data.fecha_envio });

    } catch (error) {
        logger.app.error(`❌ Error en POST /clientes/${req.params.id}/chat: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// FOTOS - Galería
// ============================================
router.get('/:id/fotos', async (req, res) => {
    logger.app.info(`📥 GET /clientes/${req.params.id}/fotos | Recuperando galería`);
    try {
        const { id } = req.params;
        logger.app.info(`⏳ Consultando fotos de seguimiento #${id} en Supabase...`);
        
        const { data, error } = await supabase
            .from('seguimiento_fotos').select('*').eq('idseguimiento', id).order('fecha_subida', { ascending: false });
            
        if (error) throw error;
        
        logger.app.info(`✅ Obtenidas ${data ? data.length : 0} fotos de galería.`);
        res.json((data || []).map(f => ({ id: f.idseguimiento_foto, url: f.foto_seguimiento_url, fecha: f.fecha_subida })));
    } catch (error) {
        logger.app.error(`❌ Error en GET /clientes/${req.params.id}/fotos: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/fotos', async (req, res) => {
    logger.app.info(`📥 POST /clientes/${req.params.id}/fotos | Agregando nueva foto a galería`);
    try {
        const { id } = req.params;
        const { foto_url } = req.body;

        // Contar fotos existentes antes de insertar
        const { count: fotosExistentes } = await supabase
            .from('seguimiento_fotos')
            .select('*', { count: 'exact', head: true })
            .eq('idseguimiento', id);

        logger.app.info(`⏳ Insertando registro de imagen en base de datos...`);
        const { data, error } = await supabase
            .from('seguimiento_fotos')
            .insert([{ idseguimiento: id, foto_seguimiento_url: foto_url, fecha_subida: new Date() }])
            .select().single();

        if (error) throw error;

        // Si es la primera foto del seguimiento → actualizar foto_final_url en la cita
        if (fotosExistentes === 0) {
            const { data: seg } = await supabase
                .from('seguimiento')
                .select('idcita')
                .eq('idseguimiento', id)
                .single();
            if (seg?.idcita) {
                await supabase
                    .from('cita')
                    .update({ foto_final_url: foto_url })
                    .eq('idcita', seg.idcita);
                logger.app.info(`🖼️ foto_final_url actualizada en cita #${seg.idcita}`);
            }
        }

        logger.app.info(`✅ Imagen registrada correctamente en seguimiento #${id}`);
        res.json({ id: data.idseguimiento_foto, url: data.foto_seguimiento_url, fecha: data.fecha_subida });
    } catch (error) {
        logger.app.error(`❌ Error en POST /clientes/${req.params.id}/fotos: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// OBSERVACIONES (NOTAS)
// ============================================
router.get('/:id/notas', async (req, res) => {
    logger.app.info(`📥 GET /clientes/${req.params.id}/notas | Recuperando observación`);
    try {
        const { id } = req.params;
        logger.app.info(`⏳ Buscando última observación para seguimiento #${id}...`);
        
        const { data, error } = await supabase
            .from('observaciones').select('observaciones').eq('idseguimiento', id)
            .order('idobserva', { ascending: false }).limit(1).maybeSingle();
            
        if (error) throw error;
        
        logger.app.info(`✅ Observación recuperada exitosamente.`);
        res.json({ contenido: data ? data.observaciones : '' });
    } catch (error) {
        logger.app.error(`❌ Error en GET /clientes/${req.params.id}/notas: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/notas', async (req, res) => {
    logger.app.info(`📥 PUT /clientes/${req.params.id}/notas | Actualizando observación/notas`);
    try {
        const { id } = req.params;
        const { contenido } = req.body;
        
        if (!contenido) {
            logger.app.warn(`⚠️ Intento de guardar observación vacía en seguimiento #${id}`);
            return res.status(400).json({ error: 'El contenido de la observación es requerido' });
        }

        logger.app.info(`🔍 Buscando idcita asociada al seguimiento #${id}...`);
        const { data: seguimiento, error: segError } = await supabase
            .from('seguimiento').select('idcita').eq('idseguimiento', id).single();
            
        if (segError || !seguimiento) {
            logger.app.warn(`⚠️ No se encontró el seguimiento #${id} para guardar notas`);
            return res.status(404).json({ error: 'No se encontró el seguimiento' });
        }

        logger.app.info(`⏳ Insertando observación en base de datos...`);
        const { data, error } = await supabase
            .from('observaciones')
            .insert([{ idseguimiento: parseInt(id), idcita: seguimiento.idcita, observaciones: contenido, timestamp: new Date().toISOString() }])
            .select().single();
            
        if (error) throw error;

        logger.app.info(`✅ Observación guardada correctamente para seguimiento ID: ${id}`);
        res.json({ success: true, contenido: data.observaciones, id: data.idobserva });
    } catch (error) {
        logger.app.error(`❌ Error en PUT /clientes/${req.params.id}/notas: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET - ADMIN: Obtener TODOS los seguimientos (sin filtro)
// ============================================
// ============================================
// GET - ADMIN: Obtener TODOS los seguimientos (sin filtro)
// ============================================
router.get('/admin/all', async (req, res) => {
    try {
        const { search } = req.query;
        
        // Obtener todos los seguimientos
        const { data: seguimientos, error } = await supabase
            .from('seguimiento')
            .select('*');
        
        if (error) throw error;
        
        if (!seguimientos || seguimientos.length === 0) {
            return res.json([]);
        }
        
        // Obtener datos de clientes
        const idsClientes = [...new Set(seguimientos.map(s => s.idcliente).filter(id => id))];
        let clientesMap = {};
        
        if (idsClientes.length > 0) {
            const { data: clientes } = await supabase
                .from('cliente')
                .select('idcliente, nombre')
                .in('idcliente', idsClientes);
            
            if (clientes) {
                clientesMap = Object.fromEntries(clientes.map(c => [c.idcliente, c]));
            }
        }
        
        // Obtener datos de tatuadores (nombres)
        const idsTatuadores = [...new Set(seguimientos.map(s => s.idtatuador).filter(id => id))];
        let tatuadoresMap = {};
        
        if (idsTatuadores.length > 0) {
            const { data: tatuadoresRel } = await supabase
                .from('tatuador')
                .select('idtatuador, idempleado')
                .in('idtatuador', idsTatuadores);
            
            if (tatuadoresRel && tatuadoresRel.length > 0) {
                const idsEmpleados = [...new Set(tatuadoresRel.map(t => t.idempleado).filter(id => id))];
                
                if (idsEmpleados.length > 0) {
                    const { data: empleados } = await supabase
                        .from('empleado')
                        .select('idempleado, nombre')
                        .in('idempleado', idsEmpleados);
                    
                    if (empleados) {
                        const empleadosMap = Object.fromEntries(empleados.map(e => [e.idempleado, e.nombre]));
                        tatuadoresMap = Object.fromEntries(
                            tatuadoresRel.map(t => [t.idtatuador, empleadosMap[t.idempleado] || 'Tatuador'])
                        );
                    }
                }
            }
        }
        
        // Formatear respuesta
        let resultado = seguimientos.map(s => ({
            id: s.idseguimiento,
            cliente_nombre: clientesMap[s.idcliente]?.nombre || `Cliente ${s.idcliente || '?'}`,
            tatuador_nombre: tatuadoresMap[s.idtatuador] || 'Tatuador no asignado',
            estado: s.estadocicatrizacion || 'Curación Normal',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientesMap[s.idcliente]?.nombre || 'Cliente')}&background=D93B3B&color=fff`
        }));
        
        // Filtrar por búsqueda
        if (search && search.trim()) {
            const term = search.toLowerCase();
            resultado = resultado.filter(s => 
                s.cliente_nombre.toLowerCase().includes(term) ||
                s.tatuador_nombre.toLowerCase().includes(term)
            );
        }
        
        res.json(resultado);
        
    } catch (error) {
        console.error('Error en GET /clientes/admin/all:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET - ADMIN: Obtener TODOS los seguimientos (sin filtro)
// ============================================
// ============================================
// GET - ADMIN: Obtener TODOS los seguimientos (sin filtro)
// ============================================
router.get('/admin/all', async (req, res) => {
    try {
        const { search } = req.query;
        
        // Obtener todos los seguimientos
        const { data: seguimientos, error } = await supabase
            .from('seguimiento')
            .select('*');
        
        if (error) throw error;
        
        if (!seguimientos || seguimientos.length === 0) {
            return res.json([]);
        }
        
        // Obtener datos de clientes
        const idsClientes = [...new Set(seguimientos.map(s => s.idcliente).filter(id => id))];
        let clientesMap = {};
        
        if (idsClientes.length > 0) {
            const { data: clientes } = await supabase
                .from('cliente')
                .select('idcliente, nombre')
                .in('idcliente', idsClientes);
            
            if (clientes) {
                clientesMap = Object.fromEntries(clientes.map(c => [c.idcliente, c]));
            }
        }
        
        // Obtener datos de tatuadores (nombres)
        const idsTatuadores = [...new Set(seguimientos.map(s => s.idtatuador).filter(id => id))];
        let tatuadoresMap = {};
        
        if (idsTatuadores.length > 0) {
            const { data: tatuadoresRel } = await supabase
                .from('tatuador')
                .select('idtatuador, idempleado')
                .in('idtatuador', idsTatuadores);
            
            if (tatuadoresRel && tatuadoresRel.length > 0) {
                const idsEmpleados = [...new Set(tatuadoresRel.map(t => t.idempleado).filter(id => id))];
                
                if (idsEmpleados.length > 0) {
                    const { data: empleados } = await supabase
                        .from('empleado')
                        .select('idempleado, nombre')
                        .in('idempleado', idsEmpleados);
                    
                    if (empleados) {
                        const empleadosMap = Object.fromEntries(empleados.map(e => [e.idempleado, e.nombre]));
                        tatuadoresMap = Object.fromEntries(
                            tatuadoresRel.map(t => [t.idtatuador, empleadosMap[t.idempleado] || 'Tatuador'])
                        );
                    }
                }
            }
        }
        
        // Formatear respuesta
        let resultado = seguimientos.map(s => ({
            id: s.idseguimiento,
            cliente_nombre: clientesMap[s.idcliente]?.nombre || `Cliente ${s.idcliente || '?'}`,
            tatuador_nombre: tatuadoresMap[s.idtatuador] || 'Tatuador no asignado',
            estado: s.estadocicatrizacion || 'Curación Normal',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientesMap[s.idcliente]?.nombre || 'Cliente')}&background=D93B3B&color=fff`
        }));
        
        // Filtrar por búsqueda
        if (search && search.trim()) {
            const term = search.toLowerCase();
            resultado = resultado.filter(s => 
                s.cliente_nombre.toLowerCase().includes(term) ||
                s.tatuador_nombre.toLowerCase().includes(term)
            );
        }
        
        res.json(resultado);
        
    } catch (error) {
        console.error('Error en GET /clientes/admin/all:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;