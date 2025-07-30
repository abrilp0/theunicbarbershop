import { registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registroForm');
    const mensaje = document.getElementById('mensaje');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Configurar fecha máxima (18 años atrás)
    const fechaNacimientoInput = document.getElementById('fecha_nacimiento');
    const hoy = new Date();
    const fechaMaxima = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    fechaNacimientoInput.max = fechaMaxima.toISOString().split('T')[0];

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensaje.textContent = '';
        mensaje.style.color = 'red';

        // Mostrar loader
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        submitBtn.disabled = true;

        try {
            const userData = {
                nombre: form.nombre.value.trim(),
                telefono: form.telefono.value.trim().replace(/\s+/g, ''),
                fecha_nacimiento: form.fecha_nacimiento.value
            };
            const email = form.email.value.trim();
            const password = form.password.value;

            // Validaciones
            if (!userData.nombre || !email || !password || !userData.telefono || !userData.fecha_nacimiento) {
                throw new Error('Todos los campos son obligatorios');
            }

            if (!/^[0-9]{9,12}$/.test(userData.telefono)) {
                throw new Error('Teléfono debe contener 9 a 12 dígitos');
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Ingresa un email válido');
            }

            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            const fechaNac = new Date(userData.fecha_nacimiento);
            if (fechaNac > fechaMaxima) {
                throw new Error('Debes ser mayor de 18 años para registrarte');
            }

            // Registrar usuario
            const { success, error } = await registerUser(email, password, userData);

            if (success) {
                mensaje.style.color = 'green';
                mensaje.textContent = '¡Registro exitoso! Por favor verifica tu email.';
                form.reset();

                // Redirigir después de 3 segundos
                setTimeout(() => {
                    window.location.href = 'login.html?registered=true';
                }, 3000);
            } else {
                throw new Error(error || 'Error desconocido al registrar');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            
            // Manejo especial de errores conocidos
            if (error.message.includes('duplicate key')) {
                if (error.message.includes('email')) {
                    mensaje.textContent = 'Este email ya está registrado';
                } else if (error.message.includes('telefono')) {
                    mensaje.textContent = 'Este teléfono ya está registrado';
                } else {
                    mensaje.textContent = 'El usuario ya existe';
                }
            } else if (error.message.includes('password')) {
                mensaje.textContent = 'La contraseña no cumple los requisitos';
            } else {
                mensaje.textContent = error.message;
            }
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Mejorar UX para el teléfono
    document.getElementById('telefono').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        // ... código anterior ...

if (success) {
    mensaje.style.color = 'green';
    mensaje.textContent = '¡Registro exitoso! Por favor verifica tu email.';
    form.reset();

    // Redirigir después de 3 segundos
    setTimeout(() => {
        // --- CAMBIO AQUÍ: LA LÓGICA DE REDIRECCIÓN DEBE SER ESTA ---
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        if (redirect) {
            window.location.href = `${redirect}.html`;
        } else {
            window.location.href = 'login.html'; // O la página que quieras por defecto
        }
    }, 3000);
} else {
    // ...
}

// ... código posterior ...

// --- ELIMINA ESTO: ESTE CÓDIGO CAUSA LA REDIRECCIÓN SIEMPRE ---
/*
const urlParams = new URLSearchParams(window.location.search);
const redirect = urlParams.get('redirect');
if (redirect) {
    window.location.href = `${redirect}.html`;
} else {
    window.location.href = 'agendar.html';
}
*/
// --- FIN DEL CÓDIGO A ELIMINAR ---
    });
});