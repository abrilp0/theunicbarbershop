// js/registro.js

import { registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    // Asegúrate de que este ID coincida con el ID en tu registro.html
    const messageDiv = document.getElementById('message'); // <--- ¡VERIFICA ESTA LÍNEA!
    const submitBtn = registrationForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Configurar fecha máxima (18 años atrás)
    const fechaNacimientoInput = document.getElementById('fecha_nacimiento');
    const hoy = new Date();
    const fechaMaxima = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    fechaNacimientoInput.max = fechaMaxima.toISOString().split('T')[0];

    if (registrationForm) { // Envuelto en if para seguridad, aunque ya sabemos que lo encuentra
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (messageDiv) { // Verifica si el elemento del mensaje existe
                messageDiv.textContent = ''; // Limpiar mensajes anteriores
                messageDiv.className = 'message'; // Restaurar clase base
            }

            // Mostrar loader
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            submitBtn.disabled = true;

            try {
                const userData = {
                    nombre: registrationForm.nombre.value.trim(),
                    telefono: registrationForm.telefono.value.trim().replace(/\s+/g, ''),
                    fecha_nacimiento: registrationForm.fecha_nacimiento.value
                };
                const email = registrationForm.email.value.trim();
                const password = registrationForm.password.value;

                // Validaciones adicionales aquí si es necesario...
                if (!userData.nombre || !email || !password || !userData.telefono || !userData.fecha_nacimiento) {
                    throw new Error('Por favor, completa todos los campos.');
                }

                console.log("REGISTRO.JS DEBUG: Llamando a registerUser con datos:", { email, userData });

                const { success, user, message, error, code } = await registerUser(email, password, userData);

                console.log("REGISTRO.JS DEBUG: registerUser retornó:", { success, user, message, error, code });

                if (success) {
                    if (messageDiv) { // Vuelve a verificar que el elemento exista
                        messageDiv.textContent = message || 'Registro exitoso. Revisa tu email para confirmar.';
                        messageDiv.className = 'message success'; // Asume que tienes una clase 'success' para estilos verdes/positivos
                    }
                    registrationForm.reset(); // Limpiar el formulario
                    console.log("REGISTRO.JS DEBUG: Registro exitoso. Mensaje mostrado.");
                    // No hay redirección aquí, se espera que el usuario revise el email.
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = error || 'Error en el registro.';
                        messageDiv.className = 'message error'; // Asume una clase 'error' para estilos rojos
                    }
                    console.error("REGISTRO.JS DEBUG: Falló el registro:", error, "Código:", code);
                }
            } catch (err) {
                if (messageDiv) {
                    messageDiv.textContent = err.message || 'Error inesperado durante el registro.';
                    messageDiv.className = 'message error';
                }
                console.error("REGISTRO.JS DEBUG: Error en el bloque try-catch:", err);
            } finally {
                // Restaurar botón
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    } else {
        console.error("REGISTRO.JS DEBUG: Elemento registrationForm no encontrado en el DOM.");
    }

    // Mejorar UX para el teléfono
    document.getElementById('telefono').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
});