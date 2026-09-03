// Convierte la VAPID public key de base64url a Uint8Array (requerido por pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Inicializa las Web Push Notifications para el usuario logueado.
 * Llama a esta función en las páginas principales de cada rol (menu_cliente, menu_tatuador, etc.)
 * No lanza errores — falla silenciosamente si el navegador no lo soporta o el usuario rechaza.
 */
export async function initPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // El login guarda el objeto con clave 'user'
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return;

  // Determinar tipo e ID según el rol guardado
  const esCliente = user.rol === 'cliente';
  const idTipoUsuario = esCliente ? 1 : 2;
  const idUsuario = esCliente ? user.idcliente : user.idempleado;
  if (!idUsuario) return;

  const idEmpresa = user.idempresa ?? null;

  console.log('[Push] usuario:', user.rol, '| idTipoUsuario:', idTipoUsuario, '| idUsuario:', idUsuario);

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker listo');

    const permission = await Notification.requestPermission();
    console.log('[Push] Permiso:', permission);
    if (permission !== 'granted') return;

    const res = await fetch('/api/push/vapid-key');
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        idTipoUsuario,
        idUsuario,
        idEmpresa
      })
    });

    console.log('[Push] ✅ Suscripción registrada en backend — endpoint:', sub.endpoint.substring(0, 60) + '...');
  } catch (err) {
    console.warn('Push init:', err.message);
  }
}

/**
 * Desactiva las notificaciones del dispositivo actual y desuscribe del backend.
 */
export async function disablePush() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager?.getSubscription();
      if (!sub) continue;

      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });

      await sub.unsubscribe();
    }
    console.log('🔕 Push notifications desactivadas');
  } catch (err) {
    console.warn('Push disable:', err.message);
  }
}
