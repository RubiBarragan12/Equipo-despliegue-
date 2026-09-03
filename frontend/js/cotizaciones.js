// // js/cotizaciones.js
// // Clase para manejar cotizaciones con Supabase

// class CotizacionesAPI {
//     constructor() {
//         if (typeof supabaseClient === 'undefined') {
//             console.error('❌ supabaseClient no está definido');
//         }
//         this.supabase = supabaseClient;
//         this.tablaCotizacion = 'cotizacion';
//         this.tablaStatus = 'status_cotizacion';
//         this.estados = {};
//     }
    
//     // Cargar estados desde la tabla status_cotizacion
//     async cargarEstados() {
//         try {
//             console.log('🔄 Cargando estados desde status_cotizacion...');
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaStatus)
//                 .select('*');
            
//             if (error) throw error;
            
//             console.log('✅ Estados cargados:', data);
            
//             // Crear mapa de estados (nombre -> id y id -> nombre)
//             this.estados = {};
//             data.forEach(estado => {
//                 this.estados[estado.nombre] = estado.idstatus;
//                 this.estados[estado.idstatus] = estado.nombre;
//             });
            
//             console.log('📊 Mapa de estados:', this.estados);
            
//             return { success: true, data: data };
//         } catch (error) {
//             console.error('Error al cargar estados:', error);
//             return { success: false, error: error.message };
//         }
//     }
    
//     // Obtener TODAS las cotizaciones
//     async obtenerTodasCotizaciones() {
//         try {
//             console.log('🔍 Buscando TODAS las cotizaciones en tabla cotizacion...');
            
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .select('*')
//                 .order('fecha_cotizacion', { ascending: false });
            
//             if (error) throw error;
            
//             console.log(`✅ ${data?.length || 0} cotizaciones encontradas`);
            
//             // Agregar nombre del estado a cada cotización
//             const cotizacionesConEstado = (data || []).map(cotizacion => {
//                 let estadoNombre = this.estados[cotizacion.idstatus] || 'desconocido';
                
//                 // Normalizar nombres de estado para los filtros
//                 let estadoNormalizado = estadoNombre;
//                 if (estadoNombre === 'Enviada' || estadoNombre === 'pendiente') {
//                     estadoNormalizado = 'pendiente';
//                 } else if (estadoNombre === 'Aceptada' || estadoNombre === 'aprobada') {
//                     estadoNormalizado = 'aprobada';
//                 } else if (estadoNombre === 'Rechazada' || estadoNombre === 'rechazada') {
//                     estadoNormalizado = 'rechazada';
//                 }
                
//                 return {
//                     ...cotizacion,
//                     estado_nombre: estadoNormalizado,
//                     estado_original: estadoNombre
//                 };
//             });
            
//             if (cotizacionesConEstado.length > 0) {
//                 console.log('📊 Primera cotización:', cotizacionesConEstado[0]);
//             }
            
//             return { success: true, data: cotizacionesConEstado };
//         } catch (error) {
//             console.error('Error al obtener cotizaciones:', error);
//             return { success: false, error: error.message, data: [] };
//         }
//     }
    
//     // Obtener cotizaciones por estado normalizado
//     async obtenerCotizacionesPorEstado(estadoNormalizado) {
//         try {
//             console.log(`🔍 Buscando cotizaciones con estado: ${estadoNormalizado}`);
            
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             // Determinar qué IDs de estado corresponden al estado normalizado
//             let estadosIds = [];
            
//             if (estadoNormalizado === 'pendiente') {
//                 estadosIds = [this.estados['Enviada'], this.estados['pendiente']].filter(id => id);
//             } else if (estadoNormalizado === 'aprobada') {
//                 estadosIds = [this.estados['Aceptada'], this.estados['aprobada']].filter(id => id);
//             } else if (estadoNormalizado === 'rechazada') {
//                 estadosIds = [this.estados['Rechazada'], this.estados['rechazada']].filter(id => id);
//             }
            
//             if (estadosIds.length === 0) {
//                 return { success: true, data: [] };
//             }
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .select('*')
//                 .in('idstatus', estadosIds)
//                 .order('fecha_cotizacion', { ascending: false });
            
//             if (error) throw error;
            
//             const cotizacionesConEstado = (data || []).map(cotizacion => ({
//                 ...cotizacion,
//                 estado_nombre: estadoNormalizado,
//                 estado_original: this.estados[cotizacion.idstatus]
//             }));
            
//             console.log(`✅ ${cotizacionesConEstado.length} cotizaciones con estado "${estadoNormalizado}"`);
            
