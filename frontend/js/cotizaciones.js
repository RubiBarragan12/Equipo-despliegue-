// =========================================================
// PRUEBA A/B: FORMULARIO DE COTIZACIÓN TATTORA
// =========================================================

// 1. GESTIÓN DEL FEATURE FLAG (50/50 consistente)
let abVariant = localStorage.getItem('ab_test_cotizacion');

if (!abVariant) {
  abVariant = Math.random() < 0.5 ? 'A' : 'B';
  localStorage.setItem('ab_test_cotizacion', abVariant);
}

// 2. SISTEMA DE MONITOREO Y REGISTRO DE EVENTOS
function registrarEvento(nombreEvento, propiedades = {}) {
  const datos = {
    evento: nombreEvento,
    variante: abVariant,
    timestamp: new Date().toISOString(),
    ...propiedades
  };

  console.log(`[MONITOREO A/B] Evento registrado:`, datos);

  // Registro en herramientas de analítica externa (si están configuradas)
  if (window.posthog) {
    window.posthog.capture(nombreEvento, datos);
  }
}

// Registrar vista del formulario al cargar
registrarEvento('vista_formulario_cotizacion');

// 3. RENDERIZADO VISUAL SEGÚN LA VARIANTE
document.addEventListener('DOMContentLoaded', () => {
  const formCotizacion = document.querySelector('form') || document.getElementById('formCotizacion');

  if (abVariant === 'B') {
    aplicarVarianteB(formCotizacion);
  }

  if (formCotizacion) {
    formCotizacion.addEventListener('submit', manejarEnvioFormulario);
  }
});

function aplicarVarianteB(form) {
  const titulo = document.querySelector('h1') || document.querySelector('h2');
  if (titulo) {
    titulo.textContent = 'Solicita tu Cotización (Paso a Paso)';
  }

  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  if (btnSubmit) {
    btnSubmit.textContent = 'Solicitar Cotización Ahora →';
    btnSubmit.style.backgroundColor = '#10B981';
    btnSubmit.style.fontSize = '1.1rem';
    btnSubmit.style.padding = '12px 24px';
    btnSubmit.style.fontWeight = 'bold';
  }

  if (form) {
    const bannerInfo = document.createElement('div');
    bannerInfo.className = 'ab-banner-b';
    bannerInfo.style.cssText = 'background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; padding:10px; margin-bottom:15px; border-radius:6px; font-size:0.9rem;';
    bannerInfo.innerHTML = '✨ <strong>Versión Mejorada:</strong> Completa los datos requeridos para recibir respuesta en menos de 24 horas.';
    form.insertBefore(bannerInfo, form.firstChild);
  }
}

// 4. INTERCEPTAR ENVÍO (SIMULACIÓN SIN BASE DE DATOS)
function manejarEnvioFormulario(e) {
  e.preventDefault();

  registrarEvento('solicitud_cotizacion_enviada', {
    exito: true
  });

  alert(`¡Solicitud enviada con éxito! (Registrado en prueba A/B - Variante ${abVariant})`);
}

// 5. HERRAMIENTA DEV PARA CAMBIAR DE VARIANTE EN EL VIDEO
window.toggleABVariant = function() {
  const nuevaVariante = abVariant === 'A' ? 'B' : 'A';
  localStorage.setItem('ab_test_cotizacion', nuevaVariante);
  location.reload();
};