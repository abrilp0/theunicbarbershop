import { supabase } from './supabase.js';

// Elementos del DOM
const clientesList = document.getElementById('clientesList');
const citasList = document.getElementById('citasList');
const promocionesList = document.getElementById('promocionesList');
const cumpleanosList = document.getElementById('cumpleanosList');
const searchInput = document.getElementById('searchInput');
const crearPromoBtn = document.getElementById('crearPromoBtn');
const logoutBtn = document.getElementById('logout-btn');
const adminSede = document.getElementById('admin-sede');
const adminEmail = document.getElementById('admin-email');
const sedeName = document.getElementById('sede-name');
// CORRECCIÓN: Aquí se busca el ID 'notificationSound', no una ruta.
const notificationSound = document.getElementById('notificationSound'); 
const birthdaySound = document.getElementById('birthdaySound');

// Elementos del DOM para la exportación a Excel
const exportFechaInicioInput = document.getElementById('exportFechaInicio');
const exportFechaFinInput = document.getElementById('exportFechaFin');
const exportCitasBtn = document.getElementById('exportCitasBtn'); // ID del botón de exportación

const cumpleanosBookingModal = document.getElementById('cumpleanosBookingModal');
const cumpleanosClienteNombre = document.getElementById('cumpleanosClienteNombre');
const cumpleanosClienteSede = document.getElementById('cumpleanosClienteSede');
const cumpleanosBarberoSelect = document.getElementById('cumpleanosBarberoSelect');
const cumpleanosFechaInput = document.getElementById('cumpleanosFechaInput');
const cumpleanosHoraSelect = document.getElementById('cumpleanosHoraSelect');

// Variables globales
let currentUser = null;
let currentSede = null;
let currentCumpleanosCliente = null; // Para almacenar el cliente seleccionado para agendar

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Manejar clics/touch en botones
    document.querySelectorAll('.btn, a').forEach(element => {
        element.addEventListener('touchstart', function() {
            this.classList.add('active');
        });
        
        element.addEventListener('touchend', function() {
            this.classList.remove('active');
        });
    });
    
    // Evitar zoom no deseado en inputs
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.fontSize = '16px'; // Forzar tamaño de fuente para evitar zoom
        }, { passive: false });
    });
});

    // 🔊 Desbloquear reproducción automática de sonidos en navegadores
    document.body.addEventListener('click', () => {
        try {
            notificationSound.play().then(() => {
                notificationSound.pause();
                notificationSound.currentTime = 0;
                console.log('🔊 Autoplay desbloqueado para notificationSound');
            });
        } catch (e) {
            console.warn('⚠️ No se pudo desbloquear autoplay:', e);
        }
    }, { once: true });    
    await checkSession();
    // Llamar setupRealTimeUpdates después de que currentSede esté definido por checkSession
    setupRealTimeUpdates(); 
    await loadClientes();
    await loadCitas();
    await loadPromociones();
    await checkCumpleanos();

    // Configurar búsqueda
    searchInput.addEventListener('input', handleSearch);

    // Configurar logout
    logoutBtn.addEventListener('click', handleLogout);

    // Configurar creación de promoción
    crearPromoBtn.addEventListener('click', crearPromocion);

    // Configurar exportación a Excel
    if (exportCitasBtn) {
        exportCitasBtn.addEventListener('click', exportarCitasAExcel);
    }

    // Event listener para acciones de citas (cancelar)
    citasList.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('action-btn') && target.dataset.id) {
            const citaId = target.dataset.id;
            const status = target.dataset.status;
            if (status === 'cancelada') {
                await updateCitaStatus(citaId, status);
            }
        }
    });

    // Event listeners para el modal de cumpleaños
    cumpleanosFechaInput.addEventListener('change', loadAvailableTimesForBirthdayBooking);
    cumpleanosBarberoSelect.addEventListener('change', loadAvailableTimesForBirthdayBooking);


// Funciones auxiliares globales (para ser accesibles desde el HTML)
window.toggleClienteBlock = toggleClienteBlock;
window.eliminarPromocion = eliminarPromocion;
window.openCumpleanosBookingModal = openCumpleanosBookingModal;
window.closeCumpleanosBookingModal = closeCumpleanosBookingModal;
window.confirmCumpleanosBooking = confirmCumpleanosBooking;
window.liberarHora = liberarHora; // Asegurarse de que esta función también sea global


