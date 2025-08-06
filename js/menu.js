// js/menu.js

export function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-list a');

    if (!mobileMenuToggle || !navList) return;

    mobileMenuToggle.addEventListener('click', function () {
        const isActive = navList.classList.toggle('active');
        this.classList.toggle('active');

        // Cambia el ícono a "X" si el menú está activo
        this.innerHTML = isActive
            ? '<span style="transform: rotate(45deg) translate(5px, 5px);"></span><span style="opacity: 0;"></span><span style="transform: rotate(-45deg) translate(5px, -5px);"></span>'
            : '<span></span><span></span><span></span>';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navList.classList.remove('active');
            mobileMenuToggle.innerHTML = '<span></span><span></span><span></span>';
        });
    });

    document.addEventListener('click', (e) => {
        if (!navList.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            navList.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            mobileMenuToggle.innerHTML = '<span></span><span></span><span></span>';
        }
    });
}
