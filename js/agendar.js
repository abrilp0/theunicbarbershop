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

let currentUserId = null;
let isAuthenticated = false;
let barberosDisponibles = []; // Para almacenar los barberos cargados

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Configuración del menú hamburguesa
    setupMobileMenu();

    // 2. Verificar la sesión del cliente al cargar la página
    await setupUserSession();

    // 3. Configurar el cierre de sesión
    setupLogout();

    // 4. Configurar los eventos del formulario
    setupFormEvents();

    // 5. Lógica para fijar la fecha al día siguiente hábil
    const fixedBookingDate = getNextValidBookingDate();
    fechaInput.min = fixedBookingDate;
    fechaInput.max = fixedBookingDate;
    fechaInput.value = fixedBookingDate;

    // 6. Cargar todos los barberos una sola vez
    await loadAllBarberos();
    
    // 7. Llenar los select iniciales
    await updateBarberosSelect();
    await verificarDisponibilidad();
});

/**
 * Configura el menú hamburguesa para móviles.
 */
function setupMobileMenu() {
    if (mobileMenuToggle && navList) {
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navList.classList.toggle('active');
        });
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                navList.classList.remove('active');
            });
        });
    }
}

/**
 * Configura la visualización de la sesión del usuario.
 * Si no hay sesión, redirige al usuario a la página de login.
 * Si hay sesión, carga los datos del cliente.
 */
