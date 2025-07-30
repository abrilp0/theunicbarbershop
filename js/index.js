import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadPromociones();
        
        // Cambiar promociones al seleccionar otra sede
        document.getElementById('sede-promociones')?.addEventListener('change', async (e) => {
            await loadPromociones(e.target.value);
        });
    } catch (error) {
        console.error('Error al cargar promociones:', error);
    }
});

async function loadPromociones(sede = 'todas') {
    try {
        const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        let query = supabase
            .from('promociones')
            .select('*')
            .eq('activa', true)
            .gte('fecha_fin', hoy) // Solo promociones vigentes
            .order('fecha_inicio', { ascending: false });

        if (sede !== 'todas') {
            query = query.eq('sede', sede);
        }

        const { data: promociones, error } = await query;

        console.log('Promociones cargadas:', promociones); // Debug

        const container = document.getElementById('promociones-container');
        if (!container) return;
        
        container.innerHTML = '';

        if (error || !promociones || promociones.length === 0) {
            container.innerHTML = '<p class="no-promos">No hay promociones disponibles en este momento.</p>';
            return;
        }

        promociones.forEach(promo => {
            const nombreSede = getNombreSede(promo.sede);
            const inicio = formatDate(promo.fecha_inicio);
            const fin = formatDate(promo.fecha_fin);
            
            const promoEl = document.createElement('div');
            promoEl.className = 'promo-card';
            promoEl.innerHTML = `
                <div class="promo-image" style="background-image: url('${promo.imagen_url || 'assets/promo-default.jpg'}')"></div>
                <div class="promo-content">
                    <h3 class="promo-title">${promo.titulo}</h3>
                    <p class="promo-desc">${promo.descripcion || 'Oferta especial'}</p>
                    <div class="promo-meta">
                        <span class="promo-dates">${inicio} - ${fin}</span>
                        <span class="promo-sede">${nombreSede}</span>
                    </div>
                </div>
            `;
            container.appendChild(promoEl);
        });
    } catch (error) {
        console.error('Error en loadPromociones:', error);
    }
}

function getNombreSede(sedeCodigo) {
    const sedes = {
        'brasil': 'Sede Brasil',
        'manuel-rodriguez': 'Sede Manuel Rodríguez'
    };
    return sedes[sedeCodigo] || sedeCodigo;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}