// En login.js, al inicio del archivo:
import { supabase } from './supabase.js';
// Esperar a que Supabase esté disponible
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('login-message');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const userMenu = document.getElementById('user-menu-container');
    const userEmail = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');
    const menuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');

    // Verificar sesión al cargar
    checkSession();

    // Menú hamburguesa
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
        });
    }

    // Manejar login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            resetMessage();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                showMessage('Por favor ingresa tu email y contraseña', 'error');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;
                
                // Si el login es exitoso
                const user = data.user;
                const isAdmin = user.user_metadata?.role === 'admin';
                showMessage(`Bienvenido de nuevo, ${user.email}!`, 'success');

                // Redireccionar después de un breve delay
                setTimeout(() => {
                    if (isAdmin) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'agendar.html';
                    }
                }, 1500);

            } catch (error) {
                console.error('Error durante el inicio de sesión:', error.message);
                showMessage(error.message.includes('Invalid login credentials')
                    ? 'Credenciales de acceso inválidas.'
                    : 'Error al iniciar sesión. Intenta nuevamente.', 'error');
            }
        });
    }

    // Manejar cierre de sesión
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = 'index.html';
            }
        });
    }

    // Funciones auxiliares
    function showMessage(text, type) {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            if (type === 'error') {
                setTimeout(resetMessage, 5000);
            }
        }
    }

    function resetMessage() {
        if (messageDiv) {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
            messageDiv.style.display = 'none';
        }
    }

    function updateUserMenu(email) {
        if (userMenu && userEmail) {
            userMenu.style.display = 'flex';
            userEmail.textContent = email;
        }
    }

    async function checkSession() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (user) {
                updateUserMenu(user.email);
            }
        } catch (e) {
            console.error('Error al verificar sesión:', e.message);
        }
    }
});