// Verificar sesión
async function checkSession() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log("Usuario actual:", user);

        if (error || !user) {
            window.location.href = 'login-admin.html';
            return;
        }

        currentUser = user;
        adminEmail.textContent = user.email;

        // Obtener datos del admin (usando la tabla admin_users)
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', user.id)
            .single();

        console.log("Datos de admin:", adminData);

        if (adminError || !adminData) {
            showNotification('No tienes permisos de administrador', 'error');
            setTimeout(() => window.location.href = 'login-admin.html', 2000);
            return;
        }

        currentSede = adminData.sede;
        adminSede.textContent = `Sede: ${formatSedeName(adminData.sede)}`;
        sedeName.textContent = `Sede ${formatSedeName(adminData.sede)}`;

        document.getElementById('promo-sede').value = currentSede;
        
        // Establecer las fechas por defecto para la exportación: hoy como inicio y un mes después como fin
        const today = new Date();
        exportFechaInicioInput.value = today.toISOString().split('T')[0];
        const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        exportFechaFinInput.value = oneMonthLater.toISOString().split('T')[0];


        // Mostrar nombre del admin si está disponible
        if (adminData.nombre) {
            document.querySelector('.admin-info').insertAdjacentHTML('afterbegin',
                `<span>${adminData.nombre}</span>`);
        }
    } catch (error) {
        console.error("Error en checkSession:", error);
        showNotification('Error al verificar sesión', 'error');
        window.location.href = 'login-admin.html';
    }
}

// Formatear nombre de sede
function formatSedeName(sede) {
    return sede === 'brasil' ? 'Brasil' : 'Manuel Rodríguez';
}

// Formatear fecha (función auxiliar)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Función para liberar hora (eliminar cita)
async function liberarHora(citaId) {
    if (!confirm('¿Estás seguro de que quieres liberar esta hora? Esto eliminará la cita.')) {
        return;
    }
    try {
        const { error } = await supabase
            .from('citas')
            .delete()
            .eq('id', citaId);

        if (error) throw error;

        showNotification('Hora liberada correctamente', 'success');
        await loadCitas(); // Recargar la lista de citas para reflejar el cambio
    } catch (error) {
        console.error("Error al liberar la hora:", error);
        showNotification('Error al liberar la hora', 'error');
    }
}

// Cargar clientes
async function loadClientes() {
    try {
        console.log("Cargando clientes...");
        const { data: clientes, error } = await supabase
            .from('clientes')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        console.log("Clientes obtenidos:", clientes);
        clientesList.innerHTML = '';

        clientes.forEach(cliente => {
            console.log(`Cliente ${cliente.nombre}: bloqueado = ${cliente.bloqueado}`);
            const clienteItem = document.createElement('div');
            clienteItem.className = `item ${cliente.bloqueado ? 'cumpleanos-alert' : ''}`;
            clienteItem.innerHTML = `
                <h3>${cliente.nombre} ${cliente.bloqueado ? '<span class="badge badge-danger">BLOQUEADO</span>' : ''}</h3>
                <p><i class="fas fa-phone"></i> ${cliente.telefono}</p>
                <p><i class="fas fa-envelope"></i> ${cliente.email || 'No registrado'}</p>
                <p class="fecha"><i class="fas fa-birthday-cake"></i> ${formatDate(cliente.fecha_nacimiento)}</p>
                <div class="item-actions">
                    ${cliente.bloqueado ?
                        `<button class="btn btn-success btn-sm" onclick="window.toggleClienteBlock('${cliente.id}', false)">
                            <i class="fas fa-unlock"></i> Desbloquear
                        </button>` :
                        `<button class="btn btn-warning btn-sm" onclick="window.toggleClienteBlock('${cliente.id}', true)">
                            <i class="fas fa-ban"></i> Bloquear
                        </button>`
                    }
                </div>
            `;
            clientesList.appendChild(clienteItem);
        });
    } catch (error) {
        console.error("Error en loadClientes:", error);
        showNotification('Error al cargar clientes', 'error');
    }
}

