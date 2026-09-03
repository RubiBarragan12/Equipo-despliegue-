import { API_BASE_URL, logger } from './config.js';

// ===== ELEMENTOS DEL DOM =====
const form = document.getElementById('form-empleado');
const workerType = document.getElementById('worker-type');
const tatuadorFields = document.getElementById('tatuador-fields');
const scheduleContainer = document.getElementById('schedule-container');
const btnGuardar = document.getElementById('btn-guardar');

// Modal
const modalOverlay = document.getElementById('modal-overlay');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalBtn = document.getElementById('modal-btn');

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ===== CARGAR ROLES =====
async function cargarRoles() {
  try {
    const res = await fetch(`${API_BASE_URL}/roles`);
    const json = await res.json();

    if (json.status !== 'ok') throw new Error(json.message);

    workerType.innerHTML = '<option value="">Selecciona un rol</option>';
    json.data.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.idrol;
      opt.textContent = r.rol;
      opt.dataset.rol = r.rol.toLowerCase();
      workerType.appendChild(opt);
    });
  } catch (err) {
    logger.error('Error cargando roles:', err);
    workerType.innerHTML = '<option value="">Error al cargar roles</option>';
  }
}

// ===== MOSTRAR/OCULTAR CAMPOS DE TATUADOR =====
workerType.addEventListener('change', () => {
  const selected = workerType.options[workerType.selectedIndex];
  const rol = selected?.dataset?.rol || '';

  if (rol === 'tatuador') {
    tatuadorFields.classList.remove('hidden');
    generarHorario();
  } else {
    tatuadorFields.classList.add('hidden');
  }
});

// ===== GENERAR HORARIO DINÁMICO =====
function generarHorario() {
  if (scheduleContainer.children.length > 0) return; // ya generado

  DAYS.forEach((day, i) => {
    const isFree = i >= 5; // Sábado y Domingo libre por defecto
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    row.innerHTML = `
      <div class="w-20 shrink-0 text-sm text-text-main">${day}</div>
      <div class="grid flex-grow grid-cols-2 gap-2">
        <input type="time" value="${isFree ? '' : '09:00'}" ${isFree ? 'disabled' : ''}
          class="schedule-start ${isFree ? 'disabled:opacity-50 ' : ''}w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-3.5 text-center text-text-main focus:border-primary focus:ring-primary [color-scheme:dark]" />
        <input type="time" value="${isFree ? '' : '18:00'}" ${isFree ? 'disabled' : ''}
          class="schedule-end ${isFree ? 'disabled:opacity-50 ' : ''}w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-3.5 text-center text-text-main focus:border-primary focus:ring-primary [color-scheme:dark]" />
      </div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" ${isFree ? 'checked' : ''} class="schedule-free h-5 w-5 rounded border-border-dark bg-surface-dark text-primary focus:ring-primary focus:ring-offset-background-dark" />
        <span>Libre</span>
      </label>
    `;

    // Toggle inputs al marcar Libre
    const checkbox = row.querySelector('.schedule-free');
    const startInput = row.querySelector('.schedule-start');
    const endInput = row.querySelector('.schedule-end');

    checkbox.addEventListener('change', () => {
      startInput.disabled = checkbox.checked;
      endInput.disabled = checkbox.checked;
      startInput.classList.toggle('disabled:opacity-50', checkbox.checked);
      endInput.classList.toggle('disabled:opacity-50', checkbox.checked);
      if (checkbox.checked) {
        startInput.value = '';
        endInput.value = '';
      } else {
        startInput.value = '09:00';
        endInput.value = '18:00';
      }
    });

    scheduleContainer.appendChild(row);
  });
}

// ===== TOGGLE CONTRASEÑA =====
function setupPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.querySelector('.material-symbols-outlined').textContent = isPass ? 'visibility_off' : 'visibility';
  });
}

setupPasswordToggle('toggle-password', 'password');
setupPasswordToggle('toggle-confirm', 'confirm-password');

// ===== MODAL =====
function showModal(type, title, message) {
  modalIcon.textContent = type === 'success' ? 'check_circle' : 'error';
  modalIcon.className = `material-symbols-outlined text-5xl mb-3 ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');
}

modalBtn.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  modalOverlay.classList.remove('flex');
});

// ===== ENVIAR FORMULARIO =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('name').value.trim();
  const correo = document.getElementById('email').value.trim();
  const telefono = document.getElementById('phone').value.trim();
  const fechaNacimiento = document.getElementById('dob').value;
  const contrasenia = document.getElementById('password').value;
  const confirmar = document.getElementById('confirm-password').value;
  const idRol = workerType.value;

  // Validaciones
  if (!idRol) return showModal('error', 'Error', 'Selecciona un tipo de trabajador');
  if (!nombre) return showModal('error', 'Error', 'El nombre es requerido');
  if (!correo) return showModal('error', 'Error', 'El correo es requerido');
  if (!telefono) return showModal('error', 'Error', 'El teléfono es requerido');
  if (!contrasenia) return showModal('error', 'Error', 'La contraseña es requerida');
  if (contrasenia.length < 6) return showModal('error', 'Error', 'La contraseña debe tener al menos 6 caracteres');
  if (contrasenia !== confirmar) return showModal('error', 'Error', 'Las contraseñas no coinciden');

  const selected = workerType.options[workerType.selectedIndex];
  const rolNombre = selected?.dataset?.rol || '';

  const body = {
    nombre,
    correo,
    contrasenia,
    telefono,
    fechaNacimiento: fechaNacimiento || null,
    idRol: parseInt(idRol),
    idEmpresa: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).idempresa : null
  };

  // Datos extra para tatuador
  if (rolNombre === 'tatuador') {
    const comision = document.getElementById('commission').value;
    body.porcentajeComision = comision ? parseFloat(comision) : 0;

    // Capturar horario semanal
    const rows = scheduleContainer.querySelectorAll('.flex.items-center.gap-3');
    const horarioSemanal = [];
    rows.forEach((row, i) => {
      const isFree = row.querySelector('.schedule-free').checked;
      if (!isFree) {
        const horaInicio = row.querySelector('.schedule-start').value;
        const horaFin = row.querySelector('.schedule-end').value;
        if (horaInicio && horaFin) {
          horarioSemanal.push({ dia: i, horaInicio, horaFin });
        }
      }
    });
    body.horarioSemanal = horarioSemanal;
  }

  // Deshabilitar botón
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/empleados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();

    if (res.ok && json.status === 'success') {
      showModal('success', '¡Empleado registrado!', `${nombre} fue registrado como ${rolNombre}`);
      form.reset();
      tatuadorFields.classList.add('hidden');
      scheduleContainer.innerHTML = '';
    } else {
      showModal('error', 'Error', json.message || 'No se pudo registrar el empleado');
    }
  } catch (err) {
    logger.error('Error al guardar empleado:', err);
    showModal('error', 'Error de conexión', 'No se pudo conectar con el servidor');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Empleado';
  }
});

// ===== INICIALIZAR =====
cargarRoles();
