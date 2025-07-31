// js/login-admin.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageElement = document.getElementById('error-message');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Verificar inmediatamente si el usuario es admin
    checkAdminSession();

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Validación básica
            if (!email || !password) {
                showError('Por favor ingresa tu email y contraseña');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    showError('Email o contraseña incorrectos');
                    passwordInput.value = '';
                    passwordInput.focus();
                    return;
                }

                // Verificar si el usuario es admin
                const { data: { user } } = await supabase.auth.getUser();
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (userError || !userData?.is_admin) {
                    await supabase.auth.signOut();
                    showError('No tienes permisos de administrador');
                    return;
                }

                // Redirigir al panel de admin
                window.location.href = 'admin.html';

            } catch (err) {
                showError('Error al iniciar sesión. Intenta nuevamente.');
                console.error('Error inesperado:', err);
            }
        });
    }

    async function checkAdminSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Verificar si es admin
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (!userError && userData?.is_admin) {
                    window.location.href = 'admin.html';
                } else {
                    await supabase.auth.signOut();
                }
            }
        } catch (e) {
            console.error("Error al verificar sesión:", e);
        }
    }

    function showError(message) {
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.style.display = 'block';
            
            // Ocultar mensaje después de 5 segundos
            setTimeout(() => {
                errorMessageElement.style.display = 'none';
            }, 5000);
        }
    }
});