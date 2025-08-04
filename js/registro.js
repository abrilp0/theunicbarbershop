// js/registro.js

import { registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = registrationForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Configurar fecha máxima (18 años atrás)
    const fechaNacimientoInput = document.getElementById('fecha_nacimiento');
    const hoy = new Date();
    const fechaMaxima = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    fechaNacimientoInput.max = fechaMaxima.toISOString().split('T')[0];

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }

            // Mostrar loader
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            submitBtn.disabled = true;

            try {
                // CORRECCIÓN: Usar document.getElementById() para obtener los valores de forma segura
                const nombreValue = document.getElementById('nombre').value.trim();
                const telefonoValue = document.getElementById('telefono').value.trim().replace(/\s+/g, '');
                const emailValue = document.getElementById('email').value.trim();
                const passwordValue = document.getElementById('password').value;
                const fechaNacimientoValue = document.getElementById('fecha_nacimiento').value;

                const userData = {
                    nombre: nombreValue,
                    telefono: telefonoValue,
                    fecha_nacimiento: fechaNacimientoValue
                };
                
                if (!userData.nombre || !emailValue || !passwordValue || !userData.telefono || !userData.fecha_nacimiento) {
                    throw new Error('Por favor, completa todos los campos.');
                }

                console.log("REGISTRO.JS DEBUG: Llamando a registerUser con datos:", { email: emailValue, userData });

                const { success, user, message, error, code } = await registerUser(emailValue, passwordValue, userData);

                console.log("REGISTRO.JS DEBUG: registerUser retornó:", { success, user, message, error, code });

                if (success) {
                    if (messageDiv) {
                        messageDiv.textContent = message || 'Registro exitoso. Revisa tu email para confirmar.';
                        messageDiv.className = 'message success';
                    }
                    registrationForm.reset();
                    console.log("REGISTRO.JS DEBUG: Registro exitoso. Mensaje mostrado.");
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = error || 'Error en el registro.';
                        messageDiv.className = 'message error';
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
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    } else {
        console.error("REGISTRO.JS DEBUG: Elemento registrationForm no encontrado en el DOM.");
    }

    document.getElementById('telefono').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
});
