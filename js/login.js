// js/login.js
import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    // Asegúrate de tener un div con ID 'message' en tu login.html para mostrar mensajes
    const messageDiv = document.getElementById('message'); 

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Limpiar mensajes anteriores y aplicar una clase inicial
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message'; // O la clase base que uses
            }

            console.log("LOGIN.JS DEBUG: Intentando iniciar sesión para:", email); // Log antes de la llamada

            try {
                const { success, user, isAdmin, message, error } = await loginUser(email, password);

                console.log("LOGIN.JS DEBUG: loginUser retornó:", { success, user, isAdmin, message, error }); // Log con la respuesta de loginUser

                if (success) {
                    if (messageDiv) {
                        messageDiv.textContent = message || 'Inicio de sesión exitoso.';
                        messageDiv.className = 'message success';
                    }
                    console.log("LOGIN.JS DEBUG: Inicio de sesión exitoso. Redirigiendo...");

                    // Redirigir según rol
                    if (isAdmin) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'agendar.html';
                    }
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = error || 'Ocurrió un error al iniciar sesión.';
                        messageDiv.className = 'message error';
                    }
                    console.error("LOGIN.JS DEBUG: Falló el inicio de sesión:", error);
                }
            } catch (err) {
                // Esto capturaría errores lanzados por loginUser (como el de "Usuario suspendido")
                if (messageDiv) {
                    messageDiv.textContent = err.message || 'Error inesperado al intentar iniciar sesión.';
                    messageDiv.className = 'message error';
                }
                console.error("LOGIN.JS DEBUG: Error inesperado al llamar a loginUser:", err);
            }
        });
    } else {
        console.error("LOGIN.JS DEBUG: Elemento loginForm no encontrado en el DOM.");
    }
});