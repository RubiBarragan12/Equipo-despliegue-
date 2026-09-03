import { API_BASE_URL, logger } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    logger.info('✅ registrar_cuenta.js cargado');
    logger.info('🔗 API_BASE_URL:', API_BASE_URL);

    // Elementos del formulario
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const paternoInput = document.getElementById('paterno');
    const maternoInput = document.getElementById('materno');
    const telefonoInput = document.getElementById('telefono');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('register-btn');

    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Obtener valores
        const nombre = nameInput.value.trim();
        const correo = emailInput.value.trim();
        const apellido_paterno = paternoInput.value.trim();
        const apellido_materno = maternoInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const contrasenia = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validaciones
        if (!nombre || !correo || !apellido_paterno || !apellido_materno || !telefono || !contrasenia) {
            logger.error('Todos los campos son requeridos');
            return;
        }

        if (contrasenia !== confirmPassword) {
            logger.error('Las contraseñas no coinciden');
            return;
        }

        if (contrasenia.length < 12) {
            logger.error('La contraseña debe tener al menos 12 dígitos');
            return;
        }

        try {
            registerBtn.disabled = true;
            registerBtn.textContent = 'Registrando...';

            const response = await fetch(`${API_BASE_URL}/registrar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },      
                body: JSON.stringify({
                    nombre,
                    correo,             
                    apellido_paterno,
                    apellido_materno,
                    telefono,
                    contrasenia
                })
            });

            const data = await response.json();

            if (response.ok) {
                logger.success('Registro exitoso');
                // Redirigir a login
                window.location.href = '/';
            } else {
                logger.error(data.message || 'Error en el registro');
            }
        } catch (error) {
            logger.error('Error al registrar: ' + error.message);
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Registrarse';
        }
    });
});