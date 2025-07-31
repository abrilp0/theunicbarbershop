import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en Supabase Auth.
 * La inserción en la tabla 'clientes' se manejará automáticamente por un trigger de base de datos.
 */
export async function registerUser(email, password, userData) {
    try {
        // Validación local (userData.telefono es como lo envías desde el frontend)
        if (!email || !password || !userData?.nombre || !userData?.telefono) {
            throw new Error('Faltan campos obligatorios');
        }

        // Verificar duplicados en la tabla 'clientes' antes de intentar el registro en Auth.
        // Usamos 'telefono' SIN tilde para coincidir con el esquema de la DB según el error.
        const { data: existingUsers, error: checkError } = await supabase
            .from('clientes')
            .select('email, telefono') // CORRECCIÓN: 'telefono' SIN tilde
            .or(`email.eq.${email},telefono.eq.${userData.telefono}`); // CORRECCIÓN: 'telefono' SIN tilde

        if (checkError) throw checkError;

        if (existingUsers?.length > 0) {
            const emailExists = existingUsers.some(u => u.email === email);
            const phoneExists = existingUsers.some(u => u.telefono === userData.telefono); // CORRECCIÓN: 'telefono' SIN tilde

            let errorMsg = 'Error de registro';
            if (emailExists && phoneExists) {
                errorMsg = 'El email y teléfono ya están registrados';
            } else if (emailExists) {
                errorMsg = 'Este email ya está registrado';
            } else {
                errorMsg = 'Este teléfono ya está registrado';
            }
            throw new Error(errorMsg);
        }

        // Crear usuario en Supabase Auth
        // Los datos adicionales (nombre, telefono, fecha_nacimiento) se pasan al user_metadata
        const { data: { user }, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { // Estos datos se guardan en new.raw_user_meta_data en el trigger
                    nombre: userData.nombre,
                    telefono: userData.telefono, // ESTO ES CORRECTO: SE ENVÍA 'telefono' sin tilde
                    fecha_nacimiento: userData.fecha_nacimiento
                },
                emailRedirectTo: 'https://dapper-empanada-f24c14.netlify.app/login.html'
            }
        });

        if (authError) throw authError;

        // La inserción directa en 'clientes' se ha ELIMINADO de aquí.
        // La base de datos lo hará automáticamente con el trigger.

        return {
            success: true,
            user,
            message: 'Registro exitoso. Por favor verifica tu email.'
        };

    } catch (error) {
        console.error('Error en registerUser:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        };
    }
}

/**
 * Inicia sesión con email y contraseña. Detecta si es admin o cliente.
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) throw error;

if (!data.user.email_confirmed_at) {
  await supabase.auth.signOut();
  return {
    success: false,
    error: 'Debes confirmar tu correo antes de iniciar sesión.',
    code: 'EMAIL_NOT_CONFIRMED'
  };
}


        // Verificar si es admin
        const { data: admin, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (admin) {
            return {
                success: true,
                user: data.user,
                isAdmin: true,
                sede: admin.sede,
                message: 'Bienvenido administrador'
            };
        }

        // Si no es admin, es cliente. Verificar estado
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('bloqueado')
            .eq('id', data.user.id)
            .single();

        if (clienteError) throw clienteError;
        if (cliente.bloqueado) {
            await supabase.auth.signOut();
            throw new Error('Usuario suspendido. Contacta al administrador.');
        }

        return {
            success: true,
            user: data.user,
            isAdmin: false,
            message: 'Inicio de sesión exitoso'
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email o contraseña incorrectos';
        }

        return {
            success: false,
            error: errorMessage,
            code: error.code || 'AUTH_ERROR'
        };
    }
}

export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        return {
            success: true,
            message: 'Sesión cerrada correctamente'
        };
    } catch (error) {
        console.error('Error en logoutUser:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'LOGOUT_ERROR'
        };
    }
}

export async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            throw error || new Error('No hay sesión activa');
        }

        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', user.id)
            .single();

        if (clienteError) throw clienteError;
        if (cliente.bloqueado) {
            await supabase.auth.signOut();
            throw new Error('Usuario suspendido');
        }

        return {
            isAuthenticated: true,
            user: { ...user, ...cliente },
            message: 'Sesión verificada'
        };

    } catch (error) {
        console.error('Error en checkAuth:', error);
        return {
            isAuthenticated: false,
            error: error.message,
            code: error.code || 'AUTH_CHECK_ERROR'
        };
    }
}

export async function getClientProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select(`
                *,
                citas:clientes_citas(
                    id,
                    fecha,
                    hora,
                    servicio,
                    estado,
                    barberos:barbero_id(nombre)
                )
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data,
            visitas: data.visitas || 0
        };

    } catch (error) {
        console.error('Error en getClientProfile:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'PROFILE_ERROR'
        };
    }
}

export async function updateProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .update(updates)
            .eq('id', userId)
            .select();

        if (error) throw error;

        return {
            success: true,
            profile: data,
            message: 'Perfil actualizado correctamente'
        };

    } catch (error) {
        console.error('Error en updateProfile:', error);
        return {
            success: false,
            error: error.message,
            code: error.code || 'UPDATE_ERROR'
        };
    }
}

export async function checkBirthdayPromo(userId) {
    try {
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('fecha_nacimiento, visitas')
            .eq('id', userId)
            .single();

        if (clienteError) throw clienteError;

        const hoy = new Date();
        const cumple = new Date(cliente.fecha_nacimiento);
        const esCumple = hoy.getMonth() === cumple.getMonth() &&
                             hoy.getDate() === cumple.getDate();

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
                : 'Error al enviar email de recuperación',
            code: error.code || 'PASSWORD_RESET_ERROR'
        };
    }
}