import { API_BASE_URL, logger } from './config.js';

// ===== CONSTANTS =====
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ===== DOM ELEMENTS =====
const scheduleDays = document.getElementById('schedule-days');
const scheduleLoading = document.getElementById('schedule-loading');
const btnGuardar = document.getElementById('btn-guardar');

const blockedList = document.getElementById('blocked-list');
const bloqueosLoading = document.getElementById('bloqueos-loading');
const bloqueosEmpty = document.getElementById('bloqueos-empty');
const btnAgregarBloqueo = document.getElementById('btn-agregar-bloqueo');

const tabHorario = document.getElementById('tab-horario');
const tabBloqueos = document.getElementById('tab-bloqueos');
const panelHorario = document.getElementById('panel-horario');
const panelBloqueos = document.getElementById('panel-bloqueos');

const toast = document.getElementById('toast');

let idTatuador = null;

// ===== UTILITIES =====
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
  // Show
  requestAnimationFrame(() => {
    toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
  });
  // Hide after 3s
  setTimeout(() => {
    toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3000);
}

function generateTimeOptions(selectEl, selectedValue = '') {
  selectEl.innerHTML = '<option value="">--:--</option>';
  for (let h = 6; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00`;
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time;
    if (time === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

// ===== GET TATUADOR ID =====
async function getIdTatuador() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.idempleado) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_BASE_URL}/empleados/${user.idempleado}`);
  const json = await res.json();
  if (json.status === 'ok' && json.data.idtatuador) {
    idTatuador = json.data.idtatuador;
    return idTatuador;
  }
  throw new Error('No se encontró el ID de tatuador');
}

// ===== TAB 1: HORARIO DE TRABAJO =====
async function cargarHorario() {
  scheduleLoading.classList.remove('hidden');
  scheduleDays.classList.add('hidden');
  btnGuardar.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE_URL}/horarios/semanal/${idTatuador}`);
    const json = await res.json();

    scheduleLoading.classList.add('hidden');

    if (json.status === 'ok') {
      renderSchedule(json.data);
      scheduleDays.classList.remove('hidden');
      btnGuardar.classList.remove('hidden');
    }
  } catch (err) {
    scheduleLoading.classList.add('hidden');
    showToast('Error al cargar horario', 'error');
    logger.error('Error cargando horario:', err);
  }
}

function renderSchedule(scheduleData) {
  scheduleDays.innerHTML = '';

  DAYS.forEach((day, i) => {
    const existing = scheduleData.find(s => s.dia === i);
    const isOccupied = !existing;

    const card = document.createElement('div');
    card.className = 'rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4';
    card.dataset.day = i;

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-white">${day}</h3>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <span class="occupied-label text-[11px] font-bold uppercase tracking-widest ${isOccupied ? 'text-secondary-accent' : 'text-zinc-500'}"
            >Ocupado</span>
          <input type="checkbox" ${isOccupied ? 'checked' : ''}
            class="day-occupied h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-secondary-accent focus:ring-secondary-accent cursor-pointer" />
        </label>
      </div>
      <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div>
          <label class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Inicio</label>
          <div class="relative">
            <select class="day-start w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-8 text-white text-sm focus:border-secondary-accent focus:ring-secondary-accent ${isOccupied ? 'opacity-40' : ''}"
              ${isOccupied ? 'disabled' : ''}>
            </select>
            <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none">expand_more</span>
          </div>
        </div>
        <span class="text-zinc-500 text-lg pb-2">—</span>
        <div>
          <label class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Fin</label>
          <div class="relative">
            <select class="day-end w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-8 text-white text-sm focus:border-secondary-accent focus:ring-secondary-accent ${isOccupied ? 'opacity-40' : ''}"
              ${isOccupied ? 'disabled' : ''}>
            </select>
            <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>
    `;

    // Populate time selects
    const startSelect = card.querySelector('.day-start');
    const endSelect = card.querySelector('.day-end');
    generateTimeOptions(startSelect, existing?.horaInicio || '');
    generateTimeOptions(endSelect, existing?.horaFin || '');

    // Handle occupied checkbox
    const checkbox = card.querySelector('.day-occupied');
    const occupiedLabel = card.querySelector('.occupied-label');

    checkbox.addEventListener('change', () => {
      const checked = checkbox.checked;
      startSelect.disabled = checked;
      endSelect.disabled = checked;
      startSelect.classList.toggle('opacity-40', checked);
      endSelect.classList.toggle('opacity-40', checked);
      occupiedLabel.classList.toggle('text-secondary-accent', checked);
      occupiedLabel.classList.toggle('text-zinc-500', !checked);
      if (checked) {
        startSelect.value = '';
        endSelect.value = '';
      } else {
        startSelect.value = '09:00';
        endSelect.value = '18:00';
      }
    });

    scheduleDays.appendChild(card);
  });
}

