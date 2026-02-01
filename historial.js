import { supabase } from './supabase.js';

const usuarioActual = localStorage.getItem("usuario_actual");
const rolActual = localStorage.getItem("rol_actual");

async function listarHistorial() {
    const filtro = document.getElementById("buscar").value.trim();

    let query = supabase.from('historial_vista').select('*');

    if (filtro) {
        query = query.ilike('placa', `%${filtro}%`)
                     .or(`nombre.ilike.%${filtro}%`)
                     .or(`cedula.eq.${filtro}`);
    }

    // Si es empleado, no mostrar columna de Empleado
    if (rolActual !== 'admin') {
        // Solo mostrar las motos que registró
        const { data: usuario } = await supabase.from('usuarios')
            .select('id')
            .eq('usuario', usuarioActual)
            .single();

        query = query.eq('usuario_id', usuario.id);
    }

    const { data, error } = await query;

    if (error) {
        alert("Error al listar historial: " + error.message);
        return;
    }

    const tbody = document.querySelector("#tablaHistorial tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const tr = document.createElement("tr");

        // Mostrar empleado solo si es admin
        const empleado = rolActual === 'admin' ? `<td>${item.usuario}</td>` : '';

        tr.innerHTML = `
            <td>${item.placa}</td>
            <td>${item.nombre}</td>
            <td>${item.cedula}</td>
            <td>${item.fecha}</td>
            <td>${item.monto}</td>
            ${empleado}
        `;
        tbody.appendChild(tr);
    });
}

function volver() {
    window.location.href = "dashboard.html";
}

// ENTER busca
document.getElementById("buscar").addEventListener('keydown', e => {
    if (e.key === 'Enter') listarHistorial();
});

window.listarHistorial = listarHistorial;
window.volver = volver;

listarHistorial();
