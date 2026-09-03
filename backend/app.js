import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import logger from './utils/logger.js';

// Cargar .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middlewares
app.use(cors());

// El webhook de Stripe necesita el body sin parsear para verificar la firma
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  // Log request body for POST/PUT
  if ((req.method === 'POST' || req.method === 'PUT') && req.body && Object.keys(req.body).length > 0) {
    // Omit large fields like base64 images
    const safeBody = { ...req.body };
    for (const key of Object.keys(safeBody)) {
      if (typeof safeBody[key] === 'string' && safeBody[key].length > 200) {
        safeBody[key] = `[${safeBody[key].length} chars]`;
      }
    }
    logger.app.info(`📥 ${req.method} ${req.originalUrl} body: ${JSON.stringify(safeBody)}`);
  }
  const originalEnd = res.end;
  res.end = function (...args) {
    const ms = Date.now() - start;
    logger.req.info(req.method, req.originalUrl, res.statusCode, ms);
    originalEnd.apply(res, args);
  };
  next();
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.app.error(`Error: ${err.message}`);
  res.status(500).json({ 
    status: 'error',
    message: 'Error interno del servidor',
    error: err.message
  });
});

export default app;
