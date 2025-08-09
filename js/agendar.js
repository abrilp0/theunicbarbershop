// js/agendar.js
import { supabase } from './supabase.js';
import { logoutUser } from './auth.js';

// Elementos del DOM
const form = document.getElementById('bookingForm');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const serviceSelect = document.getElementById('service');
const fechaInput = document.getElementById('fecha');
const horaSelect = document.getElementById('hora');
const locationSelect = document.getElementById('location');
const barberoSelect = document.getElementById('barbero');
const notesInput = document.getElementById('notes');
const loader = document.getElementById('loader');
const mensaje = document.getElementById('mensaje');
const cerrarSesionBtn = document.getElementById('cerrarSesion');
const authLink = document.getElementById('auth-link');
const userDropdown = document.getElementById('user-dropdown');
const userNameSpan = document.getElementById('user-name');
const mobileMenuToggle = document.getElementById('mobile-menu');
const navList = document.querySelector('.nav-list');
const navLinks = document.querySelectorAll('.nav-list a');
const bookingBtn = form.querySelector('button[type="submit"]');
const userMenuToggle = document.getElementById('user-menu-toggle');

let currentUserId = null;
let isAuthenticated = false;
let barberosDisponibles = [];
let clienteData = null; // Para almacenar los datos del cliente

document.addEventListener('DOMContentLoaded', async function () {
    setupMobileMenu();
    setupUserMenu();
    await setupUserSession();
    setupLogout();
    setupFormEvents();

    const fixedBookingDate = getNextValidBookingDate();

    flatpickr("#fecha", {
        defaultDate: fixedBookingDate,
        minDate: fixedBookingDate,
        maxDate: fixedBookingDate,
        dateFormat: "Y-m-d",
        disableMobile: true,
        disable: [
            function (date) {
                return date.getDay() === 0; // Deshabilita solo los domingos
            }
        ],
        locale: {
            firstDayOfWeek: 1
        }
    });

    await loadAllBarberos();
    await updateBarberosSelect();
    await verificarDisponibilidad();
});

function setupMobileMenu() {
    if (mobileMenuToggle && navList) {
        mobileMenuToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            navList.classList.toggle('active');

            if (userDropdown.classList.contains('mobile-visible')) {
                userDropdown.classList.remove('mobile-visible');
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                navList.classList.remove('active');
            });
        });
    }
}

function setupUserMenu() {
    if (!userMenuToggle && userDropdown) {
        const menuToggle = document.createElement('button');
        menuToggle.id = 'user-menu-toggle';
        menuToggle.className = 'user-menu-toggle mobile-only';
        menuToggle.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        if (userNameSpan) {
            userNameSpan.parentNode.insertBefore(menuToggle, userNameSpan.nextSibling);

            menuToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                userDropdown.classList.toggle('mobile-visible');

                if (navList.classList.contains('active')) {
                    mobileMenuToggle.classList.remove('active');
                    navList.classList.remove('active');
                }
            });
        }
    }

    document.addEventListener('click', function (e) {
        if (!userDropdown.contains(e.target) && !userMenuToggle?.contains(e.target)) {
            userDropdown.classList.remove('mobile-visible');
        }
    });
}

