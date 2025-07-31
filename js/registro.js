// js/registro.js
import { registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const messageDiv = document.getElementById('message'); // Asegúrate de tener un div con ID 'message' en tu registro.html

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const nombre = document.getElementById('nombre').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const fechaNacimiento = document.getElementById('fecha_nacimiento').value;

            // Limpiar mensajes anteriores
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }

            // Validación básica del lado del cliente
            if (!email || !password || !nombre || !telefono || !fechaNacimiento) {
                if (messageDiv) {
                    messageDiv.textContent = 'Por favor, completa todos los campos.';
                    messageDiv.className = 'message error';
                }
                console.warn("REGISTRO.JS DEBUG: Campos obligatorios incompletos.");
                return;
            }

            // Aquí puedes añadir más validaciones (ej. formato de email, longitud de contraseña, etc.)

            const userData = {
                nombre,
                telefono,
                fecha_nacimiento: fechaNacimiento,
                // Puedes añadir 'sede' aquí si es necesario al registrar
                // sede: 'valor_sede' 
            };

            console.log("REGISTRO.JS DEBUG: Llamando a registerUser con datos:", { email, userData });

            try {
                const { success, user, message, error, code } = await registerUser(email, password, userData);

                console.log("REGISTRO.JS DEBUG: registerUser retornó:", { success, user, message, error, code });

                if (success) {
                    if (messageDiv) {
                        messageDiv.textContent = message || 'Registro exitoso. Revisa tu email para confirmar.';
                        messageDiv.className = 'message success';
                    }
                    // Opcional: limpiar el formulario después del registro exitoso
                    registrationForm.reset();
                    console.log("REGISTRO.JS DEBUG: Registro exitoso.");
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
                console.error("REGISTRO.JS DEBUG: Error inesperado al llamar a registerUser:", err);
            }
        });
    } else {
        console.error("REGISTRO.JS DEBUG: Elemento registrationForm no encontrado en el DOM.");
    }
});