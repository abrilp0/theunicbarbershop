// js/login.js
import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Limpiar mensajes anteriores
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
                messageDiv.style.display = 'none';
            }

            // Validación básica de campos
            if (!email || !password) {
                showMessage('Por favor ingresa tu email y contraseña', 'error');
                return;
            }

            try {
                const { success, user, isAdmin, message, error } = await loginUser(email, password);

                if (success) {
                    showMessage(message || 'Inicio de sesión exitoso. Redirigiendo...', 'success');
                    
                    // Pequeño retraso para que el usuario vea el mensaje
                    setTimeout(() => {
                        if (isAdmin) {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'agendar.html';
                        }
                    }, 1000);
                } else {
                    showMessage(error || 'Email o contraseña incorrectos', 'error');
                    // Limpiar contraseña
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (err) {
                showMessage(err.message || 'Error al iniciar sesión. Intenta nuevamente.', 'error');
                console.error("Error en login:", err);
            }
        });
    }

    function showMessage(text, type) {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            // Ocultar mensaje después de 5 segundos
            if (type === 'error') {
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 5000);
            }
        }
    }
});