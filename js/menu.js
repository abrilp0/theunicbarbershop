// js/menu.js

export function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-list a');

    if (!mobileMenuToggle || !navList) return;

    mobileMenuToggle.addEventListener('click', function () {
        this.classList.toggle('active');
        navList.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navList.classList.remove('active');
        });
    });

    // Cierra el menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!navList.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            mobileMenuToggle.classList.remove('active');
            navList.classList.remove('active');
        }
    });
}
