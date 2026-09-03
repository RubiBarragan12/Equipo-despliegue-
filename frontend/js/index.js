import { API_BASE_URL, logger } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// Importamos nuestra nueva utilidad
import { showAlert } from './utils/modalAlerts.js'; 

// Inicializar Supabase
const supabase = createClient(
    'https://oafzgtsptoppukebcjfg.supabase.co/',
    'sb_publishable_fbe2lQ0SfsFGmcm8i8PZgA_9MPPhNE-'
);

document.addEventListener('DOMContentLoaded', () => {

    const togglePassword = document.getElementById("togglePassword");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn");

    // ===== PASSWORD VISIBILITY =====
    if (togglePassword) {
        togglePassword.addEventListener("click", (e) => {
            e.preventDefault();
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            const icon = togglePassword.querySelector('.material-symbols-outlined');
            icon.textContent = type === 'text' ? 'visibility' : 'visibility_off';
        });
    }

    // ===== LOGIN =====
    // Cambia esto:
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => login(e)); // Usa una arrow function
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login(e);
            }
        });
    }

    async function login(e) {
        if (e) e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            // USO DEL MODAL DE ADVERTENCIA
            showAlert('Campos incompletos', 'Por favor completa tu correo y contraseña para continuar.', 'warn');
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';

            // login con Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                // USO DEL MODAL DE ERROR PARA CREDENCIALES INCORRECTAS
                showAlert('Error de autenticación', 'Correo o contraseña incorrectos. Verifica tus datos.', 'error');
                return;
            }

            const user = data.user;

            try {
                const res = await fetch(`${API_BASE_URL}/user-info/${user.id}`);
                if (!res.ok) throw new Error('Usuario no registrado en la base de datos');

                const infoUsuario = await res.json();

                // Guardar en localStorage ANTES de redireccionar
                localStorage.setItem('user', JSON.stringify(infoUsuario));

                const rol = infoUsuario.rol;

                if (rol === 'cliente') {
                    window.location.href = '/pages/empresas.html';
                } else {
                    if (infoUsuario.empresa_nombre) {
                        localStorage.setItem('empresa', JSON.stringify(infoUsuario.empresa));
                    }

                    const rutas = {
                        'Tatuador': '/pages/tatuador/menu_tatuador.html',
                        'Cajero': '/pages/cajero/menu_cajero.html',
                        'Dueño': '/pages/administrador/menu_admin.html',
                        'Superadmin': '/pages/superadmin/menu_superadmin.html'
                    };

                    const destino = rutas[rol];
                    if (destino) {
                        window.location.href = destino;
                    } else {
                        // Rol no reconocido → acceso como rol general
                        console.warn('Rol no mapeado, redirigiendo a rol general:', rol);
                        window.location.href = '/pages/rol_general/menu_rol_general.html';
                    }
                }
            } catch (err) {
                console.error(err);
                // USO DEL MODAL DE ERROR
                showAlert('Error de sistema', 'Ocurrió un problema al obtener tu perfil. Intenta de nuevo más tarde.', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            // USO DEL MODAL DE ERROR
            showAlert('Error de conexión', 'No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
        }
    }
});