// Cargar citas (solo futuras, para mostrar en el panel)
async function loadCitas() {
    try {
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];
        
        let sedeFiltrada = currentSede;
        
        // Ajuste para que 'manuel_rodriguez' coincida con 'manuel rodriguez' o 'Manuel Rodríguez'
        if (currentSede === 'manuel_rodriguez') {
            sedeFiltrada = 'Manuel Rodríguez'; 
        }

        console.log("Cargando citas para sede:", sedeFiltrada);
        const { data: citas, error } = await supabase
            .from('citas')
            .select(`
                *,
                clientes:cliente_id (nombre, telefono),
                barberos:barbero_id (nombre)
            `)
            .gte('fecha', hoyStr) // Solo citas desde hoy en adelante
            .eq('sede', sedeFiltrada) // Filtrar por la sede corregida
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true });

        if (error) throw error;

        console.log("Citas obtenidas (futuras):", citas);
        citasList.innerHTML = '';

        if (citas.length === 0) {
            citasList.innerHTML = '<p>No hay citas próximas para esta sede.</p>';
            return;
        }

        citas.forEach(cita => {
            const citaItem = document.createElement('div');
            citaItem.className = 'item';
            citaItem.innerHTML = `
                <h3>${cita.clientes.nombre}</h3>
                <p><i class="fas fa-scissors"></i> ${cita.servicio}</p>
                <p><i class="fas fa-user"></i> Barbero: ${cita.barberos ? cita.barberos.nombre : 'No asignado'}</p>
                <p><i class="fas fa-calendar-day"></i> ${formatDate(cita.fecha)} a las ${cita.hora}</p>
                <p class="fecha">${cita.notas || 'Sin notas'}</p>
                <div class="item-actions">
                    <button class="btn btn-warning btn-sm" onclick="window.liberarHora('${cita.id}')">
                        <i class="fas fa-redo"></i> Liberar Hora
                    </button>
                </div>
            `;
            citasList.appendChild(citaItem);
        });
    } catch (error) {
        console.error("Error en loadCitas:", error);
        showNotification('Error al cargar citas', 'error');
    }
}

// Función para obtener citas filtradas por rango de fechas
async function getCitasForExportByDateRange(fechaInicio, fechaFin) {
    try {
        let query = supabase
            .from('citas')
            .select(`
                *,
                clientes:cliente_id (nombre, telefono, email),
                barberos:barbero_id (nombre)
            `)
            .eq('sede', currentSede); // Siempre filtrar por sede del admin

        if (fechaInicio) {
            query = query.gte('fecha', fechaInicio);
        }
        if (fechaFin) {
            query = query.lte('fecha', fechaFin);
        }

        query = query
            .order('fecha', { ascending: false })
            .order('hora', { ascending: false });

        const { data: citas, error } = await query;

        if (error) throw error;
        return citas;
    } catch (error) {
        console.error("Error al obtener citas para exportar:", error);
        showNotification('Error al obtener datos para exportación.', 'error');
        return [];
    }
}

