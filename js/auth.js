// js/auth.js
import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario con verificación de duplicados
 */
export async function registerUser(email, password, userData) {
    try {
        // Validación de campos obligatorios
        if (!email || !password || !userData?.nombre || !userData?.telefono) {
            throw new Error('Faltan campos obligatorios');
        }

        // 1. Verificar duplicados
        const { data: duplicateCheck, error: checkError } = await supabase
            .rpc('check_duplicate_client', {
                p_email: email,
                p_telefono: userData.telefono
            });

        if (checkError) throw checkError;
        if (duplicateCheck?.exists) {
            throw new Error(duplicateCheck.message || 'Usuario ya registrado');
        }

        // 2. Registrar en Auth
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
        if (!authData.user) throw new Error('Error al crear usuario');

        // 3. Crear perfil en clientes
        const { error: clientError } = await supabase
            .from('clientes')
            .insert({
                id: authData.user.id,
                email: email,
                nombre: userData.nombre,
                telefono: userData.telefono,
                fecha_nacimiento: userData.fecha_nacimiento,
                sede: userData.sede || 'brasil',
                visitas: 0,
                bloqueado: false,
                created_at: new Date().toISOString()
            });

        if (clientError) throw new Error('Error al crear perfil: ' + clientError.message);

        return {
            success: true,
            user: authData.user,
            message: 'Registro exitoso. Verifica tu email.'
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
 * Inicio de sesión con detección de sede para admins
 */
export async function loginUser(email, password) {
    try {
        // 1. Autenticación básica
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Por favor verifica tu email primero');
            }
            throw error;
        }

        // 2. Verificar si es admin y obtener sede
        const { data: adminData, error: adminError } = await supabase
            .rpc('get_admin_data', {
                p_user_id: data.user.id
            });

        // 3. Redirección según tipo de usuario
        if (adminData?.is_admin) {
            // Redirigir admin a dashboard de su sede
            window.location.href = `/admin/${adminData.sede}/dashboard.html`;
            return {
                success: true,
                user: data.user,
                isAdmin: true,
                sede: adminData.sede
            };
        } else {
            // Redirigir cliente normal
            window.location.href = '/agendar.html';
            return {
                success: true,
                user: data.user,
                isAdmin: false
            };
        }

    } catch (error) {
        console.error('Error en loginUser:', error);
        return {
            success: false,
            error: error.message.includes('Invalid login credentials') 
                ? 'Credenciales incorrectas' 
                : error.message,
            code: error.code || 'LOGIN_ERROR'
        };
    }
}

/**
 * Verifica la sesión actual (para clientes y admins)
 */
export async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) return { success: false, user: null };

        // Verificar si es admin
        const { data: adminData } = await supabase
            .rpc('get_admin_data', {
                p_user_id: session.user.id
            });

        return {
            success: true,
            user: session.user,
            isAdmin: adminData?.is_admin || false,
            sede: adminData?.sede || null
        };

    } catch (error) {
        console.error('Error en checkSession:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cierra la sesión del usuario
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
 * Funciones específicas para administradores
 */
export const adminFunctions = {
    /**
     * Crea un nuevo administrador de sede
     */
    createAdmin: async (adminData) => {
        try {
            // 1. Registrar usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: adminData.email,
                password: adminData.password,
                email_confirm: true, // Auto-verificar
                user_metadata: {
                    full_name: adminData.nombre
                }
            });

            if (authError) throw authError;

            // 2. Agregar a tabla admin_users
            const { error: adminError } = await supabase
                .from('admin_users')
                .insert({
                    user_id: authData.user.id,
                    email: adminData.email,
                    nombre: adminData.nombre,
                    sede: adminData.sede,
                    created_at: new Date().toISOString()
                });

            if (adminError) throw adminError;

            return { success: true };

        } catch (error) {
            console.error('Error en createAdmin:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtiene todos los administradores (solo para super admins)
     */
    getAllAdmins: async () => {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };

        } catch (error) {
            console.error('Error en getAllAdmins:', error);
            return { success: false, error: error.message };
        }
    }
};

/**
 * Funciones para la gestión de clientes
 */
export const clientFunctions = {
    getClientProfile: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { success: true, data };

        } catch (error) {
            console.error('Error en getClientProfile:', error);
            return { success: false, error: error.message };
        }
    },

    updateClient: async (userId, updates) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .update(updates)
                .eq('id', userId)
                .select();

            if (error) throw error;
            return { success: true, data };

        } catch (error) {
            console.error('Error en updateClient:', error);
            return { success: false, error: error.message };
        }
    }
};