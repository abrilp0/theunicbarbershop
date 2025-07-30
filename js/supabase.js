import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Configuración de Supabase
const SUPABASE_URL = 'https://dqusvawklxmxycyruwrj.supabase.co';
// ¡IMPORTANTE! Asegúrate de que esta sea tu "anon public key"
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdXN2YXdrbHhteHljeXJ1d3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MzI4NTQsImV4cCI6MjA2NzUwODg1NH0.4U_1Tx6w_Vvj-FcggAEh-LFkGmxqjcAY5CLNTcC4SZ0';

// Se crea la instancia de Supabase. NO se exporta aquí individualmente.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Manejar sesión persistente
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        // Eliminar la sesión del almacenamiento local cuando el usuario cierra sesión
        localStorage.removeItem('sb-auth-token');
    } else if (session) {
        // Guardar la sesión en el almacenamiento local
        localStorage.setItem('sb-auth-token', JSON.stringify(session));
    }
});

// 3. Intentar recuperar sesión al cargar
const savedSession = localStorage.getItem('sb-auth-token');
if (savedSession) {
    try {
        const parsedSession = JSON.parse(savedSession);
        supabase.auth.setSession(parsedSession);
    } catch (e) {
        console.error("Error al parsear la sesión guardada:", e);
        localStorage.removeItem('sb-auth-token'); // Limpiar sesión corrupta
    }
}

// 4. Obtener todos los barberos
async function getBarberos() {
    const { data, error } = await supabase
        .from('barberos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error("Error obteniendo barberos:", error);
        throw error;
    }

    return data;
}

// 5. Obtener barbero por ID
async function getBarberoById(id) {
    const { data, error } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error obteniendo barbero por ID:", error);
        throw error;
    }

    return data;
}

// Nueva función para verificar admin
async function verifyAdmin(userId, email) {
    const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)  // Buscar por user_id
        .eq('email', email)    // Y también por email para doble verificación
        .single();

    if (error || !data) {
        console.error("Error verificando admin:", error);
        return false;
    }

    return data; // Retornamos todos los datos del admin
}

export { supabase, getBarberos, getBarberoById, verifyAdmin };