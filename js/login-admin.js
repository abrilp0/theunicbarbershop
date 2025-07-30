// js/login-admin.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageElement = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita la recarga de la página por defecto del formulario

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            errorMessageElement.textContent = ''; // Limpiar mensajes de error previos
            errorMessageElement.style.display = 'none';

            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    errorMessageElement.textContent = 'Error al iniciar sesión: ' + error.message;
                    errorMessageElement.style.display = 'block';
                    console.error('Error de inicio de sesión:', error);
                } else {
                    // Redirigir al panel de administración si el login es exitoso
                    window.location.href = 'admin.html';
                }
            } catch (err) {
                errorMessageElement.textContent = 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
                errorMessageElement.style.display = 'block';
                console.error('Error inesperado durante el login:', err);
            }
        });
    }
});

// Opcional: Redirigir si ya hay una sesión activa al cargar login-admin.html
// Esto evita que un admin logueado vea la página de login
supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
        window.location.href = 'admin.html';
    }
}).catch(e => console.error("Error al verificar sesión en login:", e));