// js/auth.js
import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario con verificación de duplicados e inserción segura
 */
export async function registerUser(email, password, userData) {
    try {
        // Validación de campos obligatorios
        if (!email || !password || !userData?.nombre || !userData?.telefono || !userData?.fecha_nacimiento) {
            throw new Error('Todos los campos son obligatorios');
        }

        // 1. Verificar duplicados usando función stored
        const { data: duplicateCheck, error: checkError } = await supabase
            .rpc('check_duplicate_client', {
                p_email: email,
                p_telefono: userData.telefono
            });

        if (checkError) throw checkError;
        if (duplicateCheck.exists) {
            throw new Error(duplicateCheck.message || 'El usuario ya existe');
        }

        // 2. Registrar en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: userData.nombre,
                    telefono: userData.telefono
                },
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Error al crear usuario');

        // 3. Crear perfil usando función stored (evita problemas RLS)
        const { data: profileData, error: profileError } = await supabase
            .rpc('create_client_profile', {
                p_user_id: authData.user.id,
                p_email: email,
                p_nombre: userData.nombre,
                p_telefono: userData.telefono,
                p_fecha_nacimiento: userData.fecha_nacimiento,
                p_sede: userData.sede || 'brasil'
            });

        if (profileError) throw new Error('Error al crear perfil: ' + profileError.message);

        return {
            success: true,
            user: authData.user,
            message: 'Registro exitoso. Verifica tu email para activar tu cuenta.'
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
 * Inicio de sesión con redirección automática para admins
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Manejo mejorado de errores
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Por favor verifica tu email primero');
            }
            throw error;
        }

        // Verificar rol de admin
        const { data: profile } = await supabase
            .rpc('get_user_profile', {
                p_user_id: data.user.id
            });

        // Redirección automática
        if (profile?.is_admin) {
            window.location.href = '/admin/dashboard.html';
        } else {
            window.location.href = '/agendar.html';
        }

        return {
            success: true,
            user: data.user,
            isAdmin: profile?.is_admin || false
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        return {
            success: false,
            error: error.message.includes('Invalid login credentials') 
                ? 'Email o contraseña incorrectos' 
                : error.message
        };
    }
}

/**
 * Verifica la sesión actual (compatible con admin)
 */
export async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) return { success: false, user: null };

        // Obtener perfil extendido
        const { data: profile } = await supabase
            .rpc('get_user_profile', {
                p_user_id: session.user.id
            });

        return {
            success: true,
            user: session.user,
            isAdmin: profile?.is_admin || false,
            profileData: profile
        };

    } catch (error) {
        console.error('Error en checkSession:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verificación de promoción por cumpleaños (compatible con admin)
 */
export async function checkBirthdayPromo(userId) {
    try {
        const { data: profile, error } = await supabase
            .rpc('get_birthday_status', {
                p_user_id: userId
            });

        if (error) throw error;

        return {
            success: true,
            tienePromo: profile.tiene_promo,
            esCumple: profile.es_cumple,
            visitas: profile.visitas,
            message: profile.mensaje
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
 * Cierre de sesión
 */
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = '/login.html';
        return { success: true };

    } catch (error) {
        console.error('Error en logoutUser:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Restablecer contraseña
 */
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/actualizar-password.html`
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Instrucciones enviadas a tu email'
        };

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return {
            success: false,
            error: error.message.includes('user not found') 
                ? 'Email no registrado' 
                : 'Error al enviar instrucciones'
        };
    }
}

// Funciones específicas para administradores (deben llamarse desde contexto seguro)
export const adminFunctions = {
    /**
     * NOTA: Estas funciones deben usarse desde un entorno backend/seguro
     * no directamente desde el cliente público
     */
    getAllClients: async () => {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    updateClient: async (clientId, updates) => {
        const { data, error } = await supabase
            .from('clientes')
            .update(updates)
            .eq('id', clientId)
            .select();

        if (error) throw error;
        return data;
    }
};