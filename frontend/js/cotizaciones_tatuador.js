// js/cotizaciones_tatuador.js
// Panel de cotizaciones del tatuador

(function() {
const API_BASE = '/api';

const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user || user.rol !== 'Tatuador') {
    window.location.href = '/';
    return;
}

let idTatuador = null;

function showToast(msg, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-4rem)';
    }, 3000);
}

function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let d;
    if (fechaStr instanceof Date) {
        d = fechaStr;
    } else if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
        d = new Date(fechaStr);
    } else {
        d = new Date(fechaStr + 'T12:00:00');
    }
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${meses[d.getMonth()]}`;
}

// ===== PANEL COTIZACIONES EN MENU TATUADOR =====
async function initCotizacionesTatuador() {
    // Obtener idTatuador del empleado
    try {
        const res = await fetch(`${API_BASE}/tatuador-id/${user.idempleado}`);
        const json = await res.json();
        if (json.status === 'ok') {
            idTatuador = json.data.idTatuador;
        } else {
            console.error('No se encontró idTatuador');
            return;
        }
    } catch (err) {
        console.error('Error obteniendo idTatuador:', err);
        return;
    }

    cargarCotizaciones();
}

async function cargarCotizaciones() {
    const container = document.getElementById('cotizaciones-tab-content');
    if (!container || !idTatuador) return;

    container.innerHTML = '<p class="text-zinc-400 text-center py-4">Cargando...</p>';

    try {
        const res = await fetch(`${API_BASE}/cotizaciones/tatuador/${idTatuador}`);
        const json = await res.json();

        if (json.status === 'ok' && json.data.length > 0) {
            const pendientes   = json.data.filter(c => ['enviada', 'pendiente'].includes(c.estado?.toLowerCase()));
            const revisadas    = json.data.filter(c => c.estado?.toLowerCase() === 'revisada');
            const confirmarPago = json.data.filter(c => ['aceptada', 'pagado anticipo'].includes(c.estado?.toLowerCase()));
            const otras        = json.data.filter(c => !['enviada', 'pendiente', 'revisada', 'aceptada', 'pagado anticipo'].includes(c.estado?.toLowerCase()));

            let html = '';

            if (pendientes.length > 0) {
                html += '<p class="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">Nuevas solicitudes</p>';
                html += pendientes.map(c => renderCotizacionCard(c, true)).join('');
            }

            if (revisadas.length > 0) {
                html += '<p class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 mt-4">Esperando respuesta del cliente</p>';
                html += revisadas.map(c => renderCotizacionCard(c, false)).join('');
            }

            if (confirmarPago.length > 0) {
                html += '<p class="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 mt-4">Confirmar pago</p>';
                html += confirmarPago.map(c => renderCotizacionCard(c, true)).join('');
            }

            if (otras.length > 0) {
                html += '<p class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 mt-4">Historial</p>';
                html += otras.map(c => renderCotizacionCard(c, false)).join('');
            }

            container.innerHTML = html;

            // Clicks
            container.querySelectorAll('.cot-card[data-clickable="true"]').forEach(card => {
                card.addEventListener('click', () => {
                    localStorage.setItem('cotizacionTatuador', card.dataset.id);
                    window.location.href = 'cotizaciones/cotizacion.html';
                });
            });
        } else {
            container.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-symbols-outlined text-4xl text-zinc-600">receipt_long</span>
                    <p class="text-zinc-400 mt-2">No hay cotizaciones</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<p class="text-red-400 text-center py-4">Error al cargar cotizaciones</p>';
    }
}

function renderCotizacionCard(cot, clickable) {
    const estado = (cot.estado || '').toLowerCase();
    let badge = '';
    if (estado === 'enviada' || estado === 'pendiente') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-yellow-500/20 text-yellow-400 rounded-full">Pendiente</span>';
    else if (estado === 'revisada') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-blue-500/20 text-blue-400 rounded-full">Revisada</span>';
    else if (estado === 'aceptada') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-green-500/20 text-green-400 rounded-full">Aceptada</span>';
    else if (estado === 'pagado anticipo') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-orange-500/20 text-orange-400 rounded-full">Anticipo pagado</span>';
    else if (estado === 'pagada') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/20 text-emerald-400 rounded-full">Pagada</span>';
    else if (estado === 'rechazada') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-red-500/20 text-red-400 rounded-full">Rechazada</span>';
    else if (estado === 'cancelada') badge = '<span class="text-[10px] font-bold py-0.5 px-2 bg-gray-500/20 text-gray-400 rounded-full">Cancelada</span>';

    return `
    <div class="cot-card bg-zinc-800/50 p-4 rounded-lg mb-2 ${clickable ? 'cursor-pointer hover:bg-zinc-700/50' : ''} transition-colors"
         data-id="${cot.idcotizacion}" data-clickable="${clickable}">
        <div class="flex justify-between items-start mb-1">
            <p class="text-white font-medium">Cotización de ${cot.cliente_nombre || 'Cliente'} ${cot.cliente_apellido || ''}</p>
            ${badge}
        </div>
        <p class="text-sm text-zinc-400">${formatFecha(cot.fecha)} ${cot.hora?.substring(0, 5) || ''} | ${cot.estilo || 'Sin estilo'} - ${cot.zonacuerpo || ''}</p>
        ${cot.montoestimado ? `<p class="text-sm text-zinc-500 mt-1">Estimado: $${parseFloat(cot.montoestimado).toFixed(2)}</p>` : ''}
    </div>
    `;
}

// ===== DETALLE COTIZACIÓN (cotizacion.html del tatuador) =====
async function initDetalleCotizacion() {
    const idCot = localStorage.getItem('cotizacionTatuador');
    if (!idCot) {
        window.history.back();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cotizaciones/${idCot}`);
        const json = await res.json();

        if (json.status !== 'ok') {
            showToast('Error al cargar cotización', 'error');
            return;
        }

        const cot = json.data;

        // Llenar datos en la UI
        const elTamano = document.getElementById('tamano');
        const elUbicacion = document.getElementById('ubicacion');
        const elEstilo = document.getElementById('estilo');
        const elDescripcion = document.getElementById('descripcion');
        const elMontoEstimado = document.getElementById('monto-estimado');
        const inputPrecio = document.getElementById('quote-price');
        const inputJustificacion = document.getElementById('justification');
        const elImg = document.getElementById('referencia-img');

        if (elTamano) elTamano.textContent = cot.tamanio || 'N/A';
        if (elUbicacion) elUbicacion.textContent = cot.zonacuerpo || 'N/A';
        if (elEstilo) elEstilo.textContent = cot.estilo || 'N/A';
        if (elDescripcion) elDescripcion.textContent = cot.descripcion || 'Sin descripción';
        if (elMontoEstimado) elMontoEstimado.textContent = `$${parseFloat(cot.montoestimado || 0).toFixed(0)}`;
        if (inputPrecio) inputPrecio.value = cot.preciofinal || cot.montoestimado || 0;
        if (inputJustificacion && cot.justificacion_ajuste) inputJustificacion.value = cot.justificacion_ajuste;
        if (elImg && cot.foto_referecncia_url) {
            elImg.src = cot.foto_referecncia_url;
            elImg.classList.remove('hidden');
            const placeholder = document.getElementById('referencia-placeholder');
            if (placeholder) placeholder.classList.add('hidden');
        }

        // Info del cliente
        const elClienteNombre = document.getElementById('cliente-nombre');
        const elClienteFecha = document.getElementById('cliente-fecha');
        if (elClienteNombre) elClienteNombre.textContent = `${cot.cliente_nombre || ''} ${cot.cliente_apellido || ''}`.trim() || 'Cliente';
        if (elClienteFecha) elClienteFecha.textContent = `${formatFecha(cot.fecha)} a las ${cot.hora?.substring(0, 5) || ''}`;

        // Back button
        const btnBack = document.getElementById('btn-back');
        if (btnBack) btnBack.addEventListener('click', () => window.history.back());

        const estado = (cot.estado || '').toLowerCase();

        // Botón Aceptar
        const btnAceptar = document.getElementById('btn-aceptar');
        const btnRechazar = document.getElementById('btn-rechazar');

        if (estado !== 'enviada' && estado !== 'pendiente') {
            if (btnAceptar) {
                btnAceptar.disabled = true;
                btnAceptar.textContent = 'Cotización ya procesada';
                btnAceptar.classList.remove('bg-primary', 'text-black', 'hover:bg-yellow-400', 'shadow-lg', 'shadow-primary/20');
                btnAceptar.classList.add('bg-zinc-700', 'text-zinc-400', 'cursor-not-allowed');
            }
            if (btnRechazar) { btnRechazar.classList.add('hidden'); }
            if (inputPrecio) { inputPrecio.disabled = true; inputPrecio.classList.add('opacity-50'); }
            if (inputJustificacion) { inputJustificacion.disabled = true; inputJustificacion.classList.add('opacity-50'); }

            // Botones de confirmación de pago en efectivo
            if (estado === 'aceptada' || estado === 'pagado anticipo') {
                mostrarBotonesEfectivo(idCot, estado);
            }
            return;
        }

        if (btnAceptar) {
            btnAceptar.addEventListener('click', async () => {
                const precioFinal = parseFloat(inputPrecio?.value);
                const justificacion = inputJustificacion?.value?.trim() || '';

                if (!precioFinal || precioFinal <= 0) {
                    showToast('Ingresa un precio válido', 'error');
                    return;
                }

                btnAceptar.disabled = true;
                btnAceptar.textContent = 'Enviando...';

                try {
                    const r = await fetch(`${API_BASE}/cotizaciones/${idCot}/revisar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ precioFinal, justificacion })
                    });
                    const j = await r.json();

                    if (j.status === 'success') {
                        showToast('Cotización enviada al cliente');
                        setTimeout(() => window.history.back(), 1500);
                    } else {
                        showToast(j.message || 'Error', 'error');
                        btnAceptar.disabled = false;
                        btnAceptar.textContent = 'Aceptar y Enviar';
                    }
                } catch (e) {
                    showToast('Error de conexión', 'error');
                    btnAceptar.disabled = false;
                    btnAceptar.textContent = 'Aceptar y Enviar';
                }
            });
        }

        if (btnRechazar) {
            btnRechazar.addEventListener('click', async () => {
                if (!confirm('¿Rechazar esta cotización? Se liberará el horario bloqueado.')) return;

                btnRechazar.disabled = true;
                try {
                    const r = await fetch(`${API_BASE}/cotizaciones/${idCot}/rechazar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ justificacion: 'Rechazada por el tatuador' })
                    });
                    const j = await r.json();

                    if (j.status === 'success') {
                        showToast('Cotización rechazada');
                        setTimeout(() => window.history.back(), 1500);
                    } else {
                        showToast(j.message || 'Error', 'error');
                        btnRechazar.disabled = false;
                    }
                } catch (e) {
                    showToast('Error de conexión', 'error');
                    btnRechazar.disabled = false;
                }
            });
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error al cargar cotización', 'error');
    }
}

