import { API_BASE_URL, logger } from './config.js';

// ===== DOM =====
const studiosGrid = document.getElementById('studios-grid');
const resultCount = document.getElementById('result-count');
const searchInput = document.getElementById('search-input');
const greeting = document.getElementById('greeting');
const btnLogout = document.getElementById('btn-logout');
const toast = document.getElementById('toast');

let allEmpresas = [];

// ===== SESSION CHECK =====
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!user || user.rol !== 'cliente') {
  window.location.href = '/';
}

// Greeting con nombre
if (greeting && user) {
  greeting.textContent = `¡Hola, ${user.nombre}!`;
}

// ===== TOAST =====
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

// ===== LOAD EMPRESAS =====
async function cargarEmpresas() {
  studiosGrid.innerHTML = `
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      <p class="text-gray-400 mt-4">Cargando estudios...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE_URL}/empresas`);
    const json = await res.json();

    if (json.status === 'success' && json.data?.length > 0) {
      allEmpresas = json.data;
      renderEmpresas(allEmpresas);
    } else {
      studiosGrid.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-gray-600">storefront</span>
          <p class="text-gray-400 mt-4">No hay estudios disponibles</p>
        </div>
      `;
      resultCount.textContent = '0 estudios';
    }
  } catch (err) {
    logger.error('Error cargando empresas:', err);
    studiosGrid.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-6xl text-red-400">error</span>
        <p class="text-red-400 mt-4">Error al cargar estudios</p>
      </div>
    `;
  }
}

// ===== RENDER =====
function renderEmpresas(empresas) {
  resultCount.textContent = `${empresas.length} estudio${empresas.length !== 1 ? 's' : ''} disponible${empresas.length !== 1 ? 's' : ''}`;

  if (empresas.length === 0) {
    studiosGrid.innerHTML = `
      <div class="text-center py-8">
        <span class="material-symbols-outlined text-5xl text-gray-600">search_off</span>
        <p class="text-gray-400 mt-3">No se encontraron resultados</p>
      </div>
    `;
    return;
  }

  studiosGrid.innerHTML = empresas.map(emp => {
    const ubicacion = [emp.direccion, emp.ciudad, emp.estado, emp.pais]
      .filter(Boolean)
      .join(', ');

    return `
      <div class="rounded-xl border border-gray-700/50 bg-gray-900/40 p-5 hover:border-primary/50 transition-all cursor-pointer empresa-card" data-id="${emp.idempresa}">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <span class="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-white">${emp.nombre || 'Sin nombre'}</h3>
            ${ubicacion ? `
              <div class="flex items-start gap-1.5 mt-2">
                <span class="material-symbols-outlined text-gray-500 text-base mt-0.5 shrink-0">location_on</span>
                <p class="text-sm text-gray-400">${ubicacion}</p>
              </div>
            ` : ''}
            ${emp.telefono ? `
              <div class="flex items-center gap-1.5 mt-1">
                <span class="material-symbols-outlined text-gray-500 text-base shrink-0">phone</span>
                <p class="text-sm text-gray-400">${emp.telefono}</p>
              </div>
            ` : ''}
          </div>
          <span class="material-symbols-outlined text-gray-600 text-xl mt-1">chevron_right</span>
        </div>
      </div>
    `;
  }).join('');

  // Bind click
  studiosGrid.querySelectorAll('.empresa-card').forEach(card => {
    card.addEventListener('click', () => seleccionarEmpresa(parseInt(card.dataset.id)));
  });
}

// ===== SELECT EMPRESA =====
function seleccionarEmpresa(idEmpresa) {
  const empresa = allEmpresas.find(e => e.idempresa === idEmpresa);
  if (!empresa) return;

  // Save empresa to localStorage
  const empresaData = {
    idEmpresa: empresa.idempresa,
    nombre: empresa.nombre,
    direccion: empresa.direccion,
    ciudad: empresa.ciudad,
    estado: empresa.estado,
    pais: empresa.pais,
    telefono: empresa.telefono
  };
  localStorage.setItem('empresa', JSON.stringify(empresaData));

  showToast(`Estudio "${empresa.nombre}" seleccionado`);
  setTimeout(() => {
    window.location.href = '/pages/cliente/menu_cliente.html';
  }, 800);
}

// ===== SEARCH =====
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    renderEmpresas(allEmpresas);
    return;
  }
  const filtered = allEmpresas.filter(emp =>
    (emp.nombre || '').toLowerCase().includes(query) ||
    (emp.direccion || '').toLowerCase().includes(query) ||
    (emp.ciudad || '').toLowerCase().includes(query) ||
    (emp.estado || '').toLowerCase().includes(query)
  );
  renderEmpresas(filtered);
});

// ===== LOGOUT =====
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('user');
  localStorage.removeItem('empresa');
  window.location.href = '/';
});

// ===== INIT =====
cargarEmpresas();