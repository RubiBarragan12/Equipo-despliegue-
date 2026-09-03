import { API_BASE_URL, logger } from './config.js';

// ===== DOM ELEMENTS =====
const form = document.getElementById('form-bloqueo');
const inputFecha = document.getElementById('bloqueo-fecha');
const selectRepetir = document.getElementById('bloqueo-repetir');
const selectInicio = document.getElementById('bloqueo-inicio');
const selectFin = document.getElementById('bloqueo-fin');
const textMotivo = document.getElementById('bloqueo-motivo');
const btnBloquear = document.getElementById('btn-bloquear');
const toast = document.getElementById('toast');

let idTatuador = null;

// ===== UTILITIES =====
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
  requestAnimationFrame(() => {
    toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
  });
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

// ===== TOGGLE FECHA FIELD =====
selectRepetir.addEventListener('change', () => {
  const isUnica = selectRepetir.value === 'unica';
  inputFecha.required = isUnica;
  inputFecha.closest('.rounded-xl').style.opacity = isUnica ? '1' : '0.5';
  inputFecha.disabled = !isUnica;
});

// ===== SUBMIT =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const repetir = selectRepetir.value;
  const fecha = inputFecha.value;
  const horaInicio = selectInicio.value;
  const horaFin = selectFin.value;
  const motivo = textMotivo.value.trim();

  // Validations
  if (repetir === 'unica' && !fecha) {
    return showToast('Selecciona una fecha', 'error');
  }
  if (!horaInicio || !horaFin) {
    return showToast('Selecciona hora inicio y fin', 'error');
  }
  if (horaInicio >= horaFin) {
    return showToast('La hora de inicio debe ser antes que la hora fin', 'error');
  }

  // Map repetir value to tipo and dia_semana
  const dayMap = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6 };
  let tipo;
  if (repetir === 'unica') tipo = 'unico';
  else if (repetir === 'diario') tipo = 'diario';
  else tipo = 'semanal';

  const body = {
    idTatuador,
    tipo,
    fecha: repetir === 'unica' ? fecha : null,
    diaSemana: (tipo === 'semanal') ? dayMap[repetir] : null,
    horaInicio,
    horaFin,
    motivo: motivo || null
  };

  btnBloquear.disabled = true;
  btnBloquear.textContent = 'Bloqueando...';

  try {
    const res = await fetch(`${API_BASE_URL}/horarios/bloqueos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();

    if (res.ok && json.status === 'success') {
      showToast('Horario bloqueado correctamente');
      setTimeout(() => {
        window.location.href = 'editar_disponibilidad.html';
      }, 1200);
    } else {
      showToast(json.message || 'Error al bloquear', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
    logger.error('Error bloqueando horario:', err);
  } finally {
    btnBloquear.disabled = false;
    btnBloquear.innerHTML = '<span class="material-symbols-outlined text-xl">block</span> Bloquear Horario';
  }
});

// ===== INIT =====
async function init() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  inputFecha.value = today;
  inputFecha.min = today;

  // Populate time selects
  generateTimeOptions(selectInicio, '14:00');
  generateTimeOptions(selectFin, '16:00');

  try {
    await getIdTatuador();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    logger.error('Error inicializando:', err);
  }
}

init();
