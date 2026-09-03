// js/agendar_cita.js
// Maneja todo el flujo de agendar cita: datos → hora → resumen → enviar

const API_BASE = '/api';

const user = JSON.parse(localStorage.getItem('user') || 'null');
const empresa = JSON.parse(localStorage.getItem('empresa') || 'null');

if (!user || user.rol !== 'cliente') {
    window.location.href = '/';
}

// ===== UTILIDADES =====
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

function formatFecha(fechaStr) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const d = new Date(fechaStr + 'T12:00:00');
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
}

// NUEVA UTILIDAD: Compresión de Imágenes
function comprimirImagen(file, maxSizeKB = 250) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Redimensionar inteligentemente (Max 1024px)
                let maxWidth = 1024;
                let maxHeight = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Rellenar fondo de blanco (previene fondos negros en PNG transparentes)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.9; // Calidad inicial alta
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Función para calcular peso en KB de una cadena Base64
                const getFileSizeKB = (base64Str) => {
                    let padding = 0;
                    if (base64Str.endsWith("==")) padding = 2;
                    else if (base64Str.endsWith("=")) padding = 1;
                    const base64Length = base64Str.length - (base64Str.indexOf(',') + 1);
                    return ((base64Length * 3) / 4 - padding) / 1024;
                };

                // Bucle de reducción dinámica: baja la calidad hasta pesar menos de 250kb
                while (getFileSizeKB(dataUrl) > maxSizeKB && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                console.log(`📸 Imagen comprimida: ~${getFileSizeKB(dataUrl).toFixed(2)} KB | Calidad final: ${quality.toFixed(1)}`);
                resolve(dataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// ===== PÁGINA: CITA_DATOS =====
async function initCitaDatos() {
    const form = document.getElementById('form-datos-cita');
    if (!form) return;

    // Pre-llenar datos del usuario
    const nombreInput = document.getElementById('input-nombre');
    const apellidoInput = document.getElementById('input-apellido');
    if (nombreInput && user.nombre) nombreInput.value = user.nombre;
    if (apellidoInput) {
        if (user.apellido_paterno || user.apellido_materno) {
            apellidoInput.value = (user.apellido_paterno || '') + ' ' + (user.apellido_materno || '');
        } else {
            const stored = JSON.parse(localStorage.getItem('citaDatos') || '{}');
            if (stored.apellido) apellidoInput.value = stored.apellido;
        }
    }

    // Cargar técnicas de la empresa dinámicamente
    const tecnicasContainer = document.getElementById('tecnicas-container');
    let idTecnicaSeleccionado = null;
    let nombreTecnicaSeleccionado = '';

    if (tecnicasContainer && empresa) {
        try {
            const resTec = await fetch(`${API_BASE}/tecnicas/${empresa.idEmpresa}`);
            const jsonTec = await resTec.json();
            if (jsonTec.status === 'ok' && jsonTec.data.length > 0) {
                tecnicasContainer.innerHTML = jsonTec.data.map(t => `
                    <button type="button" class="estilo-btn px-4 py-2 text-sm font-medium rounded-full bg-white/5 border border-white/20 text-white/80"
                        data-idtecnica="${t.idtecnica}" data-nombre="${t.nombretecnica}">${t.nombretecnica}</button>
                `).join('');
            } else {
                tecnicasContainer.innerHTML = '<p class="text-gray-400 text-sm">No hay técnicas configuradas</p>';
            }
        } catch (err) {
            console.error('Error cargando técnicas:', err);
            tecnicasContainer.innerHTML = '<p class="text-red-400 text-sm">Error al cargar técnicas</p>';
        }
    }

    // Manejo de estilos/técnicas (selección)
    const estiloButtons = document.querySelectorAll('.estilo-btn');
    estiloButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.estilo-btn').forEach(b => {
                b.classList.remove('bg-primary/20', 'border-primary', 'text-primary');
                b.classList.add('bg-white/5', 'border-white/20', 'text-white/80');
            });
            btn.classList.remove('bg-white/5', 'border-white/20', 'text-white/80');
            btn.classList.add('bg-primary/20', 'border-primary', 'text-primary');
            idTecnicaSeleccionado = parseInt(btn.dataset.idtecnica);
            nombreTecnicaSeleccionado = btn.dataset.nombre;
        });
    });

    // Manejo de zona del cuerpo
    const zonaButtons = document.querySelectorAll('.zona-btn');
    const zonaCuerpoInputContainer = document.getElementById('zona-cuerpo-input-container');
    const zonaCuerpoInput = document.getElementById('zona-cuerpo-input');
    let zonaSeleccionada = '';
    zonaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            zonaButtons.forEach(b => b.classList.remove('ring-2', 'ring-primary'));
            if(btn.dataset.zona === '+') {
                zonaCuerpoInputContainer.classList.remove('hidden');
                zonaCuerpoInput.addEventListener('input', () => {
                    zonaSeleccionada = zonaCuerpoInput?.value.trim() || '';
                    console.log('Zona personalizada:', zonaSeleccionada);
                });
            } else {
                zonaCuerpoInputContainer.classList.add('hidden');
                zonaSeleccionada = btn.dataset.zona;
            }
            btn.classList.add('ring-2', 'ring-primary');
            console.log('Zona seleccionada:', zonaSeleccionada);
        });
    });

    // Subir imagen de referencia CON COMPRESIÓN
    const inputFoto = document.getElementById('input-foto');
    const previewFoto = document.getElementById('preview-foto');
    let fotoBase64 = '';

    if (inputFoto) {
        inputFoto.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    showToast('Procesando imagen...', 'info');
                    // Llamamos a la nueva función de compresión (límite 250KB)
                    fotoBase64 = await comprimirImagen(file, 250); 
                    
                    if (previewFoto) {
                        previewFoto.src = fotoBase64;
                        previewFoto.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Error al procesar la imagen:', error);
                    showToast('Ocurrió un error al cargar la imagen', 'error');
                }
            }
        });
    }

    // Botón siguiente
    const btnSiguiente = document.getElementById('btn-siguiente');
    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', () => {
            const descripcion = document.getElementById('input-descripcion')?.value?.trim();
            const ancho = document.getElementById('input-ancho')?.value;
            const alto = document.getElementById('input-alto')?.value;

            if (!descripcion) {
                showToast('Por favor describe tu idea de tatuaje', 'error');
                return;
            }
            if (!ancho || !alto) {
                showToast('Por favor ingresa el tamaño (ancho y alto)', 'error');
                return;
            }
            if (!idTecnicaSeleccionado) {
                showToast('Por favor selecciona una técnica', 'error');
                return;
            }

            // Guardar datos en localStorage para el siguiente paso
            const citaDatos = {
                nombre: nombreInput?.value || user.nombre,
                apellido: apellidoInput?.value || '',
                descripcion,
                ancho: ancho || '',
                alto: alto || '',
                tamanio: (ancho && alto) ? `${ancho}x${alto}` : '',
                idTecnica: idTecnicaSeleccionado,
                estilo: nombreTecnicaSeleccionado,
                zonaCuerpo: zonaSeleccionada,
                fotoReferencia: fotoBase64
            };

            localStorage.setItem('citaDatos', JSON.stringify(citaDatos));
            window.location.href = 'cita_hora.html';
        });
    }
}