// ===== CONFIRMAR PAGO EN EFECTIVO =====
function mostrarBotonesEfectivo(idCot, estado) {
    const contenedor = document.querySelector('.mx-4.mt-6.flex.flex-col.gap-3');
    if (!contenedor) return;

    const seccion = document.createElement('div');
    seccion.className = 'mt-6 mx-0';
    seccion.innerHTML = `
        <div class="border border-zinc-700/50 rounded-xl p-4 bg-zinc-800/40">
            <p class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Confirmar pago en efectivo</p>
            <div class="flex flex-col gap-2">
                ${estado === 'aceptada' ? `
                <button id="btn-efectivo-anticipo"
                    class="w-full py-3 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold text-sm hover:bg-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-base">payments</span>
                    Cliente pagó anticipo en efectivo
                </button>` : ''}
                ${estado === 'pagado anticipo' ? `
                <button id="btn-efectivo-liquidacion"
                    class="w-full py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm hover:bg-green-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-base">payments</span>
                    Cliente pagó liquidación en efectivo
                </button>` : ''}
            </div>
        </div>
    `;
    contenedor.appendChild(seccion);

    const btnAnticipo = document.getElementById('btn-efectivo-anticipo');
    const btnLiquidacion = document.getElementById('btn-efectivo-liquidacion');

    async function confirmarEfectivo(tipo) {
        const btnActivo = tipo === 'anticipo' ? btnAnticipo : btnLiquidacion;
        if (!confirm(`¿Confirmar que el cliente pagó el ${tipo} en efectivo?`)) return;

        btnActivo.disabled = true;
        btnActivo.textContent = 'Registrando...';

        try {
            const r = await fetch(`${API_BASE}/pagos/confirmar-efectivo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idCotizacion: idCot, tipo }),
            });
            const j = await r.json();

            if (j.status === 'success') {
                showToast(`✅ Pago en efectivo (${tipo}) registrado — $${j.monto?.toFixed(2) || ''}`);
                setTimeout(() => window.history.back(), 1500);
            } else {
                showToast(j.message || 'Error al registrar pago', 'error');
                btnActivo.disabled = false;
                btnActivo.textContent = tipo === 'anticipo' ? 'Cliente pagó anticipo en efectivo' : 'Cliente pagó liquidación en efectivo';
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
            btnActivo.disabled = false;
        }
    }

    if (btnAnticipo) btnAnticipo.addEventListener('click', () => confirmarEfectivo('anticipo'));
    if (btnLiquidacion) btnLiquidacion.addEventListener('click', () => confirmarEfectivo('liquidacion'));
}

// ===== AUTO-INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('menu_tatuador')) {
        initCotizacionesTatuador();
    } else if (path.includes('cotizaciones/cotizacion')) {
        initDetalleCotizacion();
    }
});
})();