async function setupUserSession() {
    console.log('[SESSION] Iniciando verificación de sesión...');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[SESSION] Resultado:', session, sessionError);

    if (sessionError || !session) {
        console.warn('[SESSION] No hay sesión activa. Redirigiendo a login.html');
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.replace('login.html');
        }
        return;
    }

    isAuthenticated = true;
    currentUserId = session.user.id;

    if (userDropdown && userNameSpan) {
        userDropdown.classList.remove('hidden');
        userDropdown.style.display = 'flex';
        userDropdown.style.visibility = 'visible';

        if (authLink) authLink.classList.add('hidden');

        const fullName = session.user.user_metadata?.full_name || session.user.email;
        userNameSpan.textContent = fullName;
        console.log('[UI] Mostrando nombre:', fullName);
    }

    try {
        let { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (clienteError && clienteError.code === 'PGRST116') {
            console.warn('Perfil no encontrado. Creando...');
            const { error: insertError } = await supabase
                .from('clientes')
                .insert({
                    id: currentUserId,
                    nombre: session.user.user_metadata?.full_name || session.user.email,
                    email: session.user.email,
                    telefono: '',
                });
            if (insertError) throw insertError;

            ({ data: cliente } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', currentUserId)
                .single());
        } else if (clienteError) {
            throw clienteError;
        }

        if (cliente?.bloqueado) {
            mostrarMensaje('Tu cuenta ha sido bloqueada. No puedes agendar citas.', 'error');
            bookingBtn.disabled = true;
            Array.from(form.elements).forEach(el => el.disabled = true);
            return;
        }

        if (cliente && nameInput && phoneInput) {
            nameInput.value = cliente.nombre;
            phoneInput.value = cliente.telefono;
            nameInput.disabled = true;
            phoneInput.disabled = true;
            clienteData = cliente; // Guardar los datos del cliente
        }

    } catch (e) {
        console.error('Error al cargar datos del cliente:', e.message);
        mostrarMensaje(`Error al cargar datos de usuario: ${e.message}`, 'error');
    }
}

function setupLogout() {
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error al cerrar sesión:', error.message);
                return;
            }
            window.location.href = 'index.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupUserSession();
    setupLogout();
});

// Lógica de fecha corregida
function getNextValidBookingDate() {
    let today = new Date();
    let nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    // Si es viernes o sábado, ajusta para el lunes
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Viernes (5) o Sábado (6)
        nextDay.setDate(today.getDate() + (8 - dayOfWeek));
    }
    // Si hoy es jueves, nextDay es viernes, lo que está bien.
    // Si hoy es viernes, nextDay es sábado.
    // Si hoy es sábado, nextDay es domingo. La lógica anterior fallaba aquí.
    // Con el nuevo ajuste, si es viernes (5), suma 3 días (8-5) para llegar al lunes.
    // Si es sábado (6), suma 2 días (8-6) para llegar al lunes.
    // Si es domingo (0), nextDay es lunes, lo que está bien.
    if (nextDay.getDay() === 0) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    return nextDay.toISOString().split('T')[0];
}

/**
 * Configura los eventos del formulario.
 */
function setupFormEvents() {
    locationSelect.addEventListener('change', async () => {
        await updateBarberosSelect();
        await verificarDisponibilidad();
    });

    serviceSelect.addEventListener('change', async () => {
        await handleServiceChange();
    });

    fechaInput.addEventListener('change', async () => {
        await verificarDisponibilidad();
    });

    barberoSelect.addEventListener('change', async () => {
        await verificarDisponibilidad();
    });

    form.addEventListener('submit', handleBookingSubmit);
}

/**
 * Carga todos los barberos desde la base de datos.
 */
async function loadAllBarberos() {
    try {
        const { data, error } = await supabase
            .from('barberos')
            .select('*');

        if (error) throw error;
        barberosDisponibles = data;
    } catch (error) {
        console.error('Error al cargar todos los barberos:', error);
        mostrarMensaje('Error al cargar los barberos. Por favor, intenta de nuevo.', 'error');
    }
}

/**
 * Maneja los cambios en la selección de servicios especiales.
 */
async function handleServiceChange() {
    console.log('[DEBUG] Servicio seleccionado:', serviceSelect.value);

    const selectedService = serviceSelect.value;

    locationSelect.disabled = false;
    barberoSelect.disabled = false;

    if (selectedService === 'Permanente') {
        locationSelect.value = 'brasil';
        locationSelect.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 0));
    }

    await updateBarberosSelect();
    await verificarDisponibilidad();
}

/**
 * Actualiza el select de barberos.
 */
