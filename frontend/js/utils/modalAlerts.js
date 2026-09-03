// js/modalAlerts.js

/**
 * Muestra una alerta estilizada en pantalla.
 * @param {string} title - Título de la alerta.
 * @param {string} message - Mensaje detallado.
 * @param {string} type - Tipo de alerta: 'success', 'error', 'warn', 'info'.
 */
export function showAlert(title, message, type = 'info') {
    // Si ya existe un modal, lo eliminamos para evitar duplicados
    const existingModal = document.getElementById('custom-alert-modal');
    if (existingModal) existingModal.remove();

    // Configuración visual según el tipo de alerta
    const config = {
        success: { 
            icon: 'check_circle', 
            color: 'text-green-500', 
            bgIcon: 'bg-green-500/20', 
            btn: 'bg-green-600 hover:bg-green-500' 
        },
        error: { 
            icon: 'error', 
            color: 'text-red-500', 
            bgIcon: 'bg-red-500/20', 
            btn: 'bg-red-600 hover:bg-red-500' 
        },
        warn: { 
            icon: 'warning', 
            color: 'text-yellow-500', 
            bgIcon: 'bg-yellow-500/20', 
            btn: 'bg-yellow-600 hover:bg-yellow-500' 
        },
        info: { 
            icon: 'info', 
            color: 'text-blue-500', 
            bgIcon: 'bg-blue-500/20', 
            btn: 'bg-blue-600 hover:bg-blue-500' 
        }
    };

    const theme = config[type] || config.info;

    // Crear el fondo oscuro (Overlay)
    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-modal';
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0';

    // Crear la caja del modal
    const modal = document.createElement('div');
    // Usamos los colores oscuros de tu paleta (bg-[#261933] y border-[#362348])
    modal.className = 'w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-[#261933] p-6 text-left align-middle shadow-xl transition-all duration-300 scale-95 border border-gray-200 dark:border-[#362348]';

    modal.innerHTML = `
        <div class="flex flex-col items-center text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full ${theme.bgIcon} mb-4">
                <span class="material-symbols-outlined text-4xl ${theme.color}">${theme.icon}</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white font-display mb-2">${title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">${message}</p>
            <button id="close-alert-btn" class="w-full rounded-xl ${theme.btn} px-4 py-3 text-sm font-bold text-white transition-colors focus:outline-none">
                Aceptar
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animar entrada (hacer visible)
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
    });

    // Lógica para cerrar y destruir el modal
    const closeBtn = modal.querySelector('#close-alert-btn');
    
    const closeModal = () => {
        overlay.classList.add('opacity-0');
        modal.classList.add('scale-95');
        // Esperar a que termine la animación de salida para quitarlo del DOM
        setTimeout(() => overlay.remove(), 300);
    };

    closeBtn.addEventListener('click', closeModal);
    
    // Cerrar si hacen clic fuera de la caja del modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}