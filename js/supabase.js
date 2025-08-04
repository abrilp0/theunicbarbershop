// js/supabase.js
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = 'https://dqusvawklxmxycyruwrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdXN2YXdrbHhteHljeXJ1d3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MzI4NTQsImV4cCI6MjA2NzUwODg1NH0.4U_1Tx6w_Vvj-FcggAEh-LFkGmxqjcAY5CLNTcC4SZ0'; // Reemplaza con tu clave pública

export const supabase = createClient(supabaseUrl, supabaseKey);

// Función para verificar si el usuario actual es admin
export async function isAdmin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: adminCheck } = await supabase.rpc('check_admin_status', {
  p_user_id: user.id
});


        return !error && data;
    } catch (error) {
        console.error('Error verificando admin:', error);
        return false;
    }
}

// Función para obtener la sede del admin
export async function getAdminSede() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: adminCheck } = await supabase.rpc('check_admin_status', {
  p_user_id: user.id
});


        return error ? null : data.sede;
    } catch (error) {
        console.error('Error obteniendo sede:', error);
        return null;
    }
}

// Función para verificar cumpleaños
export async function verificarCumpleanos() {
    try {
        const sede = await getAdminSede();
        if (!sede) return [];

        const hoy = new Date();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');

        const { data, error } = await supabase
            .from('clientes')
            .select('nombre, telefono, email, fecha_nacimiento')
            .eq('sede', sede)
            .like('fecha_nacimiento', `%-${mes}-${dia}`);

        return error ? [] : data;
    } catch (error) {
        console.error('Error verificando cumpleaños:', error);
        return [];
    }
}

// Función para exportar a Excel
export function exportarAExcel(datos, nombreArchivo) {
    try {
        // Crear workbook
        const wb = XLSX.utils.book_new();
        
        // Convertir datos a worksheet
        const ws = XLSX.utils.json_to_sheet(datos);
        
        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        
        // Guardar archivo
        XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
        
        return true;
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        return false;
    }
}