async function setupUserSession() {
    // Reemplazamos checkAuth por getSession para evitar dependencias circulares
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
        console.warn('No hay sesión activa para el cliente. Redirigiendo a login.html');
        // Redirección robusta para evitar bucles
        if (window.location.pathname !== '/login.html') {
             window.location.replace('login.html');
        }
        return;
    }

    isAuthenticated = true;
    currentUserId = session.user.id;

    authLink.style.display = 'none';
    userDropdown.style.display = 'flex';
    userNameSpan.textContent = session.user.user_metadata?.full_name || session.user.email;

    // Lógica para mostrar/ocultar el dropdown al hacer clic en el nombre
    userNameSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdownContent = cerrarSesionBtn.parentElement;
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Cerrar el dropdown si se hace clic fuera de él
    document.addEventListener('click', (e) => {
        const dropdownContent = cerrarSesionBtn.parentElement;
        if (!userDropdown.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    try {
        let { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (clienteError && clienteError.code === 'PGRST116') {
            console.warn('Perfil de cliente no encontrado. Creando nuevo perfil.');
            const { error: insertError } = await supabase
                .from('clientes')
                .insert({ 
                    id: currentUserId,
                    nombre: session.user.user_metadata?.full_name || session.user.email,
                    email: session.user.email,
                    telefono: '',
                });
            
            if (insertError) throw insertError;
            
            const { data: newCliente, error: newClienteError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (newClienteError) throw newClienteError;
            cliente = newCliente;
        } else if (clienteError) {
            throw clienteError;
        }

        if (cliente) {
            if (cliente.bloqueado) {
                mostrarMensaje('Tu cuenta ha sido bloqueada. No puedes agendar citas en este momento.', 'error');
                bookingBtn.disabled = true;
                Array.from(form.elements).forEach(element => element.disabled = true);
                return;
            }
            nameInput.value = cliente.nombre;
            phoneInput.value = cliente.telefono;
            nameInput.disabled = true;
            phoneInput.disabled = true;
        }
    } catch (e) {
        console.error('Error al cargar/crear datos del cliente:', e.message);
        mostrarMensaje(`Error al cargar datos de usuario: ${e.message}`, 'error');
    }
}

/**
 * Configura el cierre de sesión.
 */
function setupLogout() {
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
            window.location.href = 'index.html';
        });
    }
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

    // Habilitar por defecto
    locationSelect.disabled = false;
    barberoSelect.disabled = false;

    // Si el servicio es Permanente, forzar sede Brasil
    if (selectedService === 'Permanente') {
        locationSelect.value = 'brasil';
        locationSelect.disabled = true;

        // Forzar que el cambio de value se aplique al DOM antes de continuar
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Actualiza barberos en base a la sede y servicio seleccionados
    await updateBarberosSelect();

    // Verifica disponibilidad de horas para el barbero/servicio actual
    await verificarDisponibilidad();
}



/**
 * Función para obtener la próxima fecha válida para agendar (excluyendo Sábados y Domingos).
 */
function getNextValidBookingDate() {
    let nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    
    let dayOfWeek = nextDay.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

    if (dayOfWeek === 0) {
        nextDay.setDate(nextDay.getDate() + 1);
    } else if (dayOfWeek === 6) {
        nextDay.setDate(nextDay.getDate() + 2);
    }
    
    return nextDay.toISOString().split('T')[0];
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

    // Normaliza el filtro de sede
    let barberosFiltrados = barberosDisponibles.filter(barbero =>
        barbero.sede?.trim().toLowerCase() === sede.trim().toLowerCase()
    );

    // Filtro adicional para "Corte Cumpleaños Gratis"
    if (servicio === 'Corte Cumpleaños Gratis') {
        barberosFiltrados = barberosFiltrados.filter(barbero => barbero.hace_corte_gratis);
    }

    // Generar opciones del select
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

    // 👉 Lógica especial para el servicio "Permanente"
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
        
        const isMartin = barberosDisponibles.find(b => b.id === barberoId && b.nombre === 'Martin');
        const hasPermanentBooking = isMartin && citasExistentes.some(cita => cita.servicio === 'Permanente');

        if (servicio === 'Permanente') {
            horasBase = ['08:30:00', '09:30:00', '10:30:00'];
        } else if (hasPermanentBooking) {
            // Horas para otros clientes de Martín si ya tiene una cita de Permanente
            horasBase = generarHorasDisponiblesDesde(16, 30);
        } else {
            // Horas normales para todos los demás casos
            horasBase = generarHorasDisponiblesDesde(9, 30);
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

    if (!isAuthenticated) {
        mostrarMensaje('Debes iniciar sesión para agendar una cita.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Primero, consultar si el usuario ya tiene una cita activa o futura
    try {
        const { data: existingAppointments, error: fetchError } = await supabase
            .from('citas')
            .select('*')
            .eq('cliente_id', currentUserId)
            .gte('fecha', new Date().toISOString().split('T')[0]) // citas desde hoy en adelante
            .limit(1);

        if (fetchError) throw fetchError;

        if (existingAppointments && existingAppointments.length > 0) {
            const existingBarberoId = existingAppointments[0].barbero_id;
            // Obtener nombre del barbero para mostrar en mensaje
            const { data: barberoData, error: barberoError } = await supabase
                .from('barberos')
                .select('nombre')
                .eq('id', existingBarberoId)
                .single();
            const barberoName = barberoError ? 'el barbero' : barberoData.nombre;

            mostrarMensaje(`Ya tienes una cita agendada con ${barberoName}. Si deseas agendar otra, primero debes cancelar la cita actual.`, 'error');
            loader.style.display = 'none';
            return; // detener proceso de agendamiento
        }
    } catch (error) {
        console.error('Error verificando citas existentes:', error);
        mostrarMensaje('Error al verificar citas previas. Intenta nuevamente.', 'error');
        loader.style.display = 'none';
        return;
    }

    // Continúa con la actualización del perfil y creación de cita
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

        const barberoName = barberoSelect.options[barberoSelect.selectedIndex].text;
        const sedeName = locationSelect.options[locationSelect.selectedIndex].text;
        const selectedDate = new Date(fechaInput.value).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const selectedTime = horaSelect.value.substring(0, 5);

        // Traer teléfono del barbero
        const { data: barberoData, error: barberoError } = await supabase
            .from('barberos')
            .select('telefono')
            .eq('id', barberoSelect.value)
            .single();

        if (barberoError) throw barberoError;

        const barberoPhone = barberoData.telefono;

        // Usar el nombre del cliente ingresado para el mensaje
        const whatsappMessage = `¡Hola, ${barberoName}! Soy ${nameInput.value}. He agendado una cita contigo en la sede ${sedeName} para el día ${selectedDate} a las ${selectedTime}. El servicio es "${serviceSelect.value}". ¡Nos vemos!`;
        const whatsappUrl = `https://wa.me/+56${barberoPhone}?text=${encodeURIComponent(whatsappMessage)}`;
        // Crear un formulario oculto para redirigir sin bloqueos (compatible con iOS/Safari)
        const formRedirect = document.createElement('form');
        formRedirect.method = 'GET';
        formRedirect.action = whatsappUrl;
        formRedirect.style.display = 'none';
        document.body.appendChild(formRedirect);
        formRedirect.submit();

// Redirigir inmediatamente (esto evita bloqueo en móviles)
//window.location.href = whatsappUrl;

// Luego limpiar el formulario silenciosamente
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