//             return { success: true, data: cotizacionesConEstado };
//         } catch (error) {
//             console.error('Error al obtener cotizaciones por estado:', error);
//             return { success: false, error: error.message, data: [] };
//         }
//     }
    
//     // Obtener una cotización específica por ID
//     async obtenerCotizacionPorId(idcotizacion) {
//         try {
//             console.log(`🔍 Buscando cotización ID: ${idcotizacion}`);
            
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .select('*')
//                 .eq('idcotizacion', idcotizacion)
//                 .single();
            
//             if (error) throw error;
            
//             let estadoNormalizado = this.estados[data.idstatus] || 'desconocido';
//             if (estadoNormalizado === 'Enviada') estadoNormalizado = 'pendiente';
//             if (estadoNormalizado === 'Aceptada') estadoNormalizado = 'aprobada';
//             if (estadoNormalizado === 'Rechazada') estadoNormalizado = 'rechazada';
            
//             data.estado_nombre = estadoNormalizado;
            
//             console.log('✅ Cotización encontrada:', data);
            
//             return { success: true, data: data };
//         } catch (error) {
//             console.error('Error al obtener cotización:', error);
//             return { success: false, error: error.message };
//         }
//     }
    
//     // Aprobar cotización
//     async aprobarCotizacion(idcotizacion, precioFinal, justificacion) {
//         try {
//             console.log(`📝 Aprobando cotización ${idcotizacion}...`);
            
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             // Usar el ID de "Aceptada" o "aprobada"
//             const estadoAprobadaId = this.estados['Aceptada'] || this.estados['aprobada'];
            
//             if (!estadoAprobadaId) {
//                 return { success: false, error: 'Estado "aprobada" no encontrado' };
//             }
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .update({
//                     preciofinal: precioFinal,
//                     justificacion_ajuste: justificacion,
//                     idstatus: estadoAprobadaId
//                 })
//                 .eq('idcotizacion', idcotizacion)
//                 .select();
            
//             if (error) throw error;
            
//             console.log(`✅ Cotización ${idcotizacion} aprobada`);
//             return { success: true, data: data[0] };
//         } catch (error) {
//             console.error('Error al aprobar cotización:', error);
//             return { success: false, error: error.message };
//         }
//     }
    
//     // Rechazar cotización
//     async rechazarCotizacion(idcotizacion, justificacion = '') {
//         try {
//             console.log(`📝 Rechazando cotización ${idcotizacion}...`);
            
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             // Usar el ID de "Rechazada" o "rechazada"
//             const estadoRechazadaId = this.estados['Rechazada'] || this.estados['rechazada'];
            
//             if (!estadoRechazadaId) {
//                 return { success: false, error: 'Estado "rechazada" no encontrado' };
//             }
            
//             const { data, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .update({
//                     justificacion_ajuste: justificacion,
//                     idstatus: estadoRechazadaId
//                 })
//                 .eq('idcotizacion', idcotizacion)
//                 .select();
            
//             if (error) throw error;
            
//             console.log(`✅ Cotización ${idcotizacion} rechazada`);
//             return { success: true, data: data[0] };
//         } catch (error) {
//             console.error('Error al rechazar cotización:', error);
//             return { success: false, error: error.message };
//         }
//     }
    
//     // Contar cotizaciones por estado normalizado
//     async contarPorEstado(estadoNormalizado) {
//         try {
//             if (Object.keys(this.estados).length === 0) {
//                 await this.cargarEstados();
//             }
            
//             let estadosIds = [];
            
//             if (estadoNormalizado === 'pendiente') {
//                 estadosIds = [this.estados['Enviada'], this.estados['pendiente']].filter(id => id);
//             } else if (estadoNormalizado === 'aprobada') {
//                 estadosIds = [this.estados['Aceptada'], this.estados['aprobada']].filter(id => id);
//             } else if (estadoNormalizado === 'rechazada') {
//                 estadosIds = [this.estados['Rechazada'], this.estados['rechazada']].filter(id => id);
//             } else {
//                 return { success: true, count: 0 };
//             }
            
//             if (estadosIds.length === 0) {
//                 return { success: true, count: 0 };
//             }
            
//             const { count, error } = await this.supabase
//                 .from(this.tablaCotizacion)
//                 .select('*', { count: 'exact', head: true })
//                 .in('idstatus', estadosIds);
            
//             if (error) throw error;
            
//             return { success: true, count: count || 0 };
//         } catch (error) {
//             console.error('Error al contar:', error);
//             return { success: false, count: 0 };
//         }
//     }
// }

// // Crear instancia global
// const cotizacionesAPI = new CotizacionesAPI();
// console.log('✅ CotizacionesAPI inicializado');