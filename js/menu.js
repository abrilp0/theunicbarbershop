// js/menu.js

export function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-list a');

    if (!mobileMenuToggle || !navList) return;

    mobileMenuToggle.addEventListener('click', function () {
        navList.classList.toggle('active');
        this.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!navList.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            navList.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        }
    });
}
