import { loginUser } from './auth.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { success, user, isAdmin, message, error } = await loginUser(email, password);

    if (success) {
        // Redirigir según rol
        if (isAdmin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'agendar.html';
        }
    } else {
        alert(error || 'Ocurrió un error');
    }
});