// Función: Exportar citas a Excel con filtro de fechas
async function exportarCitasAExcel() {
    if (!currentSede) {
        showNotification('Por favor, espere a que la sede se cargue.', 'info');
        return;
    }

    const fechaInicio = exportFechaInicioInput.value;
    const fechaFin = exportFechaFinInput.value;

    if (!fechaInicio || !fechaFin) {
        showNotification('Por favor, seleccione una fecha de inicio y una fecha de fin para exportar.', 'warning');
        return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
        showNotification('La fecha de inicio no puede ser posterior a la fecha de fin.', 'warning');
        return;
    }

    try {
        showNotification('Preparando datos para exportar...', 'info');
        const citas = await getCitasForExportByDateRange(fechaInicio, fechaFin);

        if (citas.length === 0) {
            showNotification('No hay citas para exportar en el rango de fechas seleccionado para esta sede.', 'info');
            return;
        }

        // Definir los encabezados de las columnas
        const headers = [
            "ID Cita", "Cliente", "Teléfono Cliente", "Email Cliente", 
            "Servicio", "Barbero", "Fecha", "Hora", "Sede", "Notas", "Estado"
        ];
        
        // Mapear los datos de las citas a filas
        const rows = citas.map(cita => [
            cita.id,
            cita.clientes ? cita.clientes.nombre : 'N/A',
            cita.clientes ? cita.clientes.telefono : 'N/A',
            cita.clientes ? cita.clientes.email || 'No registrado' : 'No registrado',
            cita.servicio,
            cita.barberos ? cita.barberos.nombre : 'No asignado',
            formatDate(cita.fecha), // Usa tu función formatDate
            cita.hora,
            formatSedeName(cita.sede), // Usa tu función formatSedeName
            cita.notas || 'Sin notas',
            cita.estado
        ]);

        // Combinar encabezados y filas
        const dataForExcel = [headers, ...rows];

        // Generar el archivo Excel/CSV (ejemplo con SheetJS para XLSX)
        const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Citas");

        // Formato de nombre de archivo
        const fileName = `citas_${formatSedeName(currentSede).replace(' ', '_')}_${fechaInicio}_a_${fechaFin}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showNotification('Citas exportadas a Excel exitosamente.', 'success');

    } catch (error) {
        console.error("Error al exportar citas:", error);
        showNotification(`Error al exportar citas: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}


// Función auxiliar para el color del badge de estado (no utilizada directamente aquí, pero mantenida)
function getBadgeColor(status) {
    switch (status) {
        case 'confirmada': return 'success';
        case 'pendiente': return 'info';
        case 'cancelada': return 'danger';
        case 'no_asistio': return 'warning';
        case 'completada': return 'primary'; // Usar primary para completada
        default: return 'info';
    }
}

// Actualizar estado de la cita (no se usa para liberar hora, pero se mantiene si hay otras lógicas)
async function updateCitaStatus(citaId, newStatus) {
    try {
        const { error } = await supabase
            .from('citas')
            .update({ estado: newStatus })
            .eq('id', citaId);

        if (error) throw error;

        showNotification(`Cita ${newStatus} exitosamente.`, 'success');
        await loadCitas(); // Recargar la lista de citas
    } catch (error) {
        console.error("Error al actualizar estado de cita:", error);
        showNotification(`Error al actualizar estado: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}

// Cargar promociones
async function loadPromociones() {
    try {
        console.log("Cargando promociones para sede:", currentSede);
        const { data: promociones, error } = await supabase
            .from('promociones')
            .select('*')
            .eq('sede', currentSede) // Filtrar por sede del admin
            .order('fecha_inicio', { ascending: true });

        if (error) throw error;

        console.log("Promociones obtenidas:", promociones);
        promocionesList.innerHTML = '';

        if (promociones.length === 0) {
            promocionesList.innerHTML = '<p>No hay promociones activas para esta sede.</p>';
            return;
        }

        promociones.forEach(promo => {
            const promoItem = document.createElement('div');
            promoItem.className = 'item';
            promoItem.innerHTML = `
                <h3>${promo.titulo}</h3>
                <p>${promo.descripcion}</p>
                <p class="fecha">
                    <i class="fas fa-calendar-alt"></i> ${formatDate(promo.fecha_inicio)} - ${formatDate(promo.fecha_fin)}
                </p>
                <p><i class="fas fa-store"></i> Sede ${formatSedeName(promo.sede)}</p>
                ${promo.imagen_url ? `<img src="${promo.imagen_url}" alt="Imagen de promoción" style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 5px;">` : ''}
                <div class="item-actions">
                    <button class="btn btn-danger btn-sm" onclick="window.eliminarPromocion('${promo.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            promocionesList.appendChild(promoItem);
        });
    } catch (error) {
        console.error("Error en loadPromociones:", error);
        showNotification('Error al cargar promociones', 'error');
    }
}

