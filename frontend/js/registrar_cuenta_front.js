import { API_BASE_URL, logger } from './config.js';

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

const validations = {
    // Validar email
    email: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validar teléfono (solo números)
    telefono: (telefono) => {
        const telefonoRegex = /^\d+$/;
        return telefonoRegex.test(telefono) && telefono.length >= 10;
    },

    // Validar requisitos individuales de contraseña
    passwordRequirements: (password) => {
        return {
            length: password.length >= 8 && password.length <= 12,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
    },

    // Validar que todos los requisitos se cumplan
    passwordComplete: (password) => {
        const reqs = validations.passwordRequirements(password);
        return reqs.length && reqs.uppercase && reqs.lowercase && reqs.number && reqs.special;
    },

    // Validar contraseña completa (para registro)
    password: (password) => {
        if (password.length < 8 || password.length > 12) {
            return { valid: false, message: 'La contraseña debe tener entre 8 y 12 caracteres' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
        }
        if (!/\d/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos un número' };
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos un carácter especial (!@#$%^&*...)' };
        }
        return { valid: true };
    },

    // Validar nombre
    nombre: (nombre) => {
        return nombre.trim().length >= 2;
    }
};

// ============================================
// FUNCIONES DE UI PARA REQUISITOS
// ============================================

const passwordUI = {
    input: document.getElementById('password'),
    requirementsContainer: document.getElementById('password-requirements'),
    requirements: {
        length: document.querySelector('[data-requirement="length"]'),
        uppercase: document.querySelector('[data-requirement="uppercase"]'),
        lowercase: document.querySelector('[data-requirement="lowercase"]'),
        number: document.querySelector('[data-requirement="number"]'),
        special: document.querySelector('[data-requirement="special"]')
    },

    updateRequirements() {
        const password = this.input.value;

        if (!password) {
            // Resetear estilos cuando está vacío
            this.requirementsContainer.classList.remove('active');
            this.input.classList.remove('password-error');
            Object.values(this.requirements).forEach(req => {
                req.classList.remove('met', 'unmet');
            });
            return;
        }

        // Mostrar requisitos
        this.requirementsContainer.classList.add('active');

        // Validar requisitos
        const reqs = validations.passwordRequirements(password);
        const isComplete = validations.passwordComplete(password);

        // Actualizar cada requisito
        this.updateRequirement('length', reqs.length);
        this.updateRequirement('uppercase', reqs.uppercase);
        this.updateRequirement('lowercase', reqs.lowercase);
        this.updateRequirement('number', reqs.number);
        this.updateRequirement('special', reqs.special);

        // Actualizar color del input
        if (isComplete) {
            this.input.classList.remove('password-error');
        } else {
            this.input.classList.add('password-error');
        }
    },

    updateRequirement(requirement, isMet) {
        const element = this.requirements[requirement];
        if (isMet) {
            element.classList.remove('unmet');
            element.classList.add('met');
        } else {
            element.classList.remove('met');
            element.classList.add('unmet');
        }
    }
};

// ============================================
// SISTEMA DE MODALES
// ============================================

const modal = {
    el: document.getElementById('modal'),
    title: document.getElementById('modal-title'),
    message: document.getElementById('modal-message'),
    icon: document.getElementById('modal-icon'),
    closeBtn: document.getElementById('modal-close'),
    confirmBtn: document.getElementById('modal-confirm-btn'),
    cancelBtn: document.getElementById('modal-cancel-btn'),
    overlay: document.querySelector('.modal-overlay'),
    callback: null,

    show(title, message, type = 'info', options = {}) {
        this.title.textContent = title;
        this.message.textContent = message;

        // Configurar icono y color
        const icons = {
            success: { icon: 'check_circle', class: 'modal-icon-success' },
            error: { icon: 'cancel', class: 'modal-icon-error' },
            warning: { icon: 'warning', class: 'modal-icon-warning' },
            info: { icon: 'info', class: 'modal-icon-info' }
        };

        const config = icons[type] || icons.info;
        this.icon.innerHTML = `<span class="material-symbols-outlined">${config.icon}</span>`;
        this.icon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ' + config.class;

        // Configurar botones
        if (options.showConfirm === false) {
            this.confirmBtn.textContent = 'Aceptar';
            this.cancelBtn.classList.add('hidden');
        } else {
            this.confirmBtn.textContent = options.confirmText || 'Aceptar';
            this.cancelBtn.classList.add('hidden');
        }

        if (options.showCancel) {
            this.cancelBtn.classList.remove('hidden');
            this.cancelBtn.textContent = options.cancelText || 'Cancelar';
        }

        this.el.classList.remove('hidden');
        this.callback = options.onConfirm || null;
    },

    hide() {
        this.el.classList.add('hidden');
        this.callback = null;
    }
};

// Manejadores de eventos del modal
modal.closeBtn.addEventListener('click', () => modal.hide());
modal.overlay.addEventListener('click', () => modal.hide());
modal.confirmBtn.addEventListener('click', () => {
    if (modal.callback) modal.callback();
    modal.hide();
});
modal.cancelBtn.addEventListener('click', () => modal.hide());

// ============================================
// VALIDACIONES EN TIEMPO REAL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ registrar_cuenta.js cargado');
    console.log('🔗 API_BASE_URL:', API_BASE_URL);

    // Elementos del formulario
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const paternoInput = document.getElementById('paterno');
    const maternoInput = document.getElementById('materno');
    const telefonoInput = document.getElementById('telefono');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('register-btn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');

    // ============================================
    // FUNCIONES PARA AGREGAR/REMOVER ERRORES
    // ============================================

    const setInputError = (input, errorElementId) => {
        input.classList.add('input-error');
        if (errorElementId) {
            document.getElementById(errorElementId).classList.remove('hidden');
        }
    };

    const clearInputError = (input, errorElementId) => {
        input.classList.remove('input-error');
        if (errorElementId) {
            document.getElementById(errorElementId).classList.add('hidden');
        }
    };

    // ============================================
    // VALIDACIONES EN BLUR Y FOCUS
    // ============================================

    // Nombre
    nameInput.addEventListener('blur', () => {
        const nombre = nameInput.value.trim();
        if (nombre && !validations.nombre(nombre)) {
            setInputError(nameInput, 'error-name');
        } else {
            clearInputError(nameInput, 'error-name');
        }
    });

    nameInput.addEventListener('focus', () => {
        clearInputError(nameInput, 'error-name');
    });

    // Email
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !validations.email(email)) {
            setInputError(emailInput, 'error-email');
        } else {
            clearInputError(emailInput, 'error-email');
        }
    });

    emailInput.addEventListener('focus', () => {
        clearInputError(emailInput, 'error-email');
    });

    // Apellido Paterno
    paternoInput.addEventListener('blur', () => {
        const paterno = paternoInput.value.trim();
        if (!paterno) {
            setInputError(paternoInput, 'error-paterno');
        } else {
            clearInputError(paternoInput, 'error-paterno');
        }
    });

    paternoInput.addEventListener('focus', () => {
        clearInputError(paternoInput, 'error-paterno');
    });

    // Apellido Materno
    maternoInput.addEventListener('blur', () => {
        const materno = maternoInput.value.trim();
        if (!materno) {
            setInputError(maternoInput, 'error-materno');
        } else {
            clearInputError(maternoInput, 'error-materno');
        }
    });

    maternoInput.addEventListener('focus', () => {
        clearInputError(maternoInput, 'error-materno');
    });

    // Teléfono
    telefonoInput.addEventListener('blur', () => {
        const telefono = telefonoInput.value.trim();
        if (telefono && !validations.telefono(telefono)) {
            setInputError(telefonoInput, 'error-telefono');
        } else {
            clearInputError(telefonoInput, 'error-telefono');
        }
    });

    telefonoInput.addEventListener('focus', () => {
        clearInputError(telefonoInput, 'error-telefono');
    });

    // Teléfono - filtrar en tiempo real (solo números)
    telefonoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d]/g, '');
    });

    // Contraseña
    passwordInput.addEventListener('blur', () => {
        const password = passwordInput.value;
        if (password && !validations.passwordComplete(password)) {
            setInputError(passwordInput, 'error-password');
        } else if (password) {
            clearInputError(passwordInput, 'error-password');
        }
    });

    passwordInput.addEventListener('focus', () => {
        clearInputError(passwordInput, 'error-password');
    });

    // Confirmar Contraseña
    confirmPasswordInput.addEventListener('blur', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            setInputError(confirmPasswordInput, 'error-confirm-password');
        } else {
            clearInputError(confirmPasswordInput, 'error-confirm-password');
        }
    });

    confirmPasswordInput.addEventListener('focus', () => {
        clearInputError(confirmPasswordInput, 'error-confirm-password');
    });

    // Toggle mostrar/ocultar contraseña
    togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.querySelector('span').textContent = isPassword ? 'visibility' : 'visibility_off';
    });

    toggleConfirmPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = confirmPasswordInput.type === 'password';
        confirmPasswordInput.type = isPassword ? 'text' : 'password';
        toggleConfirmPasswordBtn.querySelector('span').textContent = isPassword ? 'visibility' : 'visibility_off';
    });

    // Validación en tiempo real: Requisitos de contraseña
    passwordInput.addEventListener('input', () => {
        passwordUI.updateRequirements();
    });

    // Registrar
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

        // VALIDACIONES
        if (!nombre || !correo || !apellido_paterno || !apellido_materno || !telefono || !contrasenia) {
            modal.show('Campos requeridos', 'Por favor completa todos los campos', 'warning');
            return;
        }

        // Validar nombre
        if (!validations.nombre(nombre)) {
            modal.show('Nombre inválido', 'El nombre debe tener al menos 2 caracteres', 'warning');
            setInputError(nameInput, 'error-name');
            return;
        }

        // Validar email
        if (!validations.email(correo)) {
            modal.show('Correo inválido', 'Por favor ingresa un correo electrónico válido (ejemplo: usuario@email.com)', 'warning');
            setInputError(emailInput, 'error-email');
            return;
        }

        // Validar teléfono
        if (!validations.telefono(telefono)) {
            modal.show('Teléfono inválido', 'El teléfono debe contener solo números y mínimo 10 dígitos', 'warning');
            setInputError(telefonoInput, 'error-telefono');
            return;
        }

        // Validar contraseña
        const passwordValidation = validations.password(contrasenia);
        if (!passwordValidation.valid) {
            modal.show('Contraseña débil', passwordValidation.message, 'warning');
            setInputError(passwordInput, 'error-password');
            return;
        }

        // Validar que las contraseñas coincidan
        if (contrasenia !== confirmPassword) {
            modal.show('Contraseñas no coinciden', 'Las contraseñas ingresadas deben ser iguales', 'warning');
            setInputError(confirmPasswordInput, 'error-confirm-password');
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
                modal.show(
                    '¡Registro exitoso!',
                    'Tu cuenta ha sido creada exitosamente. Serás redirigido al login.',
                    'success',
                    {
                        onConfirm: () => {
                            window.location.href = '/';
                        }
                    }
                );
            } else {
                modal.show('Error en el registro', data.message || 'Hubo un error al registrar tu cuenta', 'error');
            }
        } catch (error) {
            modal.show('Error de conexión', 'Error al registrar: ' + error.message, 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Registrarse';
        }
    });
});