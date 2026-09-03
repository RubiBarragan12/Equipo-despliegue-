// js/mis_cotizaciones_cliente.js

const API_BASE = '/api';

const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user || (user.rol || '').toLowerCase() !== 'cliente') {
    window.location.href = '/';
}

function showToast(msg, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    
    let bgColor = 'bg-green-600';
    if (type === 'error') bgColor = 'bg-red-600';
    if (type === 'info') bgColor = 'bg-blue-600';

    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${bgColor} text-white`;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-4rem)';
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
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
    return `${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}

function getEstadoBadge(estado) {
    const lower = (estado || '').toLowerCase();
    if (lower === 'enviada' || lower === 'pendiente') {
        return '<span class="text-xs font-bold py-1 px-3 bg-yellow-500/20 text-yellow-400 rounded-full">Pendiente</span>';
    } else if (lower === 'aceptada') {
        return '<span class="text-xs font-bold py-1 px-3 bg-blue-500/20 text-blue-400 rounded-full">Pago pendiente</span>';
    } else if (lower === 'pagado anticipo') {
        return '<span class="text-xs font-bold py-1 px-3 bg-orange-500/20 text-orange-400 rounded-full">Anticipo pagado</span>';
    } else if (lower === 'pagada') {
        return '<span class="text-xs font-bold py-1 px-3 bg-green-500/20 text-green-400 rounded-full">Pagada</span>';
    } else if (lower === 'revisada') {
        return '<span class="text-xs font-bold py-1 px-3 bg-primary/20 text-primary rounded-full">Revisada</span>';
    } else if (lower === 'rechazada') {
        return '<span class="text-xs font-bold py-1 px-3 bg-red-500/20 text-red-400 rounded-full">Rechazada</span>';
    } else if (lower === 'cancelada') {
        return '<span class="text-xs font-bold py-1 px-3 bg-gray-500/20 text-gray-400 rounded-full">Cancelada</span>';
    }
    return `<span class="text-xs font-bold py-1 px-3 bg-gray-500/20 text-gray-400 rounded-full">${estado}</span>`;
}

// ===== FUNCIONALIDAD DE SEGUIMIENTO =====
async function verSeguimiento(idCita) {
    try {
        showToast('Buscando seguimiento...', 'info');

        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (!currentUser) {
            showToast('No hay sesión iniciada', 'error');
            return;
        }

        const response = await fetch(`${API_BASE}/seguimientos/por-cita/${idCita}`);

        if (!response.ok) {
            if (response.status === 404) {
                showToast('No se encontró seguimiento para esta cita', 'error');
                return;
            }
            throw new Error('Error en la petición');
        }

        const result = await response.json();

        if (result.seguimientoId) {
            let url = `/pages/cliente/seguimiento/cliente-detalle.html?id=${result.seguimientoId}`;
            if (currentUser.rol === 'cliente') {
                url += `&idcliente=${currentUser.idcliente}`;
            } else if (currentUser.rol === 'tatuador') {
                url += `&idtatuador=${currentUser.idempleado}`;
            }
            window.location.href = url;
        } else {
            showToast('No se encontró seguimiento para esta cita', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al buscar seguimiento', 'error');
    }
}

// ===== MIS COTIZACIONES =====
async function initMisCotizaciones() {
    const listContainer = document.getElementById('cotizaciones-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <p class="text-gray-400 mt-4">Cargando cotizaciones...</p>
        </div>
    `;

    let todas = [];
    let filtroEstado = 'activas';
    let filtroFecha  = 'proximas';

    function aplicarFiltros() {
        let resultado = [...todas];
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

        // Filtro estado
        switch (filtroEstado) {
            case 'activas':
                resultado = resultado.filter(c => !['pagada','cancelada','rechazada'].includes((c.estado||'').toLowerCase()));
                break;
            case 'pendiente':
                resultado = resultado.filter(c => ['enviada','pendiente'].includes((c.estado||'').toLowerCase()));
                break;
            case 'aceptada':
                resultado = resultado.filter(c => (c.estado||'').toLowerCase() === 'aceptada');
                break;
            case 'anticipo':
                resultado = resultado.filter(c => (c.estado||'').toLowerCase() === 'pagado anticipo');
                break;
            case 'pagada':
                resultado = resultado.filter(c => (c.estado||'').toLowerCase() === 'pagada');
                break;
            // 'todas': sin filtro de estado
        }

        // Filtro fecha — substring(0,10) normaliza tanto "2025-05-11" como "2025-05-11T00:00:00.000Z"
        if (filtroFecha === 'proximas') {
            resultado = resultado.filter(c => new Date(String(c.fecha).substring(0, 10) + 'T12:00:00') >= hoy);
        } else if (filtroFecha === 'pasadas') {
            resultado = resultado.filter(c => new Date(String(c.fecha).substring(0, 10) + 'T12:00:00') < hoy);
        }

        renderCotizaciones(resultado, listContainer);
    }

    // Eventos de los chips de estado
    document.querySelectorAll('.filter-estado').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-estado').forEach(b => {
                b.className = b.className.replace('bg-primary text-white', 'bg-white/10 text-gray-400');
            });
            btn.className = btn.className.replace('bg-white/10 text-gray-400', 'bg-primary text-white');
            filtroEstado = btn.dataset.estado;
            aplicarFiltros();
        });
    });

    // Eventos de los chips de fecha
    document.querySelectorAll('.filter-fecha').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-fecha').forEach(b => {
                b.className = b.className.replace('border-primary text-primary', 'border-white/20 text-gray-500');
            });
            btn.className = btn.className.replace('border-white/20 text-gray-500', 'border-primary text-primary');
            filtroFecha = btn.dataset.fecha;
            aplicarFiltros();
        });
    });

    try {
        const res = await fetch(`${API_BASE}/cotizaciones/cliente/${user.idcliente}`);
        const json = await res.json();
        todas = (json.status === 'ok' && json.data.length > 0) ? json.data : [];
        aplicarFiltros();
    } catch (err) {
        console.error('Error:', err);
        listContainer.innerHTML = '<p class="text-red-400 text-center py-8">Error al cargar cotizaciones</p>';
    }
}

function renderCotizaciones(visibles, container) {
    if (visibles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <span class="material-symbols-outlined text-6xl text-gray-600">receipt_long</span>
                <p class="text-gray-400 mt-4">No hay cotizaciones con este filtro</p>
                <a href="/pages/cliente/agendar_cita/cita_datos.html"
                   class="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-xl font-bold">
                    Agendar una cita
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = visibles.map(cot => {
        const estado = (cot.estado || '').toLowerCase();
        const clickable = ['aceptada', 'enviada', 'pendiente', 'pagada', 'revisada', 'pagado anticipo'].includes(estado);
        const canCancel = !['pagado anticipo', 'pagada'].includes(estado);

        const precioFinal = cot.preciofinal ? parseFloat(cot.preciofinal) : null;
        const montoEstimado = parseFloat(cot.montoestimado) || 0;
        const precioMostrar = precioFinal ? precioFinal : montoEstimado;

        return `
        <div class="bg-[#261933] border border-[#362348] rounded-xl p-4 ${clickable ? 'hover:border-primary/50' : 'opacity-80'} transition-all cotizacion-card"
             data-id="${cot.idcotizacion}" data-idcita="${cot.idcita}" data-estado="${estado}">

            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3 cursor-pointer card-click-area" data-id="${cot.idcotizacion}" data-idcita="${cot.idcita}" data-estado="${estado}">
                    <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        ${cot.tatuador_foto
                            ? `<img src="${cot.tatuador_foto}" class="w-full h-full object-cover" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='';">
                               <span class="material-symbols-outlined text-primary" style="display:none">person</span>`
                            : '<span class="material-symbols-outlined text-primary">person</span>'
                        }
                    </div>
                    <div>
                        <p class="text-white font-bold">${escapeHtml(cot.tatuador_nombre || 'Tatuador')}</p>
                        <p class="text-gray-400 text-xs">${escapeHtml(cot.estilo || 'Sin estilo')}</p>
                    </div>
                </div>
                ${getEstadoBadge(cot.estado)}
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm text-gray-400 cursor-pointer card-click-area mb-3" data-id="${cot.idcotizacion}" data-idcita="${cot.idcita}" data-estado="${estado}">
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">calendar_today</span>
                    <span class="truncate">${formatFecha(cot.fecha)}</span>
                </div>
                ${cot.hora ? `
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">schedule</span>
                    <span>${cot.hora.substring(0, 5)} hrs</span>
                </div>` : ''}
                ${cot.zonacuerpo ? `
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">body_system</span>
                    <span class="truncate">Zona: ${escapeHtml(cot.zonacuerpo)}</span>
                </div>` : ''}
                ${cot.tamanio ? `
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">straighten</span>
                    <span>Tamaño: ${escapeHtml(cot.tamanio)} cm</span>
                </div>` : ''}
            </div>

            ${cot.descripcion ? `
            <div class="mb-3 p-2 bg-black/20 rounded-lg cursor-pointer card-click-area" data-id="${cot.idcotizacion}" data-idcita="${cot.idcita}" data-estado="${estado}">
                <p class="text-xs text-gray-400 line-clamp-2">${escapeHtml(cot.descripcion)}</p>
            </div>
            ` : ''}

            <div class="mt-3 pt-3 border-t border-[#362348] flex justify-between items-center">
                <div class="flex flex-col">
                    <span class="text-gray-400 text-xs">${precioFinal ? 'Precio final' : 'Precio estimado'}</span>
                    <div class="flex items-center gap-1">
                        <span class="text-white font-bold text-lg">$${precioMostrar.toFixed(2)}</span>
                        <span class="text-xs text-gray-500">${precioFinal ? '(MXN)' : '(aprox)'}</span>
                    </div>
                </div>

                <div class="flex gap-2">
                    ${canCancel ? `
                    <button class="btn-cancelar-cot flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors py-1 px-3 rounded-lg hover:bg-red-500/10"
                            data-id="${cot.idcotizacion}">
                        <span class="material-symbols-outlined text-sm">cancel</span>
                        Cancelar
                    </button>
                    ` : ''}

                    ${estado === 'pagado anticipo' ? `
                    <button class="btn-liquidacion-cot flex items-center gap-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors py-2 px-4 rounded-lg"
                            data-id="${cot.idcotizacion}">
                        <span class="material-symbols-outlined text-sm">payments</span> Pagar liquidación
                    </button>
                    ` : ''}

                    ${estado === 'pagada' ? `
                    <button class="btn-seguimiento-cot flex items-center gap-1 text-xs font-bold text-white bg-green-600 hover:bg-green-500 transition-colors py-2 px-4 rounded-lg"
                            data-idcita="${cot.idcita}">
                        <span class="material-symbols-outlined text-sm">chat</span> Ver Seguimiento
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Eventos Click - Navegar a detalle
    container.querySelectorAll('.card-click-area').forEach(area => {
        area.addEventListener('click', () => {
            const id = area.dataset.id;
            const estado = area.dataset.estado;

            localStorage.setItem('cotizacionSeleccionada', id);

            if (estado === 'aceptada') {
                localStorage.setItem('tipoPago', 'anticipo');
                window.location.href = '/pages/cliente/cotizacion/pagar_stripe_cotizacion.html';
            } else if (estado === 'pagado anticipo') {
                localStorage.setItem('tipoPago', 'liquidacion');
                window.location.href = '/pages/cliente/cotizacion/pagar_stripe_cotizacion.html';
            } else if (estado === 'pagada') {
                window.location.href = '/pages/cliente/cotizacion/resumen_cotizacion.html';
            } else {
                window.location.href = '/pages/cliente/cotizacion/aceptar_cotizacion.html';
            }
        });
    });

    // Eventos Botón Liquidación
    container.querySelectorAll('.btn-liquidacion-cot').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.setItem('cotizacionSeleccionada', btn.dataset.id);
            localStorage.setItem('tipoPago', 'liquidacion');
            window.location.href = '/pages/cliente/cotizacion/pagar_stripe_cotizacion.html';
        });
    });

    // Eventos Botón Seguimiento (Exclusivo)
    container.querySelectorAll('.btn-seguimiento-cot').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que se dispare el click de la tarjeta
            verSeguimiento(btn.dataset.idcita);
        });
    });

    // Eventos Botón Cancelar
    container.querySelectorAll('.btn-cancelar-cot').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (!confirm('¿Cancelar esta cotización? Se liberará el horario.')) return;

            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Cancelando...';

            try {
                const r = await fetch(`${API_BASE}/cotizaciones/${id}/cancelar`, { method: 'PUT' });
                const j = await r.json();
                if (j.status === 'success') {
                    showToast('Cotización cancelada');
                    const card = btn.closest('.cotizacion-card');
                    if (card) {
                        card.style.transition = 'opacity 0.3s, transform 0.3s';
                        card.style.opacity = '0';
                        card.style.transform = 'translateX(100%)';
                        setTimeout(() => card.remove(), 300);
                    }
                } else {
                    showToast(j.message || 'Error al cancelar', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined text-sm">cancel</span> Cancelar';
                }
            } catch (err) {
                showToast('Error de conexión', 'error');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined text-sm">cancel</span> Cancelar';
            }
        });
    });
}

// ===== ACEPTAR COTIZACIÓN =====
async function initAceptarCotizacion() {
    const idCot = localStorage.getItem('cotizacionSeleccionada');
    if (!idCot) {
        window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html';
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
        const estado = (cot.estado || '').toLowerCase();

        const elImagenWrap = document.getElementById('ac-imagen-wrap');
        const elImagen = document.getElementById('ac-imagen');
        if (elImagen && cot.foto_referecncia_url) {
            elImagen.src = cot.foto_referecncia_url;
            if (elImagenWrap) elImagenWrap.classList.remove('hidden');
        }

        const elDescripcion = document.getElementById('ac-descripcion');
        const elDetalles = document.getElementById('ac-detalles');
        const elArtista = document.getElementById('ac-artista');
        const elFecha = document.getElementById('ac-fecha');
        const elHora = document.getElementById('ac-hora');
        const elEstimado = document.getElementById('ac-estimado');
        const elPrecioFinal = document.getElementById('ac-precio-final');
        const elTotal = document.getElementById('ac-total');
        const elJustificacion = document.getElementById('ac-justificacion');
        const elEstado = document.getElementById('ac-estado');

        if (elDescripcion) elDescripcion.textContent = cot.descripcion || 'Sin descripción';
        if (elDetalles) {
            const parts = [];
            if (cot.estilo) parts.push(cot.estilo);
            if (cot.tamanio) parts.push(`${cot.tamanio} cm`);
            if (cot.zonacuerpo) parts.push(cot.zonacuerpo);
            elDetalles.textContent = parts.join(', ') || '';
        }
        if (elArtista) elArtista.textContent = cot.tatuador_nombre || '';
        if (elFecha) elFecha.textContent = formatFecha(cot.fecha);
        if (elHora) elHora.textContent = cot.hora?.substring(0, 5) || '';

        const precio = parseFloat(cot.preciofinal || cot.montoestimado || 0);

        if (elEstimado) elEstimado.textContent = `$${parseFloat(cot.montoestimado || 0).toFixed(2)}`;
        if (elPrecioFinal) elPrecioFinal.textContent = `$${precio.toFixed(2)}`;
        if (elTotal) elTotal.textContent = `$${precio.toFixed(2)}`;
        if (elJustificacion) {
            if (cot.justificacion_ajuste) {
                elJustificacion.textContent = cot.justificacion_ajuste;
                const wrap = document.getElementById('ac-justificacion-wrap');
                if (wrap) wrap.classList.remove('hidden');
            }
        }
        if (elEstado) elEstado.innerHTML = getEstadoBadge(cot.estado);

        const btnAceptar = document.getElementById('btn-aceptar-cot');
        const btnCancelar = document.getElementById('btn-cancelar-cot');

        if (estado === 'aceptada') {
            if (btnAceptar) {
                btnAceptar.classList.remove('hidden');
                btnAceptar.addEventListener('click', async () => {
                    btnAceptar.disabled = true;
                    btnAceptar.textContent = 'Procesando...';
                    try {
                        const r = await fetch(`${API_BASE}/cotizaciones/${idCot}/aceptar`, { method: 'PUT' });
                        const j = await r.json();
                        if (j.status === 'success') {
                            window.location.href = '/pages/cliente/cotizacion/pagar_stripe_cotizacion.html';
                        } else {
                            showToast(j.message || 'Error', 'error');
                            btnAceptar.disabled = false;
                            btnAceptar.textContent = 'Aceptar y Pagar';
                        }
                    } catch (e) {
                        showToast('Error de conexión', 'error');
                        btnAceptar.disabled = false;
                        btnAceptar.textContent = 'Aceptar y Pagar';
                    }
                });
            }
        } else if (estado === 'enviada' || estado === 'pendiente') {
            if (btnAceptar) {
                btnAceptar.textContent = 'Esperando revisión del tatuador...';
                btnAceptar.disabled = true;
                btnAceptar.classList.add('opacity-50');
            }
        } else {
            if (btnAceptar) btnAceptar.classList.add('hidden');
        }

        if (btnCancelar) {
            if (estado === 'aceptada' || estado === 'enviada' || estado === 'pendiente') {
                btnCancelar.classList.remove('hidden');
                btnCancelar.addEventListener('click', async () => {
                    if (!confirm('¿Estás seguro de cancelar esta cotización? Se liberará el horario.')) return;
                    try {
                        const r = await fetch(`${API_BASE}/cotizaciones/${idCot}/cancelar`, { method: 'PUT' });
                        const j = await r.json();
                        if (j.status === 'success') {
                            showToast('Cotización cancelada');
                            setTimeout(() => { window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html'; }, 1000);
                        } else {
                            showToast(j.message || 'Error', 'error');
                        }
                    } catch (e) { showToast('Error de conexión', 'error'); }
                });
            } else {
                btnCancelar.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error al cargar cotización', 'error');
    }

    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', () => window.history.back());
}

// ===== NUEVO: RESUMEN DE COTIZACIÓN PAGADA =====
async function initResumenCotizacion() {
    const idCot = localStorage.getItem('cotizacionSeleccionada');
    if (!idCot) {
        window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cotizaciones/${idCot}`);
        const json = await res.json();
        if (json.status !== 'ok') return;
        const cot = json.data;

        // Elementos DOM
        const imgRef = document.getElementById('resumen-imagen');
        const txtEstilo = document.getElementById('resumen-estilo');
        const txtDetalles = document.getElementById('resumen-detalles');
        const imgArtista = document.getElementById('resumen-artista-foto');
        const txtArtista = document.getElementById('resumen-artista-nombre');
        const txtFechaHora = document.getElementById('resumen-fecha-hora');
        const txtMonto = document.getElementById('resumen-monto');
        const btnVerReferencia = document.getElementById('btn-ver-referencia');

        // Poblar datos
        if (imgRef && cot.foto_referecncia_url) {
            imgRef.style.backgroundImage = `url('${cot.foto_referecncia_url}')`;
            imgRef.innerHTML = ''; // Limpiar el icono de imagen
        }
        
        if (txtEstilo) txtEstilo.textContent = `Diseño de ${cot.estilo || 'Tatuaje'}`;
        
        let detalleStr = `${cot.tamanio ? cot.tamanio + 'cm, ' : ''}${cot.zonacuerpo || 'Zona no especificada'}. ${cot.descripcion || ''}`;
        if (txtDetalles) txtDetalles.textContent = detalleStr;
        
        if (imgArtista && cot.tatuador_foto) {
            imgArtista.style.backgroundImage = `url('${cot.tatuador_foto}')`;
            imgArtista.innerHTML = '';
        }
        if (txtArtista) txtArtista.textContent = cot.tatuador_nombre || 'Artista';
        
        if (txtFechaHora) {
            const fechaFmt = formatFecha(cot.fecha);
            const horaFmt = cot.hora ? cot.hora.substring(0, 5) : '';
            txtFechaHora.innerHTML = `${fechaFmt}<br/>${horaFmt} hrs`;
        }
        
        const precio = parseFloat(cot.preciofinal || cot.montoestimado || 0);
        if (txtMonto) txtMonto.textContent = `$${precio.toFixed(2)}`;

        // Botones
        const btnSeguimiento = document.getElementById('btn-resumen-seguimiento');
        if (btnSeguimiento) btnSeguimiento.addEventListener('click', () => verSeguimiento(cot.idcita));

        if (btnVerReferencia && cot.foto_referecncia_url) {
            btnVerReferencia.onclick = () => window.open(cot.foto_referecncia_url, '_blank');
        } else if (btnVerReferencia) {
            btnVerReferencia.classList.add('hidden');
        }

    } catch (err) {
        console.error('Error cargando resumen:', err);
    }

    const goBack = () => window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html';
    
    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', goBack);
    
    const btnVolver = document.getElementById('btn-resumen-volver');
    if (btnVolver) btnVolver.addEventListener('click', goBack);
}

// ===== PAGAR STRIPE (anticipo y liquidación) =====
async function initPagarStripe() {
    const idCot = localStorage.getItem('cotizacionSeleccionada');
    const tipoPago = localStorage.getItem('tipoPago') || 'anticipo';
    const esLiquidacion = tipoPago === 'liquidacion';

    if (!idCot) {
        window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cotizaciones/${idCot}`);
        const json = await res.json();
        if (json.status !== 'ok') return;

        const cot = json.data;
        const precio = parseFloat(cot.preciofinal || cot.montoestimado || 0);

        // El anticipo_pct lo obtenemos del backend al crear el checkout;
        // para la UI usamos 50% como estimado hasta tener la respuesta real.
        // Si ya viene en localStorage (del checkout previo) lo usamos.
        const anticipoPct = parseFloat(localStorage.getItem('anticipoPct') || '50');
        const montoMostrar = esLiquidacion
            ? Math.round(precio * (1 - anticipoPct / 100) * 100) / 100
            : Math.round(precio * (anticipoPct / 100) * 100) / 100;

        const elMonto = document.getElementById('stripe-monto');
        const elTipoLabel = document.getElementById('stripe-tipo-label');
        const elResumen = document.getElementById('stripe-resumen');
        const elInfoAnticipo = document.getElementById('stripe-info-anticipo');
        const btnPagar = document.getElementById('btn-pagar');
        const btnPagarText = document.getElementById('btn-pagar-text');
        const btnCancelarPago = document.getElementById('btn-cancelar-pago');

        if (elTipoLabel) elTipoLabel.textContent = esLiquidacion ? 'Liquidación del servicio' : `Anticipo de reserva (~${anticipoPct}%)`;
        if (elMonto) elMonto.textContent = `$${montoMostrar.toFixed(2)}`;
        if (elInfoAnticipo) {
            elInfoAnticipo.textContent = esLiquidacion
                ? 'Este es el saldo restante de tu tatuaje. Al pagarlo, el servicio queda liquidado.'
                : `El ${anticipoPct}% del precio total reserva tu cita. El saldo restante se paga el día del tatuaje.`;
        }
        if (elResumen) {
            elResumen.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Artista</span>
                        <span class="text-white font-medium">${escapeHtml(cot.tatuador_nombre || '—')}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Fecha</span>
                        <span class="text-white font-medium">${formatFecha(cot.fecha)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Hora</span>
                        <span class="text-white font-medium">${cot.hora?.substring(0, 5) || '—'} hrs</span>
                    </div>
                    <div class="mt-2 pt-2 border-t border-white/10 flex justify-between">
                        <span>Precio total del tatuaje</span>
                        <span class="text-white font-medium">$${precio.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }

        // Ocultar botón cancelar en liquidación (no se puede cancelar una cita ya confirmada)
        if (esLiquidacion && btnCancelarPago) {
            btnCancelarPago.classList.add('hidden');
        }

        if (btnPagar) {
            if (btnPagarText) btnPagarText.textContent = `Continuar al pago`;

            btnPagar.addEventListener('click', async (e) => {
                e.preventDefault();
                btnPagar.disabled = true;
                if (btnPagarText) btnPagarText.textContent = 'Redirigiendo a Stripe...';

                const endpoint = esLiquidacion
                    ? `${API_BASE}/pagos/checkout-liquidacion`
                    : `${API_BASE}/pagos/checkout`;

                try {
                    const r = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idCotizacion: idCot }),
                    });
                    const j = await r.json();

                    if (j.status === 'ok' && j.url) {
                        // Guardar anticipoPct real para el cálculo en pago_exitoso
                        if (j.anticipoPct) localStorage.setItem('anticipoPct', j.anticipoPct);
                        window.location.href = j.url;
                    } else {
                        showToast(j.message || 'Error al iniciar el pago', 'error');
                        btnPagar.disabled = false;
                        if (btnPagarText) btnPagarText.textContent = 'Continuar al pago';
                    }
                } catch (err) {
                    showToast('Error de conexión', 'error');
                    btnPagar.disabled = false;
                    if (btnPagarText) btnPagarText.textContent = 'Continuar al pago';
                }
            });
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error al cargar cotización', 'error');
    }

    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', () => window.history.back());

    const btnCancelar = document.getElementById('btn-cancelar-pago');
    if (btnCancelar && !esLiquidacion) {
        btnCancelar.addEventListener('click', async () => {
            if (!confirm('¿Cancelar esta cotización? Se liberará el horario.')) return;
            btnCancelar.disabled = true;
            btnCancelar.textContent = 'Cancelando...';
            try {
                const r = await fetch(`${API_BASE}/cotizaciones/${idCot}/cancelar`, { method: 'PUT' });
                const j = await r.json();
                if (j.status === 'success') {
                    showToast('Cotización cancelada');
                    setTimeout(() => { window.location.href = '/pages/cliente/cotizacion/mis_cotizaciones.html'; }, 1000);
                } else {
                    showToast(j.message || 'Error', 'error');
                    btnCancelar.disabled = false;
                    btnCancelar.textContent = 'Cancelar cotización';
                }
            } catch (err) {
                showToast('Error de conexión', 'error');
                btnCancelar.disabled = false;
                btnCancelar.textContent = 'Cancelar cotización';
            }
        });
    }
}

// ===== CONFIRMAR COTIZACIÓN (cita confirmada) =====
function initConfirmarCotizacion() {
    const data = JSON.parse(localStorage.getItem('citaConfirmada') || '{}');
    const idCot = localStorage.getItem('cotizacionSeleccionada');

    if (idCot) {
        fetch(`${API_BASE}/cotizaciones/${idCot}`)
            .then(r => r.json())
            .then(json => {
                if (json.status === 'ok') {
                    const cot = json.data;
                    const elTatuador = document.getElementById('conf-tatuador');
                    const elFecha = document.getElementById('conf-fecha');
                    const elHora = document.getElementById('conf-hora');

                    if (elTatuador) elTatuador.textContent = cot.tatuador_nombre || '';
                    if (elFecha) elFecha.textContent = formatFecha(cot.fecha);
                    if (elHora) elHora.textContent = cot.hora?.substring(0, 5) || '';
                }
            })
            .catch(() => {});
    }

    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            localStorage.removeItem('citaConfirmada');
            localStorage.removeItem('cotizacionSeleccionada');
            window.location.href = '/pages/cliente/menu_cliente.html';
        });
    }
}

// ===== AUTO-INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path.includes('mis_cotizaciones')) initMisCotizaciones();
    else if (path.includes('resumen_cotizacion')) initResumenCotizacion(); // <-- Añadido el disparo de la nueva vista
    else if (path.includes('aceptar_cotizacion')) initAceptarCotizacion();
    else if (path.includes('pagar_stripe')) initPagarStripe();
    else if (path.includes('confirmar_cotizacion')) initConfirmarCotizacion();
});