// Eliminar promoción
async function eliminarPromocion(promoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
        return;
    }
    try {
        const { error } = await supabase
            .from('promociones')
            .delete()
            .eq('id', promoId);

        if (error) throw error;

        showNotification('Promoción eliminada exitosamente.', 'success');
        await loadPromociones();
    } catch (error) {
        console.error("Error al eliminar promoción:", error);
        showNotification(`Error al eliminar promoción: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}

// Crear promoción
async function crearPromocion() {
    const titulo = document.getElementById('promo-titulo').value;
    const descripcion = document.getElementById('promo-descripcion').value;
    const fechaInicio = document.getElementById('promo-inicio').value;
    const fechaFin = document.getElementById('promo-fin').value;
    const imagenUrl = document.getElementById('promo-imagen-url').value;
    const sede = document.getElementById('promo-sede').value; // Ya viene del currentSede

    if (!titulo || !descripcion || !fechaInicio || !fechaFin || !sede) {
        showNotification('Por favor, complete todos los campos obligatorios.', 'warning');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('promociones')
            .insert([
                {
                    titulo: titulo,
                    descripcion: descripcion,
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    imagen_url: imagenUrl,
                    sede: sede
                }
            ]);

        if (error) throw error;

        showNotification('Promoción creada exitosamente.', 'success');
        // Limpiar formulario
        document.getElementById('promo-titulo').value = '';
        document.getElementById('promo-descripcion').value = '';
        document.getElementById('promo-inicio').value = '';
        document.getElementById('promo-fin').value = '';
        document.getElementById('promo-imagen-url').value = '';
        await loadPromociones();
    } catch (error) {
        console.error("Error al crear promoción:", error);
        showNotification(`Error al crear promoción: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}

// Bloquear/Desbloquear cliente
async function toggleClienteBlock(clienteId, blockStatus) {
    try {
        const { error } = await supabase
            .from('clientes')
            .update({ bloqueado: blockStatus })
            .eq('id', clienteId);

        if (error) throw error;

        showNotification(`Cliente ${blockStatus ? 'bloqueado' : 'desbloqueado'} exitosamente.`, 'success');
        await loadClientes(); // Recargar la lista de clientes
    } catch (error) {
        console.error("Error al cambiar estado de bloqueo del cliente:", error);
        showNotification(`Error al actualizar estado del cliente: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}

// Verificar cumpleaños
async function checkCumpleanos() {
    try {
        const { data: clientesTodos, error } = await supabase
            .from('clientes')
            .select('*');

        if (error) throw error;

        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const diaActual = hoy.getDate();

        const clientesCumple = clientesTodos.filter(cliente => {
            if (!cliente.fecha_nacimiento) return false;
            const fechaNac = new Date(cliente.fecha_nacimiento);
            return fechaNac.getMonth() + 1 === mesActual && fechaNac.getDate() === diaActual;
        });

        console.log("Clientes con cumpleaños:", clientesCumple);
        cumpleanosList.innerHTML = '';

        if (clientesCumple.length === 0) {
            cumpleanosList.innerHTML = '<p>No hay clientes con cumpleaños hoy</p>';
            return;
        }

        // Reproducir sonido de cumpleaños si hay al menos un cliente
        // CORRECCIÓN: Asegurarse de que el elemento existe y maneja promesas.
        if (birthdaySound) {
            birthdaySound.play().catch(e => console.error("Error al reproducir el sonido de cumpleaños:", e));
        }

        clientesCumple.forEach(cliente => {
            const cumpleanosItem = document.createElement('div');
            cumpleanosItem.className = 'item cumpleanos-alert';
            cumpleanosItem.innerHTML = `
                <h3><i class="fas fa-gift"></i> ${cliente.nombre}</h3>
                <p><i class="fas fa-phone"></i> ${cliente.telefono}</p>
                <p><i class="fas fa-map-marker-alt"></i> Sede: ${formatSedeName(cliente.sede_favorita || 'No especificada')}</p>
                <div class="item-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.openCumpleanosBookingModal('${cliente.id}', '${cliente.nombre}', '${cliente.sede_favorita}')">
                        <i class="fas fa-calendar-plus"></i> Agendar Corte
                    </button>
                </div>
            `;
            cumpleanosList.appendChild(cumpleanosItem);
        });
    } catch (error) {
        console.error("Error en checkCumpleanos:", error);
        showNotification('Error al cargar cumpleaños', 'error');
    }
}

// Abrir modal de agendamiento de cumpleaños
async function openCumpleanosBookingModal(clienteId, clienteNombre, clienteSede) {
    currentCumpleanosCliente = { id: clienteId, nombre: clienteNombre, sede: clienteSede };

    cumpleanosClienteNombre.textContent = clienteNombre;
    cumpleanosClienteSede.textContent = formatSedeName(clienteSede);

    // Cargar barberos de la sede del cliente
    await loadBarberosForBirthdayBooking(clienteSede);

    // Setear fecha mínima a hoy
    const today = new Date().toISOString().split('T')[0];
    cumpleanosFechaInput.min = today;
    cumpleanosFechaInput.value = today; // Establecer fecha por defecto hoy

    // Limpiar horas y cargar las disponibles para la fecha y barbero inicial
    cumpleanosHoraSelect.innerHTML = '';
    await loadAvailableTimesForBirthdayBooking();

    cumpleanosBookingModal.style.display = 'block';
}

// Cerrar modal de agendamiento de cumpleaños
function closeCumpleanosBookingModal() {
    cumpleanosBookingModal.style.display = 'none';
    currentCumpleanosCliente = null;
    cumpleanosBarberoSelect.innerHTML = ''; // Limpiar select de barberos
    cumpleanosHoraSelect.innerHTML = ''; // Limpiar select de horas
    cumpleanosFechaInput.value = ''; // Limpiar fecha
}

// Cargar barberos para el modal de cumpleaños
async function loadBarberosForBirthdayBooking(sede) {
    try {
        const { data: barberos, error } = await supabase
            .from('barberos')
            .select('id, nombre')
            .eq('sede', sede)
            .order('nombre', { ascending: true });

        if (error) throw error;

        cumpleanosBarberoSelect.innerHTML = '<option value="">Seleccione un barbero</option>';
        barberos.forEach(barbero => {
            const option = document.createElement('option');
            option.value = barbero.id;
            option.textContent = barbero.nombre;
            cumpleanosBarberoSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        showNotification('Error al cargar barberos para el agendamiento', 'error');
    }
}

// Cargar horas disponibles para el agendamiento de cumpleaños
async function loadAvailableTimesForBirthdayBooking() {
    const selectedDate = cumpleanosFechaInput.value;
    const selectedBarberoId = cumpleanosBarberoSelect.value;
    const clienteSede = currentCumpleanosCliente ? currentCumpleanosCliente.sede : null;

    cumpleanosHoraSelect.innerHTML = '<option value="">Cargando horas...</option>';
    cumpleanosHoraSelect.disabled = true;

    if (!selectedDate || !selectedBarberoId || !clienteSede) {
        cumpleanosHoraSelect.innerHTML = '<option value="">Seleccione barbero y fecha</option>';
        cumpleanosHoraSelect.disabled = false;
        return;
    }

    try {
        const { data: citasDelDia, error: citasError } = await supabase
            .from('citas')
            .select('hora')
            .eq('barbero_id', selectedBarberoId)
            .eq('fecha', selectedDate)
            .eq('sede', clienteSede)
            .in('estado', ['confirmada', 'pendiente']); // Considerar citas confirmadas y pendientes

        if (citasError) throw citasError;

        const horasOcupadas = new Set(citasDelDia.map(cita => cita.hora));
        const horasDisponibles = generateTimeSlots(horasOcupadas);

        cumpleanosHoraSelect.innerHTML = '<option value="">Seleccione una hora</option>';
        if (horasDisponibles.length === 0) {
            cumpleanosHoraSelect.innerHTML += '<option value="">No hay horas disponibles</option>';
        } else {
            horasDisponibles.forEach(hora => {
                const option = document.createElement('option');
                option.value = hora;
                option.textContent = hora;
                cumpleanosHoraSelect.appendChild(option);
            });
        }
        cumpleanosHoraSelect.disabled = false;

    } catch (error) {
        console.error("Error al cargar horas disponibles:", error);
        showNotification('Error al cargar horas disponibles.', 'error');
        cumpleanosHoraSelect.innerHTML = '<option value="">Error al cargar horas</option>';
        cumpleanosHoraSelect.disabled = false;
    }
}

// Generar franjas horarias
function generateTimeSlots(occupiedTimes) {
    const slots = [];
    const startHour = 9; 
    const endHour = 20;  

    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 30) { // Intervalos de 30 minutos
            const hour = String(h).padStart(2, '0');
            const minute = String(m).padStart(2, '0');
            const time = `${hour}:${minute}`;
            if (!occupiedTimes.has(time)) {
                slots.push(time);
            }
        }
    }
    return slots;
}

// Confirmar agendamiento de cumpleaños
async function confirmCumpleanosBooking() {
    const clienteId = currentCumpleanosCliente.id;
    const barberoId = cumpleanosBarberoSelect.value;
    const fecha = cumpleanosFechaInput.value;
    const hora = cumpleanosHoraSelect.value;
    const sede = currentCumpleanosCliente.sede;
    const servicio = 'Corte de Cumpleaños'; 
    const notas = 'Agendado por el admin por cumpleaños del cliente.';
    const estado = 'confirmada';
    if (!clienteId || !barberoId || !fecha || !hora || !sede) {
        showNotification('Por favor, complete todos los campos del agendamiento.', 'warning');
        return;
    }

    try {
        // Verificar si el cliente ya tiene una cita para ese día
        const { data: existingCitas, error: existingCitasError } = await supabase
            .from('citas')
            .select('*')
            .eq('cliente_id', clienteId)
            .eq('fecha', fecha)
            .in('estado', ['confirmada', 'pendiente']);

        if (existingCitasError) throw existingCitasError;

        if (existingCitas.length > 0) {
            showNotification('El cliente ya tiene una cita agendada para esta fecha.', 'warning');
            return;
        }

        const { data, error } = await supabase
            .from('citas')
            .insert([
                {
                    cliente_id: clienteId,
                    barbero_id: barberoId,
                    fecha: fecha,
                    hora: hora,
                    servicio: servicio,
                    sede: sede,
                    notas: notas,
                    estado: estado
                }
            ]);

        if (error) throw error;

        showNotification('Corte de cumpleaños agendado exitosamente!', 'success');
        closeCumpleanosBookingModal(); // Cerrar el modal
        await loadCitas(); // Recargar la lista de citas para ver la nueva
        await loadClientes(); // Opcional: recargar clientes si cambia algún estado visual
    } catch (error) {
        console.error("Error al confirmar agendamiento:", error);
        showNotification(`Error al agendar el corte: ${error.message || 'Hubo un problema. Intente de nuevo.'}`, 'error');
    }
}

// Manejar la búsqueda
async function handleSearch() {
    const query = searchInput.value.toLowerCase();
    // Re-cargar todo y luego filtrar en el DOM para simplicidad,
    // o hacer una búsqueda más avanzada en Supabase si el dataset es grande.

    // Clientes
    const clientesItems = clientesList.querySelectorAll('.item');
    clientesItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // Citas
    const citasItems = citasList.querySelectorAll('.item');
    citasItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // Promociones
    const promocionesItems = promocionesList.querySelectorAll('.item');
    promocionesItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // Cumpleaños
    const cumpleanosItems = cumpleanosList.querySelectorAll('.item');
    cumpleanosItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}


// Cerrar sesión
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login-admin.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

// Mostrar notificaciones
function showNotification(message, type) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification notification-${type}`;
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') icon = '<i class="fas fa-times-circle"></i>';
    else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
    else if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';

    notificationDiv.innerHTML = `${icon} ${message}`;
    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.remove();
    }, 5000); // La notificación desaparece después de 5 segundos
}

// Configurar actualizaciones en tiempo real
function setupRealTimeUpdates() {
    // currentSede ya debería estar definido en este punto debido al await en checkSession
    if (!currentSede) {
        console.error("currentSede no está definido en setupRealTimeUpdates. No se configurarán las actualizaciones en tiempo real correctamente.");
        return;
    }
    
    // Suscripción a cambios generales en citas (update, delete, etc.)
    supabase
        .channel('citas_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'citas',
            filter: `sede=eq.${currentSede}` // Filtrar por sede del admin
        }, payload => {
            console.log('Cambio en citas detectado!', payload);
            loadCitas();
        })
        .subscribe();

    // Suscripción a cambios en clientes
    supabase
        .channel('clientes_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'clientes',
        }, payload => {
            console.log('Cambio en clientes detectado!', payload);
            loadClientes();
            checkCumpleanos(); // Re-chequear cumpleaños por si hay cambios en la fecha de nacimiento o nuevos clientes
        })
        .subscribe();

    // Suscripción a cambios en promociones
    supabase
        .channel('promociones_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'promociones',
            filter: `sede=eq.${currentSede}` // Filtrar por sede del admin
        }, payload => {
            console.log('Cambio en promociones detectado!', payload);
            loadPromociones();
        })
        .subscribe();
    
// Suscripción a cambios en citas
supabase.channel('new_citas_notification')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'citas',
        filter: `sede=eq.${currentSede}`
    }, payload => {
        console.log('¡Nueva cita INSERTADA detectada!', payload);

        if (payload.new && payload.new.sede === currentSede) {
            if (notificationSound) {
                notificationSound.play().then(() => {
                    console.log('Sonido reproducido correctamente');
                }).catch(e => {
                    console.error("Error al reproducir el sonido:", e);
                });
            } else {
                console.warn('No se encontró el elemento de sonido notificationSound');
            }

            showNotification(`¡Nueva cita agendada para ${payload.new.fecha} a las ${payload.new.hora}!`, 'success');
            loadCitas();
        }
    })
    .subscribe();
}