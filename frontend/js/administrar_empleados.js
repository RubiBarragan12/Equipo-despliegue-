import { API_BASE_URL, logger } from './config.js';

// ===== DOM ELEMENTS =====
const loadingEl = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const employeeList = document.getElementById('employee-list');

// Modal Edit
const modalEdit = document.getElementById('modal-edit');
const formEdit = document.getElementById('form-edit');
const editId = document.getElementById('edit-id');
const editRol = document.getElementById('edit-rol');
const editNombre = document.getElementById('edit-nombre');
const editTelefono = document.getElementById('edit-telefono');
const editCorreo = document.getElementById('edit-correo');
const editNacimiento = document.getElementById('edit-nacimiento');
const editComisionWrapper = document.getElementById('edit-comision-wrapper');
const editComision = document.getElementById('edit-comision');
const editHorarioWrapper = document.getElementById('edit-horario-wrapper');
const editScheduleContainer = document.getElementById('edit-schedule-container');
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');

// Modal Delete
const modalDelete = document.getElementById('modal-delete');
const deleteMessage = document.getElementById('delete-message');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Modal Result
const modalResult = document.getElementById('modal-result');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const btnResultOk = document.getElementById('btn-result-ok');

let deleteTargetId = null;
let rolesCache = [];

// ===== UTILITIES =====
function showModal(modal) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function showResult(type, title, message) {
  resultIcon.textContent = type === 'success' ? 'check_circle' : 'error';
  resultIcon.className = `material-symbols-outlined text-5xl mb-3 ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
  resultTitle.textContent = title;
  resultMessage.textContent = message;
  showModal(modalResult);
}

function getInitials(nombre) {
  return nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(id) {
  const colors = ['#D93B3B', '#E6753C', '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#4F46E5'];
  return colors[id % colors.length];
}

// ===== LOAD ROLES =====
async function cargarRoles() {
  try {
    const res = await fetch(`${API_BASE_URL}/roles`);
    const json = await res.json();
    if (json.status === 'ok') {
      rolesCache = json.data;
      editRol.innerHTML = '<option value="">Selecciona un rol</option>';
      rolesCache.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.idrol;
        opt.textContent = r.rol;
        opt.dataset.rol = r.rol.toLowerCase();
        editRol.appendChild(opt);
      });
    }
  } catch (err) {
    logger.error('Error cargando roles:', err);
  }
}

// ===== SHOW/HIDE COMISION + HORARIO FIELD =====
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

editRol.addEventListener('change', () => {
  const selected = editRol.options[editRol.selectedIndex];
  const rol = selected?.dataset?.rol || '';
  if (rol === 'tatuador') {
    editComisionWrapper.classList.remove('hidden');
    editHorarioWrapper.classList.remove('hidden');
    generarHorarioEdit();
  } else {
    editComisionWrapper.classList.add('hidden');
    editHorarioWrapper.classList.add('hidden');
    editComision.value = '';
  }
});

function generarHorarioEdit(scheduleData = []) {
  editScheduleContainer.innerHTML = '';

  DAYS.forEach((day, i) => {
    const existing = scheduleData.find(s => s.dia === i);
    const isFree = !existing;
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    row.innerHTML = `
      <div class="w-20 shrink-0 text-sm text-text-main">${day}</div>
      <div class="grid flex-grow grid-cols-2 gap-2">
        <input type="time" value="${existing ? existing.horaInicio : ''}" ${isFree ? 'disabled' : ''}
          class="edit-schedule-start ${isFree ? 'disabled:opacity-50 ' : ''}w-full rounded-xl border border-border-dark bg-background-dark px-3 py-2.5 text-center text-sm text-text-main focus:border-primary focus:ring-primary [color-scheme:dark]" />
        <input type="time" value="${existing ? existing.horaFin : ''}" ${isFree ? 'disabled' : ''}
          class="edit-schedule-end ${isFree ? 'disabled:opacity-50 ' : ''}w-full rounded-xl border border-border-dark bg-background-dark px-3 py-2.5 text-center text-sm text-text-main focus:border-primary focus:ring-primary [color-scheme:dark]" />
      </div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" ${isFree ? 'checked' : ''} class="edit-schedule-free h-5 w-5 rounded border-border-dark bg-background-dark text-primary focus:ring-primary" />
        <span>Libre</span>
      </label>
    `;

    const checkbox = row.querySelector('.edit-schedule-free');
    const startInput = row.querySelector('.edit-schedule-start');
    const endInput = row.querySelector('.edit-schedule-end');

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

    editScheduleContainer.appendChild(row);
  });
}

function capturarHorarioEdit() {
  const rows = editScheduleContainer.querySelectorAll('.flex.items-center.gap-3');
  const horarioSemanal = [];
  rows.forEach((row, i) => {
    const isFree = row.querySelector('.edit-schedule-free').checked;
    if (!isFree) {
      const horaInicio = row.querySelector('.edit-schedule-start').value;
      const horaFin = row.querySelector('.edit-schedule-end').value;
      if (horaInicio && horaFin) {
        horarioSemanal.push({ dia: i, horaInicio, horaFin });
      }
    }
  });
  return horarioSemanal;
}

// ===== LOAD EMPLOYEES =====
async function cargarEmpleados() {
  loadingEl.classList.remove('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  employeeList.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE_URL}/empleados`);
    const json = await res.json();

    loadingEl.classList.add('hidden');

    if (json.status !== 'ok') throw new Error(json.message);

    const empleados = json.data;

    if (empleados.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }

    // Group by role
    const grouped = {};
    empleados.forEach(emp => {
      const rolName = emp.rol || 'Sin rol';
      if (!grouped[rolName]) grouped[rolName] = [];
      grouped[rolName].push(emp);
    });

    employeeList.innerHTML = '';

    for (const [rol, emps] of Object.entries(grouped)) {
      const section = document.createElement('div');

      const header = document.createElement('h2');
      header.className = 'text-text-secondary text-sm font-bold uppercase tracking-wider px-2 pb-2';
      header.textContent = rol + (emps.length > 1 ? 's' : '');
      section.appendChild(header);

      const list = document.createElement('div');
      list.className = 'flex flex-col gap-3';

      emps.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'flex items-center gap-4 rounded-xl bg-surface-dark p-3 border border-border-dark transition-colors hover:border-white/20';

        const color = getAvatarColor(emp.idempleado);
        const initials = getInitials(emp.nombre);

        card.innerHTML = `
          <div class="flex items-center justify-center rounded-full size-12 shrink-0 text-white font-bold text-sm" style="background-color: ${color}">
            ${initials}
          </div>
          <div class="flex-grow min-w-0">
            <p class="text-text-main font-bold truncate">${escapeHtml(emp.nombre)}</p>
            <p class="text-text-secondary text-sm truncate">${escapeHtml(emp.correo)}</p>
            ${emp.porcentajecomision != null ? `<p class="text-text-secondary text-xs">Comisión: ${emp.porcentajecomision}%</p>` : ''}
          </div>
          <button class="btn-edit flex items-center justify-center size-9 text-text-secondary transition-colors hover:text-white rounded-lg hover:bg-white/10" data-id="${emp.idempleado}">
            <span class="material-symbols-outlined text-xl">edit</span>
          </button>
          <button class="btn-delete flex items-center justify-center size-9 text-red-500/70 transition-colors hover:text-red-400 rounded-lg hover:bg-red-500/10" data-id="${emp.idempleado}" data-nombre="${escapeHtml(emp.nombre)}">
            <span class="material-symbols-outlined text-xl">delete</span>
          </button>
        `;

        list.appendChild(card);
      });

      section.appendChild(list);
      employeeList.appendChild(section);
    }

    employeeList.classList.remove('hidden');
    employeeList.classList.add('flex');

    // Bind edit/delete buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => abrirEditar(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => abrirEliminar(parseInt(btn.dataset.id), btn.dataset.nombre));
    });

  } catch (err) {
    loadingEl.classList.add('hidden');
    errorMessage.textContent = err.message || 'No se pudo conectar con el servidor';
    errorState.classList.remove('hidden');
    errorState.classList.add('flex');
    logger.error('Error cargando empleados:', err);
  }
}

