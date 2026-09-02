import express from 'express';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// PRECIOS POR TAMAÑO (precio_tamano)
// ============================================

// GET - Obtener todos los precios por tamaño
router.get('/tamanio', async (req, res) => {
    try {
        const { idempresa } = req.query;
        const result = await db.query(
            'SELECT * FROM precio_tamano WHERE idempresa = $1 ORDER BY anchomin ASC',
            [idempresa]
        );
        res.json({ status: 'ok', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST - Crear nuevo tamaño
router.post('/tamanio', async (req, res) => {
    try {
        const { idempresa, tamanio, precio, anchomin, anchomax, altomin, altomax } = req.body;
        
        const result = await db.query(
            `INSERT INTO precio_tamano (idempresa, tamanio, precio, anchomin, anchomax, altomin, altomax) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [idempresa, tamanio, precio, anchomin, anchomax, altomin, altomax]
        );
        
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// PUT - Actualizar precio por tamaño
router.put('/tamanio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { precio } = req.body;
        
        await db.query(
            'UPDATE precio_tamano SET precio = $1 WHERE idtamano = $2',
            [precio, id]
        );
        
        res.json({ status: 'success', message: 'Precio actualizado' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// DELETE - Eliminar tamaño
router.delete('/tamanio/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM precio_tamano WHERE idtamano = $1', [req.params.id]);
        res.json({ status: 'success', message: 'Tamaño eliminado' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ============================================
// TÉCNICAS
// ============================================

// GET - Obtener todas las técnicas
router.get('/tecnicas', async (req, res) => {
    try {
        const { idempresa } = req.query;
        const result = await db.query(
            'SELECT * FROM tecnicas WHERE idempresa = $1 ORDER BY nombretecnica ASC',
            [idempresa]
        );
        res.json({ status: 'ok', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST - Crear nueva técnica
router.post('/tecnica', async (req, res) => {
    try {
        const { idempresa, nombretecnica, dificultad } = req.body;
        
        const result = await db.query(
            `INSERT INTO tecnicas (idempresa, nombretecnica, dificultad) 
             VALUES ($1, $2, $3) RETURNING *`,
            [idempresa, nombretecnica, dificultad || 1.0]
        );
        
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// PUT - Actualizar dificultad de técnica
router.put('/tecnica/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dificultad } = req.body;
        
        await db.query(
            'UPDATE tecnicas SET dificultad = $1 WHERE idtecnica = $2',
            [dificultad, id]
        );
        
        res.json({ status: 'success', message: 'Dificultad actualizada' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// DELETE - Eliminar técnica
router.delete('/tecnica/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM tecnicas WHERE idtecnica = $1', [req.params.id]);
        res.json({ status: 'success', message: 'Técnica eliminada' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ============================================
// CÁLCULO PARA COTIZACIONES
// ============================================

router.get('/calcular', async (req, res) => {
    try {
        const { idempresa, tamanioId, tecnicaId } = req.query;
        
        let precioBase = 0;
        let multiplicador = 1.0;
        let nombreTamanio = '';
        let nombreTecnica = '';
        
        if (tamanioId) {
            const result = await db.query(
                'SELECT tamanio, precio FROM precio_tamano WHERE idtamano = $1 AND idempresa = $2',
                [tamanioId, idempresa]
            );
            if (result.rows.length > 0) {
                precioBase = parseFloat(result.rows[0].precio);
                nombreTamanio = result.rows[0].tamanio;
            }
        }
        
        if (tecnicaId) {
            const result = await db.query(
                'SELECT nombretecnica, dificultad FROM tecnicas WHERE idtecnica = $1 AND idempresa = $2',
                [tecnicaId, idempresa]
            );
            if (result.rows.length > 0) {
                multiplicador = parseFloat(result.rows[0].dificultad) || 1.0;
                nombreTecnica = result.rows[0].nombretecnica;
            }
        }
        
        const precioFinal = precioBase * multiplicador;
        
        res.json({
            status: 'ok',
            data: {
                precioBase,
                multiplicador,
                precioFinal: precioFinal.toFixed(2),
                nombreTamanio,
                nombreTecnica
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;