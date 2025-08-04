// js/login.js
import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    // CORRECCIÓN: Se actualiza el ID del elemento de mensaje para que coincida con el HTML
    const mensaje = document.getElementById('login-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita la recarga de la página

            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                mostrarMensaje('Por favor, ingresa tu correo y contraseña.', 'error');
                return;
            }

            mostrarMensaje('Iniciando sesión...', 'info');

            try {
                const { success, error } = await loginUser(email, password);
                
                if (success) {
                    mostrarMensaje('¡Inicio de sesión exitoso!', 'success');
                    // Redirige al usuario a la página de agendamiento
                    window.location.replace('agendar.html');
                } else {
                    throw new Error(error);
                }
            } catch (error) {
                console.error('Error durante el login:', error);
                mostrarMensaje(`Error al iniciar sesión: ${error.message}`, 'error');
            }
        });
    }

    // Se mantiene la función mostrarMensaje, que ahora usa la variable 'mensaje'
    function mostrarMensaje(msg, tipo) {
        if (mensaje) { // Se añade una verificación para evitar errores si el elemento no existe
            mensaje.textContent = msg;
            mensaje.className = `message ${tipo}`;
        }
    }
});
