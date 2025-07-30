import { supabase } from './supabase.js';  
  
export async function updateAuthUI() {  
    const { data: { user }, error } = await supabase.auth.getUser();  
    const authLink = document.getElementById('auth-link');  
    const userDropdown = document.getElementById('user-dropdown'); // Obtener el dropdown  
  
    if (!authLink || !userDropdown) return;  
  
    if (user && !error) {  
        // Usuario autenticado  
        authLink.textContent = user.user_metadata?.full_name || 'Mi Cuenta';  
        authLink.href = '#'; // Evitar que navegue a otra página  
        authLink.style.cursor = 'pointer'; // Indicar que es clickeable  
        authLink.onclick = function(event) { // Mostrar/ocultar dropdown al hacer click  
            event.preventDefault(); // Prevenir el comportamiento predeterminado del enlace  
            userDropdown.style.display = (userDropdown.style.display === 'block') ? 'none' : 'block';  
        };  
  
        // Mostrar el dropdown  
        userDropdown.style.display = 'none'; // Inicialmente oculto  
  
        // Configurar logout (asegúrate de que solo se configure una vez)  
        const cerrarSesionLink = document.getElementById('cerrarSesion');  
        if (cerrarSesionLink && !cerrarSesionLink.dataset.logoutBound) { // Verifica si ya se adjuntó el evento  
            cerrarSesionLink.addEventListener('click', async (e) => {  
                e.preventDefault();  
                const { error } = await supabase.auth.signOut();  
                if (!error) {  
                    window.location.href = 'index.html';  
                }  
            });  
            cerrarSesionLink.dataset.logoutBound = 'true'; // Marca que el evento ya se adjuntó  
        }  
  
  
    } else {  
        // Usuario no autenticado  
        authLink.textContent = 'Iniciar Sesión';  
        authLink.href = 'login.html';  
        authLink.style.cursor = 'default';  
        authLink.onclick = null; // Eliminar el onclick si existe  
        userDropdown.style.display = 'none'; // Ocultar el dropdown  
    }  
}  
  
// Actualizar UI al cargar  
document.addEventListener('DOMContentLoaded', updateAuthUI);  
  
// Actualizar cuando cambie el estado de autenticación  
supabase.auth.onAuthStateChange(() => {  
    updateAuthUI();  
});  