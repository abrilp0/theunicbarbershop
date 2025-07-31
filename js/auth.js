// js/auth.js

import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en Supabase Auth y crea un perfil de cliente.
 * NOTA: La tabla 'clientes' ahora se llena con un Trigger de la base de datos,
 * por lo que el código de inserción directa ha sido eliminado.
 */
export async function registerUser(email, password, userData) {
    try {
        if (!email || !password || !userData?.nombre || !userData?.telefono) {
            throw new Error('Faltan campos obligatorios');
        }

        // Paso 1: Verificación de duplicados para evitar registros con el mismo email o teléfono.
        const { data: existingUsers, error: checkError } = await supabase
            .from('clientes')
            .select('email, telefono')
            .or(`email.eq.${email},telefono.eq.${userData.telefono}`);

        if (checkError) throw checkError;

        if (existingUsers?.length > 0) {
            const emailExists = existingUsers.some(u => u.email === email);
            const phoneExists = existingUsers.some(u => u.telefono === userData.telefono);

            if (emailExists && phoneExists) {
                throw new Error('El email y teléfono ya están registrados');
            } else if (emailExists) {
                throw new Error('Este email ya está registrado');
            } else if (phoneExists) {
                throw new Error('Este número de teléfono ya está registrado');
            }
        }

        // Paso 2: Registrar el usuario en Supabase Auth.
        // Se guarda la información del cliente en el campo 'metadata'
        // y se usa la URL de redirección correcta.
        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: userData.nombre,
                    telefono: userData.telefono,
                    fecha_nacimiento: userData.fecha_nacimiento,
                    sede: userData.sede || 'brasil'
                },
                emailRedirectTo: 'https://theunicbarbershop.cl/login.html'
            }
        });

        if (authError) throw authError;

        return {
            success: true,
            user: data.user,
            message: 'Registro exitoso. Por favor verifica tu email para iniciar sesión.'
        };

    } catch (error) {
        console.error('Error en registerUser:', error);
        return {
            success: false,
            error: error.message || 'Error desconocido',
            code: error.code || 'UNKNOWN_ERROR'
        };
    }
}

/**
 * Inicia sesión para un usuario existente.
 */
export async function loginUser(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Faltan campos obligatorios');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        // Obtener el rol del usuario desde la tabla 'clientes' o 'empleados'
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('is_admin')
            .eq('email', email)
            .single();

        let isAdmin = false;
        if (cliente) {
            isAdmin = cliente.is_admin || false;
        }

        return {
            success: true,
            user: data.user,
            isAdmin,
            message: 'Inicio de sesión exitoso.'
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        return {
            success: false,
            user: null,
            isAdmin: false,
            message: 'Credenciales inválidas.',
            error: error.message
        };
    }
}

/**
 * Verifica si el usuario tiene una promoción de cumpleaños.
 */
export async function checkBirthdayPromo(userId) {
    try {
        if (!userId) {
            throw new Error('ID de usuario no proporcionado.');
        }

        const { data: cliente, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('auth_user_id', userId)
            .single();

        if (error || !cliente) {
            console.error('Cliente no encontrado:', error);
            return { success: false, error: 'Cliente no encontrado.' };
        }

        const hoy = new Date();
        const cumpleanos = new Date(cliente.fecha_nacimiento);
        const esCumple = hoy.getMonth() === cumpleanos.getMonth() && hoy.getDate() === cumpleanos.getDate();

        // La promoción requiere ser su cumpleaños Y tener al menos 4 visitas
        const tienePromo = esCumple && (cliente.visitas >= 4);

        return {
            success: true,
            tienePromo,
            esCumple,
            visitas: cliente.visitas,
            message: tienePromo
                ? '¡Feliz cumpleaños! Tienes derecho a un corte gratis.'
                : esCumple
                    ? 'Feliz cumpleaños (necesitas 4 visitas para la promoción)'
                    : 'Hoy no es tu cumpleaños'
        };

    } catch (error) {
        console.error('Error en checkBirthdayPromo:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'PROMO_CHECK_ERROR'
        };
    }
}

export async function resetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/actualizar-password.html`
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Email de recuperación enviado. Revisa tu bandeja de entrada.'
        };

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return {
            success: false,
            error: error.message.includes('user not found')
                ? 'No existe una cuenta con este email'
                : 'Error al enviar email de recuperación'
        };
    }
}