async function updateBarberosSelect() {
    const sede = locationSelect.value;
    const servicio = serviceSelect.value;

    barberoSelect.disabled = false;

    if (!sede) {
        barberoSelect.innerHTML = '<option value="">Selecciona una sede primero</option>';
        barberoSelect.disabled = true;
        return;
    }

    let barberosFiltrados = barberosDisponibles.filter(barbero =>
        barbero.sede?.trim().toLowerCase() === sede.trim().toLowerCase()
    );

    if (servicio === 'Corte Cumpleaños Gratis') {
        barberosFiltrados = barberosFiltrados.filter(barbero => barbero.hace_corte_gratis);
    }

    let optionsHtml = '<option value="">Selecciona un barbero</option>';
    if (barberosFiltrados.length > 0) {
        barberosFiltrados.forEach(barbero => {
            optionsHtml += `<option value="${barbero.id}">${barbero.nombre}</option>`;
        });
    } else {
        optionsHtml = '<option value="">No hay barberos disponibles para esta sede</option>';
        barberoSelect.disabled = true;
    }
    barberoSelect.innerHTML = optionsHtml;

    if (servicio === 'Permanente') {
        const martin = barberosFiltrados.find(barbero =>
            barbero.nombre?.trim().toLowerCase() === 'martin' &&
            barbero.sede?.trim().toLowerCase() === 'brasil'
        );

        if (martin) {
            barberoSelect.value = martin.id;
            barberoSelect.disabled = true;
        } else {
            mostrarMensaje('No se encontró al barbero Martín para este servicio.', 'error');
            barberoSelect.innerHTML = '<option value="">Martín no está disponible</option>';
            barberoSelect.disabled = true;
        }
    }
}

/**
 * Verifica la disponibilidad de horas para una fecha y barbero específicos.
 */
async function verificarDisponibilidad() {
    const barberoId = barberoSelect.value;
    const fecha = fechaInput.value;
    const servicio = serviceSelect.value;

    if (!barberoId || !fecha) {
        horaSelect.innerHTML = '<option value="">Selecciona barbero y fecha</option>';
        return;
    }

    try {
        const { data: citasExistentes, error } = await supabase
            .from('citas')
            .select('hora, servicio')
            .eq('barbero_id', barberoId)
            .eq('fecha', fecha);

        if (error) throw error;

        const horasOcupadas = citasExistentes.map(c => c.hora);

        let horasBase;
        
        const isMartin = barberosDisponibles.find(b => b.id === parseInt(barberoId) && b.nombre === 'Martin');
        const hasPermanentBooking = isMartin && citasExistentes.some(cita => cita.servicio === 'Permanente');

        if (servicio === 'Permanente') {
            horasBase = ['08:30:00'];
        } else if (hasPermanentBooking) {
            horasBase = generarHorasDisponiblesDesde(14, 30);
        } else {
            horasBase = generarHorasDisponiblesDesde(8, 30);
        }

        const horasDisponibles = horasBase.filter(hora => !horasOcupadas.includes(hora));

        let optionsHtml = '<option value="">Selecciona una hora</option>';
        if (horasDisponibles.length > 0) {
            horasDisponibles.forEach(hora => {
                optionsHtml += `<option value="${hora}">${hora.substring(0, 5)}</option>`;
            });
            horaSelect.disabled = false;
        } else {
            optionsHtml = '<option value="">No hay horas disponibles</option>';
            horaSelect.disabled = true;
        }
        horaSelect.innerHTML = optionsHtml;

    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        mostrarMensaje('Error al verificar la disponibilidad de horas.', 'error');
        horaSelect.innerHTML = '<option value="">Error al cargar horas</option>';
    }
}

/**
 * Genera un array de horas disponibles.
 */
function generarHorasDisponiblesDesde(startHour, startMinute) {
    const horas = [];
    const inicio = startHour * 60 + startMinute;
    const fin = 18 * 60 + 30;

    for (let i = inicio; i <= fin; i += 60) {
        const h = Math.floor(i / 60).toString().padStart(2, '0');
        const m = (i % 60).toString().padStart(2, '0');
        horas.push(`${h}:${m}:00`);
    }
    return horas;
}

/**
 * Maneja el envío del formulario de agendamiento.
 */
