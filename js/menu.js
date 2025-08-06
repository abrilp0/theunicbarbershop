// js/menu.js
export function setupMobileMenu() {
    // Elementos del menú principal
    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const navOverlay = document.createElement('div');
    navOverlay.className = 'menu-overlay';
    document.body.appendChild(navOverlay);

    // Elementos del menú usuario
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    // Menú principal
    if (mobileMenuBtn && navList) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navList.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Cerrar menú usuario si está abierto
            if (userDropdown?.classList.contains('active')) {
                userDropdown.classList.remove('active');
                userMenuBtn?.classList.remove('active');
            }
        });
    }

    // Menú usuario (si existe)
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            userDropdown.classList.toggle('active');
        });
    }

    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!navList?.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
            navList?.classList.remove('active');
            mobileMenuBtn?.classList.remove('active');
            navOverlay.classList.remove('active');
        }
        
        if (userDropdown && !e.target.closest('#user-menu-container')) {
            userDropdown.classList.remove('active');
            userMenuBtn?.classList.remove('active');
        }
    });

    // Cerrar menús al hacer clic en overlay
    navOverlay.addEventListener('click', function() {
        navList?.classList.remove('active');
        mobileMenuBtn?.classList.remove('active');
        userDropdown?.classList.remove('active');
        userMenuBtn?.classList.remove('active');
        this.classList.remove('active');
    });

    // Cerrar menú al hacer clic en enlaces
    document.querySelectorAll('.nav-list a').forEach(link => {
        link.addEventListener('click', () => {
            navList?.classList.remove('active');
            mobileMenuBtn?.classList.remove('active');
            navOverlay.classList.remove('active');
        });
    });
}