// js/auth.js
import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en Supabase Auth y crea un perfil de cliente.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {object} userData - Datos adicionales del usuario
 * @returns {Promise<object>} - Resultado del registro
 */
export async function registerUser(email, password, userData) {
    try {
        // Validación de campos obligatorios
        if (!email || !password) {
            throw new Error('Email y contraseña son obligatorios');
        }
        if (!userData?.nombre || !userData?.telefono || !userData?.fecha_nacimiento) {
            throw new Error('Nombre, teléfono y fecha de nacimiento son obligatorios');
        }

        // Verificar si el email o teléfono ya existen
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
                throw new Error('Este teléfono ya está registrado');
            }
        }

        // Registrar usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: userData.nombre,
                    phone: userData.telefono
                },
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        // Crear perfil en tabla clientes
        const { error: clientError } = await supabase
            .from('clientes')
            .insert([{
                id: authData.user.id,
                nombre: userData.nombre,
                telefono: userData.telefono,
                email: email,
                fecha_nacimiento: userData.fecha_nacimiento,
                sede: userData.sede || 'brasil',
                visitas: 0,
                bloqueado: false,
                created_at: new Date().toISOString()
            }]);

        if (clientError) {
            // Revertir creación en Auth si falla en clientes
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error('Error al crear perfil de cliente');
        }

        return {
            success: true,
            user: authData.user,
            message: 'Registro exitoso. Por favor verifica tu email.'
        };

    } catch (error) {
        console.error('Error en registerUser:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'REGISTER_ERROR'
        };
    }
}

/**
 * Inicia sesión para un usuario existente.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<object>} - Resultado del login
 */
export async function loginUser(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Email y contraseña son obligatorios');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Por favor verifica tu email antes de iniciar sesión');
            }
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Credenciales inválidas');
            }
            throw error;
        }

        // Verificar si el usuario existe en la tabla clientes
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();

        if (clienteError && clienteError.code !== 'PGRST116') { // 116 = no rows found
            console.error('Error al verificar cliente:', clienteError);
        }

        // Redirigir según el tipo de usuario
        if (cliente?.is_admin) {
            window.location.href = '/admin/dashboard.html';
        } else {
            window.location.href = '/agendar.html';
        }

        return {
            success: true,
            user: data.user,
            isAdmin: cliente?.is_admin || false
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'LOGIN_ERROR'
        };
    }
}

/**
 * Verifica la sesión actual del usuario.
 * @returns {Promise<object>} - Estado de la sesión
 */
export async function checkSession() {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!data.session) return { success: false, user: null };

        // Verificar si es admin
        const { data: cliente } = await supabase
            .from('clientes')
            .select('is_admin')
            .eq('id', data.session.user.id)
            .single();

        return {
            success: true,
            user: data.session.user,
            isAdmin: cliente?.is_admin || false
        };

    } catch (error) {
        console.error('Error en checkSession:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verifica si el usuario tiene promoción de cumpleaños.
 * @param {string} userId - ID del usuario
 * @returns {Promise<object>} - Resultado de la verificación
 */
export async function checkBirthdayPromo(userId) {
    try {
        if (!userId) throw new Error('ID de usuario requerido');

        const { data: cliente, error } = await supabase
            .from('clientes')
            .select('visitas, fecha_nacimiento')
            .eq('id', userId)
            .single();

        if (error) throw error;
        if (!cliente) throw new Error('Cliente no encontrado');

        const hoy = new Date();
        const cumple = new Date(cliente.fecha_nacimiento);
        const esCumple = hoy.getMonth() === cumple.getMonth() && hoy.getDate() === cumple.getDate();
        const tienePromo = esCumple && cliente.visitas >= 4;

        return {
            success: true,
            tienePromo,
            esCumple,
            visitas: cliente.visitas,
            message: tienePromo 
                ? '¡Feliz cumpleaños! Tienes un corte gratis.' 
                : esCumple 
                    ? 'Feliz cumpleaños (necesitas 4 visitas para la promoción)'
                    : 'Hoy no es tu cumpleaños'
        };

    } catch (error) {
        console.error('Error en checkBirthdayPromo:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Envía email para restablecer contraseña.
 * @param {string} email - Email del usuario
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function resetPassword(email) {
    try {
        if (!email) throw new Error('Email es requerido');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/actualizar-password.html`
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Email de recuperación enviado'
        };

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return {
            success: false,
            error: error.message.includes('user not found') 
                ? 'Email no registrado' 
                : 'Error al enviar email'
        };
    }
}

/**
 * Cierra la sesión del usuario.
 * @returns {Promise<object>} - Resultado del logout
 */
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = '/login.html';
        return { success: true };

    } catch (error) {
        console.error('Error en logoutUser:', error);
        return {
            success: false,
            error: error.message
        };
    }
}