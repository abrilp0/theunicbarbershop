// js/menu.js

export function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const navOverlay = document.querySelector('.nav-overlay');
    const navLinks = document.querySelectorAll('.nav-list a:not(#user-dropdown a)');

    // Menú principal
    if (mobileMenuBtn && navList) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navList.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Cerrar menú usuario si está abierto
            if (userDropdown.classList.contains('active')) {
                userDropdown.classList.remove('active');
                userMenuBtn.classList.remove('active');
            }
        });
    }

    // Menú usuario
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            userDropdown.classList.toggle('active');
        });
    }

    // Cerrar menús al hacer clic en enlaces
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
            mobileMenuBtn?.classList.remove('active');
            navOverlay.classList.remove('active');
        });
    });

    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', function(e) {
        // Menú principal
        if (!navList.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
            navList.classList.remove('active');
            mobileMenuBtn?.classList.remove('active');
            navOverlay.classList.remove('active');
        }
        
        // Menú usuario
        if (userDropdown && !e.target.closest('#user-menu-container')) {
            userDropdown.classList.remove('active');
            userMenuBtn?.classList.remove('active');
        }
    });

    // Cerrar menús al hacer clic en overlay
    navOverlay.addEventListener('click', function() {
        navList.classList.remove('active');
        mobileMenuBtn?.classList.remove('active');
        userDropdown.classList.remove('active');
        userMenuBtn?.classList.remove('active');
        this.classList.remove('active');
    });

    // Actualizar nombre de usuario si está logueado
    async function updateUserMenu() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                document.getElementById('auth-link').style.display = 'none';
                const userName = user.user_metadata?.full_name || user.email;
                document.getElementById('user-name-mobile').textContent = userName;
                document.getElementById('user-menu-content').style.display = 'flex';
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
        }
    }

    // Inicializar menú de usuario si Supabase está disponible
    if (typeof supabase !== 'undefined') {
        updateUserMenu();
    }
}