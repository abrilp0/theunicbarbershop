// menu.js - Código universal para todas las páginas

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userDropdown = document.getElementById('user-dropdown');
    const navLinks = document.querySelectorAll('.nav-list a:not(#user-dropdown a)');
    const authLinkContainer = document.getElementById('auth-link-container');
    
    // Crear overlay si no existe
    let navOverlay = document.querySelector('.nav-overlay');
    if (!navOverlay) {
        navOverlay = document.createElement('div');
        navOverlay.className = 'nav-overlay';
        document.body.appendChild(navOverlay);
    }
    
    // Menú Principal
    if (mobileMenuToggle && navList) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navList.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Cerrar menú usuario si está abierto
            if (userDropdown.classList.contains('mobile-visible')) {
                userDropdown.classList.remove('mobile-visible');
                userMenuToggle.classList.remove('active');
            }
        });
    }
    
    // Menú Usuario
    if (userMenuToggle && userDropdown) {
        userMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            userDropdown.classList.toggle('mobile-visible');
            
            // Cerrar menú principal si está abierto
            if (navList.classList.contains('active')) {
                navList.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                navOverlay.classList.remove('active');
            }
        });
    }
    
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!navList.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            navList.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            navOverlay.classList.remove('active');
        }
        
        if (userDropdown && !authLinkContainer.contains(e.target)) {
            userDropdown.classList.remove('mobile-visible');
            if (userMenuToggle) userMenuToggle.classList.remove('active');
        }
    });
    
    // Cerrar menús al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            navOverlay.classList.remove('active');
        });
    });
    
    // Evitar que el overlay cierre el menú usuario
    navOverlay.addEventListener('click', function() {
        navList.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        this.classList.remove('active');
    });
});