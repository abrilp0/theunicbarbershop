import { supabase } from './supabase.js';
// Manejo del menú hamburguesa y sesión de usuario
document.addEventListener('DOMContentLoaded', function() {
    // Menú hamburguesa
    const menuToggle = document.querySelector('.menu-toggle');
    const navList = document.querySelector('.nav-list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
        });
    }

    // Cerrar sesión
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = 'index.html';
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', async function () {
    // Elementos del DOM
    const locationSelect = document.getElementById('location');
    const barberoSelect = document.getElementById('barbero');
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const mensaje = document.getElementById('mensaje');
    const form = document.getElementById('bookingForm');
    const loader = document.getElementById('loader');
    const serviceSelect = document.getElementById('service');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const notesTextarea = document.getElementById('notes');

    // --- VERIFICACIÓN DE SESIÓN Y ESTADO DE CLIENTE ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        window.location.href = 'login.html';
        return;
    } else {
        // Mostrar opción de cerrar sesión
        const logoutLi = document.getElementById('logout-li');
        if (logoutLi) {
            logoutLi.style.display = 'block';
        }
    }
    // Precargar información del usuario y verificar estado 'bloqueado'
    let clienteData = null; // Variable para almacenar los datos del cliente logueado
    if (user) {
        try {
            const { data: cliente, error } = await supabase
                .from('clientes')
                .select('nombre, telefono, bloqueado') // ¡Solicitar el estado 'bloqueado'!
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
                throw error;
            }

            if (cliente) {
                clienteData = cliente; // Guardar datos del cliente
                nameInput.value = cliente.nombre || '';
                phoneInput.value = cliente.telefono || '';

                // === LÓGICA: VERIFICAR SI EL CLIENTE ESTÁ BLOQUEADO ===
                if (cliente.bloqueado) {
                    mostrarMensaje('Tu cuenta ha sido bloqueada. No puedes agendar citas en este momento. Por favor, contacta a la administración.', 'error');
                    form.querySelector('button[type="submit"]').disabled = true; // Deshabilitar botón de reservar
                    // Opcional: Deshabilitar todos los campos del formulario
                    Array.from(form.elements).forEach(element => {
                        element.disabled = true;
                    });
                    return; // Detener la ejecución si el cliente está bloqueado
                }
                // ==========================================================
            }
        } catch (error) {
            console.error("Error precargando datos del cliente:", error);
            mostrarMensaje('Error al cargar tus datos. Intenta nuevamente.', 'error');
        }
    }

    // --- FUNCIONES DE FECHA Y HORARIOS ---

    // Función para obtener la próxima fecha válida para agendar (mañana, excluyendo Domingos)
    function getNextValidBookingDate() {
        let nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1); // Empezar con mañana

        if (nextDay.getDay() === 0) { // Si mañana es Domingo (getDay() devuelve 0 para Domingo)
            nextDay.setDate(nextDay.getDate() + 1); // Mover al Lunes
        }
        return nextDay.toISOString().split('T')[0];
    }

    // Establecer la fecha de agendamiento fija para mañana
    const fixedBookingDate = getNextValidBookingDate();
    fechaInput.min = fixedBookingDate;
    fechaInput.max = fixedBookingDate; // Establecer el máximo igual al mínimo para fijar la fecha
    fechaInput.value = fixedBookingDate;

    // --- DATOS DE BARBEROS ---
    async function getBarberos(sede = null, filterFreeCut = false) {
        let query = supabase.from('barberos').select('id, nombre, sede, hace_corte_gratis, telefono');
        if (sede) {
            query = query.eq('sede', sede);
        }
        if (filterFreeCut) {
            query = query.eq('hace_corte_gratis', true);
        }
        query = query.order('nombre', { ascending: true });
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    const allBarberos = await getBarberos();
    const martinBarbero = allBarberos.find(b => b.nombre === "Martín");

    // --- FUNCIONES PARA CARGAR SELECTS ---
    async function updateBarberosSelect(sede, serviceValue) {
        barberoSelect.innerHTML = '<option value="">Selecciona un barbero</option>';
        barberoSelect.disabled = true;

        const filterFreeCut = serviceValue === 'Corte Cumpleaños Gratis';
        let filteredBarberos = [];

        if (serviceValue === "Corte + Barba") { // Asumo que "Corte + Barba" es el servicio de Permanente
            if (martinBarbero) {
                filteredBarberos = [martinBarbero];
                locationSelect.value = 'brasil'; // Forzar sede para Martín y este servicio
                locationSelect.disabled = true;
            } else {
                mostrarMensaje('Error: Barbero Martín no encontrado para servicio Permanente.', 'error');
                return;
            }
        } else {
            locationSelect.disabled = false; // Habilitar selección de sede para otros servicios
            if (sede) {
                filteredBarberos = await getBarberos(sede, filterFreeCut);
            } else {
                // Si no hay sede seleccionada, carga todos los barberos (o filtra por corte gratis si aplica)
                filteredBarberos = await getBarberos(null, filterFreeCut);
            }
        }

        if (filteredBarberos.length === 0) {
            const msg = filterFreeCut ? 'No hay barberos que hagan cortes gratis para esta sede.' : 'No hay barberos disponibles para esta sede.';
            mostrarMensaje(msg, 'warning');
            horaSelect.innerHTML = '<option value="">No hay horas disponibles</option>';
            return;
        }

        filteredBarberos.forEach(barbero => {
            const option = document.createElement('option');
            option.value = barbero.id;
            option.textContent = barbero.nombre;
            option.dataset.sede = barbero.sede;
            barberoSelect.appendChild(option);
        });
        barberoSelect.disabled = false;

        // Si es el servicio de "Corte + Barba", seleccionar automáticamente a Martín
        if (serviceValue === "Corte + Barba" && martinBarbero) {
            barberoSelect.value = martinBarbero.id;
        } else if (barberoSelect.dataset.currentValue) {
            barberoSelect.value = barberoSelect.dataset.currentValue;
        }
        
        mostrarMensaje('Barberos cargados. Selecciona barbero para ver horas.', 'info');
        // Vuelve a verificar la disponibilidad automáticamente después de actualizar barberos
        verificarDisponibilidad();
    }

    async function verificarDisponibilidad() {
        const barberoId = barberoSelect.value;
        const fecha = fechaInput.value; // Siempre será la fecha fija "mañana"
        const servicio = serviceSelect.value;
        const barberoSeleccionado = allBarberos.find(b => b.id === barberoId);

        horaSelect.innerHTML = '<option value="">Cargando horas...</option>';
        horaSelect.disabled = true;

        if (!barberoId || !fecha) {
            horaSelect.innerHTML = '<option value="">Selecciona barbero y fecha</option>';
            mostrarMensaje('Selecciona un barbero y una fecha para ver las horas disponibles.', 'info');
            return;
        }

        try {
            const { data: citasDelDia, error } = await supabase
                .from('citas')
                .select('hora, servicio')
                .eq('barbero_id', barberoId)
                .eq('fecha', fecha);

            if (error) throw error;

            const horasOcupadas = new Set(citasDelDia.map(c => c.hora.slice(0, 5)));
            let horasDisponibles = [];
            let isPermanenteBookedForMartinToday = false;

            if (barberoSeleccionado && barberoSeleccionado.nombre === "Martín") {
                isPermanenteBookedForMartinToday = citasDelDia.some(cita => cita.servicio === "Corte + Barba");
            }

            if (servicio === "Corte + Barba" && barberoSeleccionado && barberoSeleccionado.nombre === "Martín") {
                // Horas específicas para el servicio "Corte + Barba" (Permanente) de Martín
                const permanenteHours = ['08:30', '09:30', '10:00'];
                permanenteHours.forEach(h => {
                    if (!horasOcupadas.has(h)) {
                        horasDisponibles.push(h);
                    }
                });
                if (horasDisponibles.length === 0) {
                    mostrarMensaje(`No hay horas disponibles para Permanente con Martín el ${fecha}.`, 'warning');
                } else {
                    mostrarMensaje(`Horas disponibles para Permanente con Martín. Duración estimada 4-5 horas.`, 'info');
                }
            } else {
                // Horario normal para otros servicios: 9:30 a 18:30
                const startHour = 9;
                const endHour = 18; // Último turno comienza a las 18:30
                
                for (let h = startHour; h <= endHour; h++) {
                    const horaMin = `${h.toString().padStart(2, '0')}:30`; // Horas x:30
                    
                    // Lógica específica para Martín si tiene un "Corte + Barba" (Permanente) agendado
                    if (barberoSeleccionado && barberoSeleccionado.nombre === "Martín" && isPermanenteBookedForMartinToday) {
                        const [slotH, slotM] = horaMin.split(':').map(Number);
                        const currentSlotTimeInMinutes = slotH * 60 + slotM;
                        // Si Permanente está agendado para Martín, los otros servicios solo se pueden agendar desde las 15:00 (15*60 = 900 minutos)
                        if (currentSlotTimeInMinutes >= 900) { 
                            if (!horasOcupadas.has(horaMin)) {
                                horasDisponibles.push(horaMin);
                            }
                        }
                    } else {
                        // Para todos los demás casos, simplemente agrega la hora si no está ocupada
                        if (!horasOcupadas.has(horaMin)) {
                            horasDisponibles.push(horaMin);
                        }
                    }
                }

                horasDisponibles = horasDisponibles.sort(); // Asegura que las horas estén ordenadas

                if (barberoSeleccionado && barberoSeleccionado.nombre === "Martín" && isPermanenteBookedForMartinToday) {
                    if (horasDisponibles.length === 0) {
                        mostrarMensaje(`Martín tiene un Permanente agendado. No hay horas disponibles para otros servicios después de las 15:00 el ${fecha}.`, 'warning');
                    } else {
                        mostrarMensaje(`Martín tiene un Permanente agendado. Horas disponibles para otros servicios son a partir de las 15:00.`, 'info');
                    }
                } else {
                    mostrarMensaje('Horas disponibles cargadas. Selecciona una hora.', 'success');
                }
            }

            horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
            if (horasDisponibles.length === 0) {
                horaSelect.innerHTML = '<option value="">No hay horas disponibles para esta fecha/barbero</option>';
            }

            horasDisponibles.forEach(hora => {
                const option = document.createElement('option');
                option.value = hora;
                option.textContent = hora;
                horaSelect.appendChild(option);
            });
            horaSelect.disabled = false;
            
        } catch (err) {
            console.error("Error al buscar disponibilidad:", err);
            mostrarMensaje('Error al cargar horas disponibles. Intenta de nuevo.', 'error');
            horaSelect.innerHTML = '<option value="">Error al cargar horas</option>';
        }
    }

    // --- EVENT LISTENERS ---
    locationSelect.addEventListener('change', () => {
        const selectedSede = locationSelect.value;
        const servicio = serviceSelect.value;
        if (servicio === "Corte + Barba") return; // Si es permanente, la sede se fija por Martín
        updateBarberosSelect(selectedSede, servicio);
    });

    serviceSelect.addEventListener('change', async () => {
        const servicio = serviceSelect.value;
        const sede = locationSelect.value;
        
        barberoSelect.dataset.currentValue = barberoSelect.value; // Guarda el valor actual del barbero

        // La fecha ya está fijada al cargar la página, no es necesario ajustarla aquí.
        await updateBarberosSelect(sede, servicio);
    });

    barberoSelect.addEventListener('change', async () => {
        const barberoId = barberoSelect.value;
        const servicio = serviceSelect.value;

        if (barberoId && servicio !== "Corte + Barba") {
            const selectedOption = barberoSelect.options[barberoSelect.selectedIndex];
            locationSelect.value = selectedOption.dataset.sede;
        }
        
        // La fecha ya está fijada al cargar la página, no es necesario ajustarla aquí.
        await verificarDisponibilidad();
    });

    // Aunque la fecha esté fija, mantener este listener por si acaso se habilita un calendario en el futuro
    fechaInput.addEventListener('change', verificarDisponibilidad);

    // --- ENVÍO DEL FORMULARIO ---
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';
        loader.style.display = 'block';

        const nombre = nameInput.value.trim();
        const telefonoCliente = phoneInput.value.trim();
        const servicio = serviceSelect.value;
        const fecha = fechaInput.value;
        const hora = horaSelect.value;
        
        // --- LÓGICA DE CONVERSIÓN CRUCIAL DE LA SEDE DEL HTML A FORMATO DB ---
        const sedeRaw = locationSelect.value; // Obtiene el valor directamente del select HTML
        let sede = sedeRaw; // Inicializa la variable 'sede'

        // Convierte 'manuel-rodriguez' (hiphen) o 'manuel rodriguez' (espacio) a 'manuel_rodriguez' (underscore)
        if (sedeRaw === 'manuel-rodriguez' || sedeRaw === 'manuel rodriguez') {
            sede = 'manuel_rodriguez';
        }
        // --- FIN LÓGICA DE CONVERSIÓN ---

        const barberoId = barberoSelect.value;
        const notas = notesTextarea.value;
        const termsAccepted = document.getElementById('terms').checked;
        const policyAccepted = document.getElementById('policy').checked;

        // Validaciones generales
        if (!nombre || !telefonoCliente || !servicio || !fecha || !hora || !sede || !barberoId || !termsAccepted || !policyAccepted) {
            mostrarMensaje('Por favor, completa todos los campos requeridos y acepta los términos.', 'error');
            loader.style.display = 'none';
            return;
        }
        if (hora === '' || hora.includes('No hay horas disponibles')) {
            mostrarMensaje("Por favor, selecciona una hora válida.", "error");
            loader.style.display = 'none';
            return;
        }
        if (!sede || !barberoId) {
            mostrarMensaje("Por favor, selecciona una sede y un barbero.", "error");
            loader.style.display = 'none';
            return;
        }

        try {
            // === LÓGICA: RE-VERIFICAR SI EL CLIENTE ESTÁ BLOQUEADO (por si acaso) ===
            if (clienteData && clienteData.bloqueado) {
                mostrarMensaje('Tu cuenta ha sido bloqueada. No puedes agendar citas.', 'error');
                loader.style.display = 'none';
                return;
            }
            // =========================================================================

            // --- NUEVA LÓGICA: Controlar Citas Concurrentes por Cliente ---
            // Define cuántas citas activas puede tener un cliente
            const MAX_ACTIVE_APPOINTMENTS = 1; // Puedes cambiar este número (ej: 2, 3)

            const { data: activeAppointments, error: activeAppointmentsError } = await supabase
                .from('citas')
                .select('id, fecha, hora, barbero_id') // Incluir más detalles para el mensaje
                .eq('cliente_id', user.id)
                .in('estado', ['pendiente', 'confirmada']); // Considera estos estados como 'activos'

            if (activeAppointmentsError) {
                throw new Error(`Error al verificar citas activas del cliente: ${activeAppointmentsError.message}`);
            }

            if (activeAppointments && activeAppointments.length >= MAX_ACTIVE_APPOINTMENTS) {
                let existingCitaInfo = '';
                if (activeAppointments.length > 0) {
                    const firstActive = activeAppointments[0];
                    // Asegúrate de que 'allBarberos' esté disponible y contenga los datos de los barberos
                    const barberoActivo = allBarberos.find(b => b.id === firstActive.barbero_id)?.nombre || 'un barbero';
                    existingCitaInfo = ` Ya tienes una cita agendada para el ${firstActive.fecha} a las ${firstActive.hora} con ${barberoActivo}.`;
                }

                let message = `No puedes agendar una nueva cita. ${existingCitaInfo} Por favor, cancela tu cita actual contactando a tu barbero antes de agendar una nueva.`;
                if (MAX_ACTIVE_APPOINTMENTS > 1) {
                    message = `Ya tienes ${activeAppointments.length} citas activas. Solo puedes tener un máximo de ${MAX_ACTIVE_APPOINTMENTS} citas agendadas al mismo tiempo. Por favor, cancela alguna de tus citas actuales antes de agendar una nueva.`;
                }
                mostrarMensaje(message, 'warning');
                loader.style.display = 'none';
                return; // Detener el proceso si ya tiene una cita activa
            }
            // --- FIN NUEVA LÓGICA ---

            // === LÓGICA: PREVENIR DUPLICADOS EXACTOS (mismo día, misma hora, mismo barbero, mismo cliente) ===
            const { data: existingAppointments, error: existingAppointmentsError } = await supabase
                .from('citas')
                .select('id, estado')
                .eq('cliente_id', user.id)
                .eq('fecha', fecha)
                .eq('barbero_id', barberoId)
                .eq('hora', hora) // Verificar la hora exacta
                .in('estado', ['pendiente', 'confirmada']); // Considerar estos estados como "activos"

            if (existingAppointmentsError) {
                throw new Error(`Error al verificar citas existentes: ${existingAppointmentsError.message}`);
            }

            if (existingAppointments && existingAppointments.length > 0) {
                mostrarMensaje('Ya tienes una cita agendada para esta misma fecha y hora con este barbero. Por favor, revisa tus citas.', 'warning');
                loader.style.display = 'none';
                return; // Detener el proceso si ya existe una cita activa
            }
            // =====================================

            // 1. Insertar o actualizar el cliente en la tabla 'clientes'
            const { error: upsertClientError } = await supabase
                .from('clientes')
                .upsert({
                    id: user.id,
                    nombre: nombre,
                    telefono: telefonoCliente
                }, { onConflict: 'id' });

            if (upsertClientError) {
                throw new Error(`Error al actualizar/crear cliente: ${upsertClientError.message}`);
            }

            const esCumpleanos = (serviceSelect.options[serviceSelect.selectedIndex].textContent.includes('Corte Cumpleaños Gratis'));

            // 2. Insertar la cita en la tabla 'citas'
            const { data: cita, error: insertError } = await supabase.from('citas').insert([{
                cliente_nombre: nombre,
                cliente_telefono: telefonoCliente,
                barbero_id: barberoId,
                servicio: servicio,
                fecha,
                hora,
                sede, // <-- ¡Aquí se usa la variable 'sede' ya convertida!
                notas,
                cliente_id: user.id,
                es_cumpleanos: esCumpleanos,
                estado: 'pendiente' // Establecer estado inicial como 'pendiente'
            }]).select();

            if (insertError) {
                throw new Error(`Error al agendar cita: ${insertError.message}`);
            }

            // 3. Obtener datos del barbero para el mensaje de WhatsApp
            const { data: barbero, error: barberoError } = await supabase
                .from('barberos')
                .select('nombre, telefono')
                .eq('id', barberoId)
                .single();

            if (barberoError) throw new Error(`Error al obtener datos del barbero: ${barberoError.message}`);
            
            const telefonoBarbero = barbero.telefono.replace(/\D/g, '');
            
            let mensajeWhatsApp = `¡Hola ${barbero.nombre}! Soy ${nombre}.`;
            if (esCumpleanos) {
                mensajeWhatsApp += ` Agendé mi Corte de Cumpleaños GRATIS para el ${fecha} a las ${hora}. ¡Nos vemos pronto!`;
            } else if (servicio === "Corte + Barba") {
                mensajeWhatsApp += ` Agendé mi servicio de Permanente para el ${fecha} a las ${hora} (dura 4-5 horas). ¡Nos vemos pronto!`;
            } else {
                mensajeWhatsApp += ` Agendé mi ${servicio.toLowerCase()} para el ${fecha} a las ${hora}. ¡Nos vemos pronto!`;
            }
            mensajeWhatsApp += `\nMi teléfono: ${telefonoCliente}`;

            const whatsappUrl = `https://wa.me/56${telefonoBarbero}?text=${encodeURIComponent(mensajeWhatsApp)}`;
            
            // === MENSAJE FINAL MEJORADO ===
            mostrarMensaje('Cita agendada correctamente. Redirigiendo a WhatsApp para confirmar y notificar a tu barbero. Recuerda: si necesitas cancelar, avisa con al menos una hora de anticipación a tu barbero directamente.', 'success');
            // =============================
            loader.style.display = 'none';

            setTimeout(() => {
                window.open(whatsappUrl, '_blank');
                form.reset();
                horaSelect.innerHTML = '<option value="">Primero selecciona barbero y fecha</option>';
                barberoSelect.innerHTML = '<option value="">Selecciona un barbero</option>';
                barberoSelect.disabled = true;
                locationSelect.disabled = false;
                mostrarMensaje('');
                // Reiniciar los valores de fecha para que se vuelvan a calcular correctamente
                fechaInput.min = fixedBookingDate;
                fechaInput.value = fixedBookingDate;
                fechaInput.max = fixedBookingDate;
            }, 2000);

        } catch (error) {
            console.error('Error en el agendamiento:', error);
            mostrarMensaje(`Error al agendar: ${error.message}`, 'error');
            loader.style.display = 'none';
        }
    });

    function mostrarMensaje(msg, tipo = 'info') {
        mensaje.textContent = msg;
        mensaje.className = `mensaje ${tipo}`;
    }
    
    // --- INICIALIZACIÓN ---
    // Cargar los barberos iniciales y luego verificar la disponibilidad de horas para la fecha fija
    await updateBarberosSelect(locationSelect.value, serviceSelect.value);
    // Después de cargar barberos, la función updateBarberosSelect ya llama a verificarDisponibilidad.
    // Solo necesitamos asegurarnos de que se ejecute al inicio.
});