// js/login-admin.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageElement = document.getElementById('error-message');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    // Verificar si ya existe una sesión de administrador al cargar la página.
    checkExistingAdminSession();

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageElement.style.display = 'none';

            // Deshabilitar el botón para evitar múltiples envíos
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Verificando...';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            try {
                // 1. Intentar iniciar sesión con Supabase Auth
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (authError) {
                    throw authError;
                }

                // Si el inicio de sesión es exitoso, verificar si es un administrador usando la función RPC
                const { data: adminData, error: adminError } = await supabase.rpc('check_admin_status', {
                    p_user_id: data.user.id
                });

                // Si no hay datos de administrador o hay un error, no es un admin.
                if (adminError || !adminData || adminData.length === 0) {
                    await supabase.auth.signOut();
                    throw new Error('No tienes permisos de administrador');
                }

                // Si es un admin, obtener la sede y redirigir
                const sede = adminData[0].sede;
                if (!sede) {
                    await supabase.auth.signOut();
                    throw new Error('Administrador sin sede asignada');
                }

                // Redirigir al panel de admin con el parámetro de la sede
                window.location.replace(`admin.html?sede=${sede}`);

            } catch (error) {
                console.error('Error en login:', error);
                showError(getErrorMessage(error));
            } finally {
                // Volver a habilitar el botón de inicio de sesión
                submitBtn.disabled = false;
                submitBtn.textContent = 'Iniciar sesión';
            }
        });
    }

    async function checkExistingAdminSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return;
            }
            
            const { data: adminData, error: adminError } = await supabase.rpc('check_admin_status', {
                p_user_id: user.id
            });

            if (!adminError && adminData && adminData.length > 0) {
                const sede = adminData[0].sede;
                if (sede) {
                    window.location.replace(`admin.html?sede=${sede}`);
                }
            }
        } catch (error) {
            console.error('Error al verificar sesión existente:', error);
        }
    }

    function showError(message) {
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.style.display = 'block';
            
            setTimeout(() => {
                errorMessageElement.style.display = 'none';
            }, 5000);
        }
    }

    function getErrorMessage(error) {
        if (error.message.includes('Invalid login credentials')) {
            return 'Email o contraseña incorrectos';
        }
        if (error.message.includes('Email not confirmed')) {
            return 'Por favor verifica tu email primero';
        }
        return error.message || 'Error al iniciar sesión';
    }
});