// ===== SAVE SCHEDULE =====
btnGuardar.addEventListener('click', async () => {
  const cards = scheduleDays.querySelectorAll('[data-day]');
  const horarioSemanal = [];

  cards.forEach(card => {
    const occupied = card.querySelector('.day-occupied').checked;
    if (!occupied) {
      const start = card.querySelector('.day-start').value;
      const end = card.querySelector('.day-end').value;
      if (start && end) {
        horarioSemanal.push({
          dia: parseInt(card.dataset.day),
          horaInicio: start,
          horaFin: end
        });
      }
    }
  });

  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/horarios/${idTatuador}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarioSemanal })
    });
    const json = await res.json();

    if (json.status === 'success') {
      showToast('Horario guardado correctamente');
    } else {
      showToast(json.message || 'Error al guardar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
    logger.error('Error guardando horario:', err);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = '<span class="material-symbols-outlined text-xl">save</span> Guardar Cambios';
  }
});

// ===== TAB 2: HORAS OCUPADAS O LIBRES =====
async function cargarBloqueos() {
  bloqueosLoading.classList.remove('hidden');
  blockedList.classList.add('hidden');
  bloqueosEmpty.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE_URL}/horarios/bloqueos/${idTatuador}`);
    const json = await res.json();

    bloqueosLoading.classList.add('hidden');

    if (json.status === 'ok') {
      if (json.data.length === 0) {
        bloqueosEmpty.classList.remove('hidden');
      } else {
        renderBloqueos(json.data);
        blockedList.classList.remove('hidden');
      }
    }
  } catch (err) {
    bloqueosLoading.classList.add('hidden');
    bloqueosEmpty.classList.remove('hidden');
    logger.error('Error cargando bloqueos:', err);
  }
}

function formatBlockTitle(bloqueo) {
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  if (bloqueo.tipo_bloqueo === 'diario') {
    return 'Todos los días';
  }
  if (bloqueo.tipo_bloqueo === 'semanal' && bloqueo.dia_semana != null) {
    return `Cada ${DAYS[bloqueo.dia_semana]}`;
  }
  if (bloqueo.fecha) {
    const fechaStr = typeof bloqueo.fecha === 'string' ? bloqueo.fecha.split('T')[0] : new Date(bloqueo.fecha).toISOString().split('T')[0];
    const [y, m, day] = fechaStr.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(day)} - ${months[parseInt(m) - 1]} - ${y}`;
  }
  return 'Bloqueo';
}

function renderBloqueos(bloqueos) {
  blockedList.innerHTML = '';

  bloqueos.forEach(bloqueo => {
    const card = document.createElement('div');
    card.className = 'rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4';

    const title = formatBlockTitle(bloqueo);
    const inicio = bloqueo.horainicio?.substring(0, 5) || '';
    const fin = bloqueo.horafin?.substring(0, 5) || '';
    const motivoHtml = bloqueo.motivo ? `<p class="text-xs text-zinc-400 mt-2 italic">${bloqueo.motivo}</p>` : '';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-bold text-white">${title}</h3>
        <button class="btn-delete-bloqueo text-secondary-accent hover:text-secondary-accent/70 transition-colors" data-id="${bloqueo.idhora}">
          <span class="material-symbols-outlined text-xl">delete</span>
        </button>
      </div>
      <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div>
          <label class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Inicio</label>
          <div class="relative">
            <select disabled class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-8 text-white text-sm opacity-70">
              <option selected>${inicio}</option>
            </select>
            <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none">expand_more</span>
          </div>
        </div>
        <span class="text-zinc-500 text-lg pb-2">—</span>
        <div>
          <label class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Fin</label>
          <div class="relative">
            <select disabled class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-8 text-white text-sm opacity-70">
              <option selected>${fin}</option>
            </select>
            <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>
      ${motivoHtml}
    `;

    blockedList.appendChild(card);
  });

  // Bind delete buttons
  blockedList.querySelectorAll('.btn-delete-bloqueo').forEach(btn => {
    btn.addEventListener('click', () => eliminarBloqueo(btn.dataset.id));
  });
}

async function eliminarBloqueo(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/horarios/bloqueos/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();

    if (json.status === 'success') {
      showToast('Bloqueo eliminado');
      cargarBloqueos();
    } else {
      showToast(json.message || 'Error al eliminar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
    logger.error('Error eliminando bloqueo:', err);
  }
}

// ===== TAB SWITCHING =====
tabHorario.addEventListener('click', () => {
  tabHorario.classList.add('border-secondary-accent', 'text-white');
  tabHorario.classList.remove('border-transparent', 'text-zinc-400');
  tabBloqueos.classList.add('border-transparent', 'text-zinc-400');
  tabBloqueos.classList.remove('border-secondary-accent', 'text-secondary-accent');
  panelHorario.classList.remove('hidden');
  panelBloqueos.classList.add('hidden');
});

tabBloqueos.addEventListener('click', () => {
  tabBloqueos.classList.add('border-secondary-accent', 'text-secondary-accent');
  tabBloqueos.classList.remove('border-transparent', 'text-zinc-400');
  tabHorario.classList.add('border-transparent', 'text-zinc-400');
  tabHorario.classList.remove('border-secondary-accent', 'text-white');
  panelBloqueos.classList.remove('hidden');
  panelHorario.classList.add('hidden');
  cargarBloqueos();
});

// ===== INIT =====
async function init() {
  // Verifica sesión activa antes de todo
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.idempleado) {
    showToast('No hay sesión activa. Redirigiendo...', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
    return;
  }
  try {
    await getIdTatuador();
    await cargarHorario();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    logger.error('Error inicializando:', err);
  }
}

init();