async function handleBookingSubmit(event) {
    event.preventDefault();

    const selectedDate = fechaInput.value;
    const fixedBookingDate = getNextValidBookingDate();

    if (selectedDate !== fixedBookingDate) {
        mostrarMensaje(`Solo puedes agendar para el día: ${fixedBookingDate}`, 'error');
        return;
    }

    if (!isAuthenticated) {
        mostrarMensaje('Debes iniciar sesión para agendar una cita.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    try {
        const { data: existingAppointments, error: fetchError } = await supabase
            .from('citas')
            .select('*')
            .eq('cliente_id', currentUserId)
            .gte('fecha', new Date().toISOString().split('T')[0])
            .limit(1);

        if (fetchError) throw fetchError;

        if (existingAppointments && existingAppointments.length > 0) {
            const existingBarberoId = existingAppointments[0].barbero_id;
            const barberoData = barberosDisponibles.find(b => b.id === existingBarberoId);
            const barberoName = barberoData ? barberoData.nombre : 'el barbero';

            mostrarMensaje(`Ya tienes una cita agendada con ${barberoName}. Si deseas agendar otra, primero debes cancelar la cita actual.`, 'error');
            loader.style.display = 'none';
            return;
        }
    } catch (error) {
        console.error('Error verificando citas existentes:', error);
        mostrarMensaje('Error al verificar citas previas. Intenta nuevamente.', 'error');
        loader.style.display = 'none';
        return;
    }

    try {
        const { error: updateError } = await supabase
            .from('clientes')
            .update({
                nombre: nameInput.value,
                telefono: phoneInput.value,
            })
            .eq('id', currentUserId);

        if (updateError) {
            throw updateError;
        }
    } catch (updateError) {
        console.error('Error al actualizar el perfil del cliente:', updateError);
        mostrarMensaje(`Error al actualizar tu perfil: ${updateError.message}`, 'error');
        return;
    }

    const newAppointment = {
        cliente_id: currentUserId,
        barbero_id: barberoSelect.value,
        fecha: fechaInput.value,
        hora: horaSelect.value,
        servicio: serviceSelect.value,
        sede: locationSelect.value,
        notas: notesInput.value,
    };

    loader.style.display = 'block';
    mostrarMensaje('Agendando tu cita...', 'info');

    try {
        const { error } = await supabase.from('citas').insert([newAppointment]);

        if (error) {
            throw error;
        }

        mostrarMensaje('¡Cita agendada con éxito! Redirigiendo a WhatsApp...', 'success');

        const barberoData = barberosDisponibles.find(b => b.id.toString() === barberoSelect.value);
        if (!barberoData) throw new Error("Barbero no encontrado en la lista local.");

        const barberoName = barberoData.nombre;
        const barberoPhone = barberoData.telefono;

        const dateObj = new Date(fechaInput.value + 'T00:00:00');
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const dayOfWeek = dayNames[dateObj.getDay()];
        const selectedDateFormatted = dateObj.toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const selectedTime = horaSelect.value.substring(0, 5);
        const customerName = nameInput.value;

        const whatsappMessage = `Hola ${barberoName}, tienes una cita para un ${serviceSelect.value} para el ${dayOfWeek} ${selectedDateFormatted} a las ${selectedTime} con ${customerName}.`;

        const whatsappUrl = `https://wa.me/56${barberoPhone}?text=${encodeURIComponent(whatsappMessage)}`;

        // Detectar iOS para evitar bloqueo popup
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            // Redirigir en iOS para evitar bloqueo
            window.location.href = whatsappUrl;
        } else {
            // Abrir en nueva ventana en desktop y otros navegadores
            window.open(whatsappUrl, '_blank');
        }

        setTimeout(() => {
            form.reset();
            loader.style.display = 'none';
            setupUserSession();
            updateBarberosSelect();
        }, 3000);

    } catch (error) {
        console.error('Error en el agendamiento:', error);
        mostrarMensaje(`Error al agendar: ${error.message}`, 'error');
        loader.style.display = 'none';
    }
}


function mostrarMensaje(msg, tipo = 'info') {
    if (!mensaje) return;
    mensaje.textContent = msg;
    mensaje.className = `mensaje ${tipo}`;
}