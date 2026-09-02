import app from './app.js';
import logger from './utils/logger.js';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import clientesRouter from './routes/clientes.js';

// Importar routers
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import registrarRouter from './routes/registrar_cuenta.js';
import empleadosRouter from './routes/empleados.js';
import horariosRouter from './routes/horarios.js';
import empresasRouter from './routes/empresas.js';
import citasRouter from './routes/citas.js';
import empresaRouter from './routes/registro_empresa.js';
import politicasRouter from './routes/politicas.js';
import superAdminRouter from './routes/superadmin.js';

// =====================================================
import listaClientesRouter from './routes/lista_clientes.js';
import proximasCitasRouter from './routes/proximas_citas.js';
import preciosRouter from './routes/precios.js';  // ← AGREGADO
import pagosRouter from './routes/pagos.js';
import statsRouter from './routes/stats.js';
import reportesRouter from './routes/reportes.js';
import pushRouter from './routes/push.js';
import notificacionesRouter from './routes/notificaciones.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.join(__dirname, '../frontend');

// =====================================================
// 1. MIDDLEWARES BÁSICOS
// =====================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// 2. RUTAS DE API
// =====================================================
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', registrarRouter);
app.use('/api', empleadosRouter);
app.use('/api', horariosRouter);
app.use('/api', empresasRouter);
app.use('/api', citasRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api', empresaRouter);
app.use('/api/politicas', politicasRouter);
app.use('/api/superadmin', superAdminRouter);
app.use('/api/lista-clientes', listaClientesRouter);
app.use('/api/proximas-citas', proximasCitasRouter);
app.use('/api/precios', preciosRouter);  // ← AGREGADO
app.use('/api/pagos', pagosRouter);
app.use('/api', statsRouter);
app.use('/api', reportesRouter);
app.use('/api', pushRouter);
app.use('/api/notificaciones', notificacionesRouter);

// =====================================================
// 3. ARCHIVOS ESTÁTICOS (HTML, CSS, JS)
// =====================================================
console.log('📁 Sirviendo archivos estáticos desde:', frontendPath);
app.use(express.static(frontendPath));

// =====================================================
// 4. RUTA EXPLÍCITA PARA SEGUIMIENTO (por si acaso)
// =====================================================
app.get('/pages/cliente/seguimiento/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages/cliente/seguimiento/index.html'));
});

app.get('/pages/cliente/seguimiento/index.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages/cliente/seguimiento/index.html'));
});

app.get('/pages/cliente/seguimiento/cliente-detalle.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages/cliente/seguimiento/cliente-detalle.html'));
});

app.get('/pages/recuperacion-contra/restablecer_contrasena_panel2.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/recuperacion-contra/restablecer_contrasena_panel2.html'));
});

// =====================================================
// 5. FALLBACK: CUALQUIER OTRA RUTA -> index.html (SOLO PARA SPA)
// =====================================================
// MODIFICACIÓN DEL BLOQUE 5
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ status: 'error', message: 'Endpoint no encontrado' });
    }
    
    // Si el navegador pide un archivo .js o .css que no existe, NO mandes el HTML
    if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
        return res.status(404).send('Archivo no encontrado');
    }

    // Para el resto, puedes dejar el index.html o mejor aún, un error 404 real
    res.status(404).send('La página que buscas no existe en el servidor');
});

// =====================================================
// 6. INICIAR SERVIDOR
// =====================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log('');
    logger.app.info(`╔══════════════════════════════════════════════════════════════╗`);
    logger.app.info(`║ 🚀 Servidor corriendo en http://localhost:${PORT}              ║`);
    logger.app.info(`║ 📁 Frontend: ${frontendPath}║`);
    logger.app.info(`║ 🧪 Prueba seguimiento: http://localhost:${PORT}/pages/cliente/seguimiento/ ║`);
    logger.app.info(`╚══════════════════════════════════════════════════════════════╝`);
    console.log('');
});