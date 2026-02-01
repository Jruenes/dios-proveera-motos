import { supabase } from './supabase.js';

const usuarioActual = localStorage.getItem("usuario_actual");
const rolActual = localStorage.getItem("rol_actual");

async function listarMotos() {
    const filtro = document.getElementById("buscar").value.trim();

    let query = supabase.from('motos').select('*');

    if (filtro) {
        query = query.ilike('placa', `%${filtro}%`)
                     .or(`nombre.ilike.%${filtro}%`)
                     .or(`cedula.eq.${filtro}`);
    }

    // Si es empleado, solo mostrar motos que registró
    if (rolActual !== 'admin') {
        const { data: usuario } = await supabase.from('usuarios')
            .select('id')
            .eq('usuario', usuarioActual)
            .single();

        query = query.eq('usuario_id', usuario.id);
    }

    const { data, error } = await query;

    if (error) {
        alert("Error al listar motos: " + error.message);
        return;
    }

    const tbody = document.querySelector("#tablaMotos tbody");
    tbody.innerHTML = "";

    data.forEach(moto => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${moto.placa}</td>
            <td>${moto.nombre}</td>
            <td>${moto.cedula}</td>
            <td>${moto.direccion}</td>
            <td>${moto.telefono}</td>
            <td>
                <button onclick="editarMoto('${moto.id}')">✏️</button>
                ${rolActual === 'admin' ? `<button onclick="eliminarMoto('${moto.id}')">🗑️</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function editarMoto(id) {
    const { data: moto } = await supabase.from('motos').select('*').eq('id', id).single();
    const placa = prompt("Placa (no se puede cambiar):", moto.placa);
    const nombre = prompt("Nombre:", moto.nombre);
    const cedula = prompt("Cédula:", moto.cedula);
    const direccion = prompt("Dirección:", moto.direccion);
    const telefono = prompt("Teléfono:", moto.telefono);

    const { error } = await supabase.from('motos')
        .update({ nombre, cedula, direccion, telefono })
        .eq('id', id);

    if (error) return alert("Error al editar: " + error.message);
    listarMotos();
}

async function eliminarMoto(id) {
    if (!confirm("¿Desea eliminar esta moto?")) return;

    const { data, error } = await supabase.from('motos').select('*').eq('id', id).single();
    if (error) return alert("Error: " + error.message);

    await supabase.from('motos_eliminadas').insert([data]);
    await supabase.from('motos').delete().eq('id', id);

    listarMotos();
}

function volver() {
    window.location.href = "dashboard.html";
}

document.getElementById("buscar").addEventListener('keydown', e => {
    if (e.key === 'Enter') listarMotos();
});

window.listarMotos = listarMotos;
window.editarMoto = editarMoto;
window.eliminarMoto = eliminarMoto;
window.volver = volver;

listarMotos();