// ===== PÁGINA: CITA_HORA =====
async function initCitaHora() {
    const container = document.getElementById('artistas-container');
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');
    const slotsContainer = document.getElementById('slots-container');
    const btnSiguiente = document.getElementById('btn-siguiente');
    const btnPrevMonth = document.getElementById('btn-prev-month');
    const btnNextMonth = document.getElementById('btn-next-month');

    if (!container || !empresa) return;

    let tatuadores = [];
    let tatuadorSeleccionado = null;
    let fechaSeleccionada = null;
    let horaSeleccionada = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    // Cargar tatuadores
    try {
        const res = await fetch(`${API_BASE}/tatuadores/${empresa.idEmpresa}`);
        const json = await res.json();
        if (json.status === 'ok') {
            tatuadores = json.data;
            renderTatuadores();
        }
    } catch (err) {
        console.error('Error cargando tatuadores:', err);
        container.innerHTML = '<p class="text-red-400 p-4">Error al cargar artistas</p>';
    }

    function renderTatuadores() {
        container.innerHTML = tatuadores.map((t, i) => `
            <div class="flex flex-col items-center gap-2 min-w-[100px] cursor-pointer tatuador-card ${i === 0 ? '' : 'opacity-60'}"
                 data-id="${t.idtatuador}" data-nombre="${t.nombre}">
                <div class="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden
                    ${i === 0 ? 'ring-2 ring-primary ring-offset-4 ring-offset-background-dark' : ''}">
                    ${t.foto_url
                ? `<img src="${t.foto_url}" class="w-full h-full object-cover" alt="${t.nombre}" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='';">
                   <span class="material-symbols-outlined text-3xl text-gray-400" style="display:none">person</span>`
                : `<span class="material-symbols-outlined text-3xl text-gray-400">person</span>`
            }
                </div>
                <p class="text-white text-sm font-medium text-center">${t.nombre}</p>
                <p class="text-gray-400 text-xs text-center">${t.estilos}</p>
            </div>
        `).join('');

        // Seleccionar primer tatuador por defecto
        if (tatuadores.length > 0) {
            tatuadorSeleccionado = tatuadores[0];
        }

        // Click en tatuador
        document.querySelectorAll('.tatuador-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.tatuador-card').forEach(c => {
                    c.classList.add('opacity-60');
                    c.querySelector('div').classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-background-dark');
                });
                card.classList.remove('opacity-60');
                card.querySelector('div').classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-background-dark');
                tatuadorSeleccionado = tatuadores.find(t => t.idtatuador === parseInt(card.dataset.id));

                // Re-cargar disponibilidad si hay fecha seleccionada
                if (fechaSeleccionada) {
                    cargarDisponibilidad();
                }
            });
        });
    }

    // Calendario
    function renderCalendar() {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        calendarTitle.textContent = `${meses[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        let startDay = firstDay.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1; // Ajustar a Lunes=0

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Días del mes anterior
        const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
        let html = '';

        for (let i = startDay - 1; i >= 0; i--) {
            html += `<button class="h-10 w-full flex items-center justify-center text-gray-600 text-sm cursor-not-allowed" disabled>${prevMonthLast - i}</button>`;
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateObj = new Date(currentYear, currentMonth, d);
            dateObj.setHours(0, 0, 0, 0);
            const isPast = dateObj < today;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = fechaSeleccionada === dateStr;

            if (isPast) {
                html += `<button class="h-10 w-full flex items-center justify-center text-gray-600 text-sm cursor-not-allowed" disabled>${d}</button>`;
            } else {
                html += `<button class="h-10 w-full flex items-center justify-center text-sm font-medium calendar-day
                    ${isSelected ? 'bg-primary text-white rounded-full' : 'text-white hover:bg-white/10 rounded-full'}"
                    data-date="${dateStr}">${d}</button>`;
            }
        }

        calendarGrid.innerHTML = html;

        // Click en día
        document.querySelectorAll('.calendar-day').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(b => {
                    b.classList.remove('bg-primary', 'text-white');
                    b.classList.add('text-white');
                });
                btn.classList.add('bg-primary', 'text-white');
                fechaSeleccionada = btn.dataset.date;
                horaSeleccionada = null;
                cargarDisponibilidad();
            });
        });
    }

    async function cargarDisponibilidad() {
        if (!tatuadorSeleccionado || !fechaSeleccionada) return;

        slotsContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Cargando horarios...</p>';

        try {
            const res = await fetch(`${API_BASE}/disponibilidad/${tatuadorSeleccionado.idtatuador}?fecha=${fechaSeleccionada}`);
            const json = await res.json();

            if (json.status === 'ok' && json.data.length > 0) {
                slotsContainer.innerHTML = `
                    <div class="grid grid-cols-3 gap-2">
                        ${json.data.map(slot => `
                            <button class="slot-btn py-3 px-2 rounded-lg text-sm font-medium transition-all
                                ${slot.disponible
                        ? 'bg-white/5 border border-white/20 text-white hover:border-primary hover:bg-primary/10'
                        : 'bg-gray-800/30 text-gray-600 cursor-not-allowed line-through'
                    }" data-hora="${slot.hora}" ${slot.disponible ? '' : 'disabled'}>
                                ${slot.hora}
                            </button>
                        `).join('')}
                    </div>
                `;

                document.querySelectorAll('.slot-btn:not([disabled])').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.slot-btn').forEach(b => {
                            b.classList.remove('bg-primary', 'border-primary', 'text-white');
                            if (!b.disabled) {
                                b.classList.add('bg-white/5', 'border-white/20');
                            }
                        });
                        btn.classList.remove('bg-white/5', 'border-white/20');
                        btn.classList.add('bg-primary', 'border-primary', 'text-white');
                        horaSeleccionada = btn.dataset.hora;
                    });
                });
            } else {
                slotsContainer.innerHTML = '<p class="text-gray-400 text-center py-4">No hay horarios disponibles para este día</p>';
            }
        } catch (err) {
            console.error('Error cargando disponibilidad:', err);
            slotsContainer.innerHTML = '<p class="text-red-400 text-center py-4">Error al cargar horarios</p>';
        }
    }

    // Navigation
    if (btnPrevMonth) {
        btnPrevMonth.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });
    }
    if (btnNextMonth) {
        btnNextMonth.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });
    }

    // Botón siguiente
    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', () => {
            if (!tatuadorSeleccionado) {
                showToast('Selecciona un artista', 'error');
                return;
            }
            if (!fechaSeleccionada) {
                showToast('Selecciona una fecha', 'error');
                return;
            }
            if (!horaSeleccionada) {
                showToast('Selecciona un horario', 'error');
                return;
            }

            const citaHora = {
                idTatuador: tatuadorSeleccionado.idtatuador,
                nombreTatuador: tatuadorSeleccionado.nombre,
                fotoTatuador: tatuadorSeleccionado.foto_url,
                fecha: fechaSeleccionada,
                hora: horaSeleccionada
            };
            localStorage.setItem('citaHora', JSON.stringify(citaHora));
            window.location.href = 'cita_cotizacion.html';
        });
    }

    // Back button
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => window.history.back());
    }

    renderCalendar();
}

// ===== PÁGINA: CITA_COTIZACION (Resumen) =====
function initCitaCotizacion() {
    const citaDatos = JSON.parse(localStorage.getItem('citaDatos') || '{}');
    const citaHora = JSON.parse(localStorage.getItem('citaHora') || '{}');

    if (!citaDatos.descripcion || !citaHora.fecha) {
        window.location.href = 'cita_datos.html';
        return;
    }

    // Llenar datos del resumen
    const elDescripcion = document.getElementById('resumen-descripcion');
    const elDetalles = document.getElementById('resumen-detalles');
    const elArtista = document.getElementById('resumen-artista');
    const elFecha = document.getElementById('resumen-fecha');
    const elHora = document.getElementById('resumen-hora');
    const elImagen = document.getElementById('resumen-imagen');

    if (elDescripcion) elDescripcion.textContent = citaDatos.descripcion;
    if (elDetalles) {
        const parts = [];
        if (citaDatos.estilo) parts.push(`Estilo ${citaDatos.estilo}`);
        if (citaDatos.tamanio) parts.push(`${citaDatos.tamanio} cm`);
        if (citaDatos.zonaCuerpo) parts.push(citaDatos.zonaCuerpo);
        elDetalles.textContent = parts.join(', ') || 'Sin detalles adicionales';
    }
    if (elArtista) elArtista.textContent = citaHora.nombreTatuador || 'No seleccionado';
    if (elFecha) elFecha.textContent = formatFecha(citaHora.fecha);
    if (elHora) elHora.textContent = citaHora.hora;
    if (elImagen && citaDatos.fotoReferencia) {
        elImagen.style.backgroundImage = `url("${citaDatos.fotoReferencia}")`;
    }

    // Botón solicitar cotización
    const btnSolicitar = document.getElementById('btn-solicitar');
    if (btnSolicitar) {
        btnSolicitar.addEventListener('click', async () => {
            btnSolicitar.disabled = true;
            btnSolicitar.innerHTML = '<span class="truncate">Enviando solicitud...</span>';

            try {
                const body = {
                    idCliente: user.idcliente,
                    idTatuador: citaHora.idTatuador,
                    fecha: citaHora.fecha,
                    hora: citaHora.hora,
                    zonaCuerpo: citaDatos.zonaCuerpo,
                    tamanio: citaDatos.tamanio,
                    idTecnica: citaDatos.idTecnica,
                    descripcion: citaDatos.descripcion,
                    idEmpresa: empresa?.idEmpresa,
                    fotoBase64: citaDatos.fotoReferencia || null
                };

                const res = await fetch(`${API_BASE}/citas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const json = await res.json();

                if (json.status === 'success') {
                    // Guardar datos para la página de confirmación
                    localStorage.setItem('citaEnviada', JSON.stringify({
                        ...json.data,
                        nombreTatuador: citaHora.nombreTatuador,
                        fecha: citaHora.fecha,
                        hora: citaHora.hora,
                        estilo: citaDatos.estilo
                    }));

                    // Limpiar datos temporales
                    localStorage.removeItem('citaDatos');
                    localStorage.removeItem('citaHora');

                    window.location.href = 'cita_cot_enviada.html';
                } else {
                    showToast(json.message || 'Error al enviar solicitud', 'error');
                    btnSolicitar.disabled = false;
                    btnSolicitar.innerHTML = '<span class="truncate">Solicitar Cotización</span>';
                }
            } catch (err) {
                console.error('Error al crear cita:', err);
                showToast('Error de conexión', 'error');
                btnSolicitar.disabled = false;
                btnSolicitar.innerHTML = '<span class="truncate">Solicitar Cotización</span>';
            }
        });
    }

    // Botón cancelar
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            localStorage.removeItem('citaDatos');
            localStorage.removeItem('citaHora');
            window.location.href = '/pages/cliente/menu_cliente.html';
        });
    }

    // Back
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => window.history.back());
    }
}

// ===== PÁGINA: CITA_COT_ENVIADA =====
function initCitaEnviada() {
    const enviada = JSON.parse(localStorage.getItem('citaEnviada') || '{}');

    const elArtista = document.getElementById('enviada-artista');
    const elEstilo = document.getElementById('enviada-estilo');
    const elFecha = document.getElementById('enviada-fecha');

    if (elArtista) elArtista.textContent = enviada.nombreTatuador || 'Tatuador';
    if (elEstilo) elEstilo.textContent = enviada.estilo || 'Estilo no especificado';
    if (elFecha) elFecha.textContent = enviada.fecha ? formatFecha(enviada.fecha) : '';

    const btnInicio = document.getElementById('btn-inicio');
    if (btnInicio) {
        btnInicio.addEventListener('click', () => {
            localStorage.removeItem('citaEnviada');
            window.location.href = '/pages/cliente/menu_cliente.html';
        });
    }
}

// ===== AUTO-INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('cita_datos')) initCitaDatos();
    else if (path.includes('cita_hora')) initCitaHora();
    else if (path.includes('cita_cotizacion')) initCitaCotizacion();
    else if (path.includes('cita_cot_enviada')) initCitaEnviada();
});