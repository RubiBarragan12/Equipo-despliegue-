function tiempoRelativo(fechaStr) {
  const diff = Math.floor((Date.now() - new Date(fechaStr)) / 1000);
  if (diff < 60)   return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

async function cargarHistorial(idTipoUsuario, idUsuario) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  try {
    const res = await fetch(`/api/push/historial?idTipoUsuario=${idTipoUsuario}&idUsuario=${idUsuario}`);
    const { data } = await res.json();

    if (!data?.length) {
      list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <span class="material-symbols-outlined text-4xl">notifications_off</span>
          <p class="text-sm">Sin notificaciones</p>
        </div>`;
      return;
    }

    list.innerHTML = data.map(n => {
      const color = n.enviada ? 'text-primary' : 'text-gray-400';
      const bg    = n.url_destino ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : '';
      const fecha = n.fecha_envio ? tiempoRelativo(n.fecha_envio) : '';
      return `
        <div class="flex items-start gap-3 px-4 py-3 ${bg}"
             ${n.url_destino ? `onclick="window.location.href='${n.url_destino}'"` : ''}>
          <span class="material-symbols-outlined ${color} text-xl mt-0.5 shrink-0">notifications</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white leading-tight">${n.titulo}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">${n.cuerpo || ''}</p>
            <p class="text-xs text-gray-400 mt-1">${fecha}</p>
          </div>
        </div>`;
    }).join('');

    localStorage.setItem('lastNotifSeen', new Date().toISOString());
    document.getElementById('notif-badge')?.classList.add('hidden');
  } catch {
    list.innerHTML = `<div class="flex items-center justify-center py-8 text-gray-400"><p class="text-sm">Error al cargar</p></div>`;
  }
}

async function verificarBadge(idTipoUsuario, idUsuario) {
  try {
    const res = await fetch(`/api/push/historial?idTipoUsuario=${idTipoUsuario}&idUsuario=${idUsuario}`);
    const { data } = await res.json();
    if (!data?.length) return;

    const lastSeen  = localStorage.getItem('lastNotifSeen');
    const nuevas    = lastSeen
      ? data.filter(n => new Date(n.fecha_creacion) > new Date(lastSeen))
      : data;

    if (nuevas.length) {
      document.getElementById('notif-badge')?.classList.remove('hidden');
    }
  } catch { /* silencioso */ }
}

export async function initNotificacionesPanel() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return;

  const esCliente    = user.rol === 'cliente';
  const idTipoUsuario = esCliente ? 1 : 2;
  const idUsuario     = esCliente ? user.idcliente : user.idempleado;
  if (!idUsuario) return;

  // Badge de nuevas notificaciones
  btn.style.position = 'relative';
  const badge = document.createElement('span');
  badge.id = 'notif-badge';
  badge.style.cssText = 'position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#ef4444;display:none;';
  btn.appendChild(badge);

  // Panel flotante
  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = 'display:none;position:fixed;right:16px;z-index:9999;width:320px;max-height:420px;overflow-y:auto;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
  panel.className = 'bg-white dark:bg-[#1e1530] border border-gray-200 dark:border-gray-700';
  panel.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-[#1e1530]">
      <h3 class="font-bold text-sm text-gray-900 dark:text-white">Notificaciones</h3>
      <button id="notif-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
    <div id="notif-list">
      <div class="flex items-center justify-center py-8 text-gray-400">
        <div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent mr-2"></div>
        <p class="text-sm">Cargando...</p>
      </div>
    </div>`;
  document.body.appendChild(panel);

  // Posicionar panel debajo del botón
  function posicionarPanel() {
    const rect = btn.getBoundingClientRect();
    panel.style.top  = (rect.bottom + 8) + 'px';
    panel.style.right = (window.innerWidth - rect.right) + 'px';
  }

  // Abrir / cerrar
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const visible = panel.style.display !== 'none';
    if (visible) {
      panel.style.display = 'none';
    } else {
      posicionarPanel();
      panel.style.display = 'block';
      cargarHistorial(idTipoUsuario, idUsuario);
    }
  });

  document.getElementById('notif-close')?.addEventListener('click', e => {
    e.stopPropagation();
    panel.style.display = 'none';
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.style.display = 'none';
    }
  });

  // Badge inicial
  await verificarBadge(idTipoUsuario, idUsuario);
}
