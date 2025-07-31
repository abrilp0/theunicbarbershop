import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en Supabase Auth.
 * La inserción en la tabla 'clientes' se manejará al iniciar sesión DESPUÉS de la confirmación de email.
 */
export async function registerUser(email, password, userData) {
    try {
        if (!email || !password || !userData?.nombre || !userData?.telefono) { // 'telefono' sin tilde para consistencia con frontend
            throw new Error('Faltan campos obligatorios');
        }

        // Antes de intentar registrar en Auth, podemos hacer una verificación de duplicados.
        // Asumiendo que 'telefono' en la tabla 'clientes' es SIN tilde.
        const { data: existingUsers, error: checkError } = await supabase
            .from('clientes')
            .select('email, telefono') // ASUMIMOS 'telefono' SIN TILDE en la tabla clientes
            .or(`email.eq.${email},telefono.eq.${userData.telefono}`);

        if (checkError) throw checkError;

        if (existingUsers?.length > 0) {
            const emailExists = existingUsers.some(u => u.email === email);
            const phoneExists = existingUsers.some(u => u.telefono === userData.telefono);

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

        // Crear usuario en Supabase Auth.
        // Los 'userData' adicionales se guardan en 'raw_user_meta_data'.
        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: userData.nombre,
                    telefono: userData.telefono, // 'telefono' sin tilde para el metadata
                    fecha_nacimiento: userData.fecha_nacimiento,
                    sede: userData.sede || 'brasil' // Pasa la sede si está en userData
                },
                emailRedirectTo: 'https://dapper-empanada-f24c14.netlify.app/login.html' // URL de redirección CORRECTA
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
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        };
    }
}

/**
 * Inicia sesión con email y contraseña. Detecta si es admin o cliente.
 * Se encarga de crear el cliente en la tabla 'clientes' si no existe y el email está confirmado.
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // **NUEVA LÓGICA: CREAR CLIENTE EN DB DESPUÉS DE INICIO DE SESIÓN CONFIRMADO**
        if (data.user && data.user.email_confirmed_at) { // Solo si el email está confirmado
            const { data: clienteExistente, error: clienteCheckError } = await supabase
                .from('clientes')
                .select('id, bloqueado') // 'bloqueado' para consistencia con tu esquema
                .eq('id', data.user.id)
                .single();

            if (clienteCheckError && clienteCheckError.code === 'PGRST116') { // No se encontró el cliente
                // Intenta insertar el cliente. Accede a los metadatos.
                const userMetadata = data.user.user_metadata;
                const { error: insertError } = await supabase
                    .from('clientes')
                    .insert([{
                        id: data.user.id,
                        nombre: userMetadata.nombre,
                        telefono: userMetadata.telefono, // 'telefono' sin tilde
                        email: data.user.email,
                        fecha_nacimiento: userMetadata.fecha_nacimiento,
                        sede: userMetadata.sede || 'brasil', // Usar sede del metadata o valor por defecto
                        bloqueado: false, // Por defecto al insertar
                        visitas: 0 // Por defecto al insertar
                    }]);

                if (insertError) {
                    console.error("Error al insertar cliente en login:", insertError);
                    // Puedes decidir si abortar el login o continuar con un mensaje de advertencia
                    // Por ahora, lanzamos el error
                    throw new Error("Error al crear perfil de cliente. Contacta soporte.");
                }
            } else if (clienteExistente && clienteExistente.bloqueado) { // Cliente existe y está bloqueado
                await supabase.auth.signOut();
                throw new Error('Usuario suspendido. Contacta al administrador.');
            } else if (clienteCheckError) { // Otros errores al buscar cliente
                throw clienteCheckError;
            }
        } else if (data.user && !data.user.email_confirmed_at) {
             // Si el usuario inicia sesión pero no ha confirmado el email
             await supabase.auth.signOut(); // Cierra la sesión inmediatamente
             throw new Error('Por favor, confirma tu email para iniciar sesión.');
        }

        // Verificar si es admin (esta lógica se mantiene igual)
        const { data: admin, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (adminError && adminError.code !== 'PGRST116') { // No se encontró admin, pero si hay otro error, lanzarlo
            console.error("Error al verificar admin:", adminError);
        }

        if (admin) {
            return {
                success: true,
                user: data.user,
                isAdmin: true,
                sede: admin.sede,
                message: 'Bienvenido administrador'
            };
        }

        // Si no es admin y pasó la verificación de cliente (o se creó)
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
        } else if (error.message.includes('Email not confirmed')) { // Manejar este error si Supabase lo envía
             errorMessage = 'Por favor, confirma tu email para iniciar sesión.';
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

        // Se obtiene el perfil del cliente
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', user.id)
            .single();

        if (clienteError) {
             // Si el cliente no se encuentra (PGRST116) y el email no está confirmado, podría ser un usuario sin perfil de cliente.
             // Ocurrirá si el usuario aún no ha iniciado sesión después de confirmar su email.
             console.warn("Cliente no encontrado en checkAuth, es posible que no haya iniciado sesión post-confirmación:", clienteError);
             return {
                isAuthenticated: true, // El usuario está autenticado en auth.users
                user: user, // Solo datos de auth.users, sin datos de clientes
                message: 'Sesión verificada, perfil de cliente pendiente de creación/carga.'
             };
        }
        
        if (cliente && cliente.bloqueado) { // 'bloqueado'
            await supabase.auth.signOut();
            throw new Error('Usuario suspendido');
        }

        return {
            isAuthenticated: true,
            user: { ...user, ...cliente }, // Combina user de auth con cliente de clientes
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
        // Asumo que 'updates' contendrá 'telefono' sin tilde si se actualiza.
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