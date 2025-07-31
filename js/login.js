import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const userMenu = document.getElementById('user-menu-container');
    const userEmail = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');

    // Verificar si ya hay una sesión activa
    checkSession();

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetMessage();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                showMessage('Por favor ingresa tu email y contraseña', 'error');
                return;
            }

            try {
                const { success, user, error } = await loginUser(email, password);
                
                if (success) {
                    showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
                    updateUserMenu(user.email);
                    setTimeout(() => window.location.href = 'agendar.html', 1000);
                } else {
                    showMessage(error || 'Email o contraseña incorrectos', 'error');
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (err) {
                console.error('Error en login:', err);
                showMessage('Error al iniciar sesión. Por favor intenta nuevamente.', 'error');
            }
        });
    }

    // Manejar cierre de sesión
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = 'index.html';
            }
        });
    }

    function showMessage(text, type) {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            updateUserMenu(user.email);
        }
    }
});