// ===== ESCAPE HTML =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== EDIT EMPLOYEE =====
async function abrirEditar(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/empleados/${id}`);
    const json = await res.json();

    if (json.status !== 'ok') throw new Error(json.message);

    const emp = json.data;
    editId.value = emp.idempleado;
    editNombre.value = emp.nombre || '';
    editTelefono.value = emp.telefono || '';
    editCorreo.value = emp.correo || '';
    editNacimiento.value = emp.fecha_nacimiento ? emp.fecha_nacimiento.split('T')[0] : '';
    editRol.value = emp.idrol || '';

    // Trigger comision + horario visibility
    const selected = editRol.options[editRol.selectedIndex];
    const rolNombre = selected?.dataset?.rol || '';
    if (rolNombre === 'tatuador') {
      editComisionWrapper.classList.remove('hidden');
      editComision.value = emp.porcentajecomision ?? '';

      // Cargar horario semanal del tatuador
      editHorarioWrapper.classList.remove('hidden');
      let scheduleData = [];
      if (emp.idtatuador) {
        try {
          const sRes = await fetch(`${API_BASE_URL}/horarios/semanal/${emp.idtatuador}`);
          const sJson = await sRes.json();
          if (sJson.status === 'ok') scheduleData = sJson.data;
        } catch (e) { /* ignore, show empty schedule */ }
      }
      generarHorarioEdit(scheduleData);
    } else {
      editComisionWrapper.classList.add('hidden');
      editHorarioWrapper.classList.add('hidden');
      editComision.value = '';
    }

    showModal(modalEdit);
  } catch (err) {
    showResult('error', 'Error', err.message || 'No se pudo cargar los datos del empleado');
    logger.error('Error abriendo editar:', err);
  }
}

formEdit.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editId.value;
  const body = {
    nombre: editNombre.value.trim(),
    correo: editCorreo.value.trim(),
    telefono: editTelefono.value.trim(),
    fechaNacimiento: editNacimiento.value || null,
    idRol: parseInt(editRol.value)
  };

  if (!body.nombre || !body.correo || !body.idRol) {
    showResult('error', 'Error', 'Nombre, correo y rol son requeridos');
    return;
  }

  const selected = editRol.options[editRol.selectedIndex];
  const rolNombre = selected?.dataset?.rol || '';
  if (rolNombre === 'tatuador') {
    body.porcentajeComision = parseFloat(editComision.value) || 0;
    body.horarioSemanal = capturarHorarioEdit();
  }

  btnSaveEdit.disabled = true;
  btnSaveEdit.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/empleados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();

    if (res.ok && json.status === 'success') {
      hideModal(modalEdit);
      showResult('success', '¡Actualizado!', `${body.nombre} fue actualizado correctamente`);
      cargarEmpleados();
    } else {
      showResult('error', 'Error', json.message || 'No se pudo actualizar');
    }
  } catch (err) {
    showResult('error', 'Error de conexión', 'No se pudo conectar con el servidor');
    logger.error('Error actualizando empleado:', err);
  } finally {
    btnSaveEdit.disabled = false;
    btnSaveEdit.textContent = 'Guardar Cambios';
  }
});

btnCloseEdit.addEventListener('click', () => hideModal(modalEdit));

// ===== DELETE EMPLOYEE =====
function abrirEliminar(id, nombre) {
  deleteTargetId = id;
  deleteMessage.textContent = `¿Estás seguro de eliminar a "${nombre}"? Esta acción no se puede deshacer.`;
  showModal(modalDelete);
}

btnCancelDelete.addEventListener('click', () => {
  deleteTargetId = null;
  hideModal(modalDelete);
});

btnConfirmDelete.addEventListener('click', async () => {
  if (!deleteTargetId) return;

  btnConfirmDelete.disabled = true;
  btnConfirmDelete.textContent = 'Eliminando...';

  try {
    const res = await fetch(`${API_BASE_URL}/empleados/${deleteTargetId}`, {
      method: 'DELETE'
    });
    const json = await res.json();

    hideModal(modalDelete);

    if (res.ok && json.status === 'success') {
      showResult('success', 'Eliminado', 'El empleado fue eliminado correctamente');
      cargarEmpleados();
    } else {
      showResult('error', 'Error', json.message || 'No se pudo eliminar');
    }
  } catch (err) {
    hideModal(modalDelete);
    showResult('error', 'Error de conexión', 'No se pudo conectar con el servidor');
    logger.error('Error eliminando empleado:', err);
  } finally {
    deleteTargetId = null;
    btnConfirmDelete.disabled = false;
    btnConfirmDelete.textContent = 'Eliminar';
  }
});

// ===== RESULT MODAL =====
btnResultOk.addEventListener('click', () => hideModal(modalResult));

// Make cargarEmpleados global for the retry button
window.cargarEmpleados = cargarEmpleados;

// ===== INIT =====
cargarRoles();
cargarEmpleados();
