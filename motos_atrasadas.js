import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

const rol = localStorage.getItem("rol_actual");
if (rol !== "administrador") {
    alert("Acceso no autorizado");
    window.location.href = "dashboard.html";
}

/* ===== DOM ===== */
const tabla = document.getElementById("tablaAtrasos");
const totalTxt = document.getElementById("totalAtrasadas");
const usuarioFiltro = document.getElementById("usuarioFiltro");
const btnBuscar = document.getElementById("btnBuscar");

/* ===== CARGAR USUARIOS ===== */
async function cargarUsuarios() {
    const { data } = await supabase
        .from("usuarios")
        .select("id, nombre_completo")
        .order("nombre_completo");

    usuarioFiltro.innerHTML = `<option value="">Todos los empleados</option>`;
    data.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre_completo;
        usuarioFiltro.appendChild(opt);
    });
}

cargarUsuarios();

/* ===== BUSCAR ===== */
btnBuscar.onclick = async () => {
    tabla.innerHTML = "";
    totalTxt.textContent = "0";

    let query = supabase
        .from("vista_motos_atrasadas")
        .select("*")
        .order("dias_atraso", { ascending: false });

    if (usuarioFiltro.value) {
        query = query.eq("empleado_id", usuarioFiltro.value);
    }

    const { data, error } = await query;

    if (error || !data.length) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">🎉 No hay motos atrasadas</td>
            </tr>
        `;
        return;
    }

    totalTxt.textContent = data.length;

    data.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.empleado}</td>
            <td>${m.placa}</td>
            <td>${m.propietario}</td>
            <td>${m.ultima_fecha_pago ?? "Nunca"}</td>
            <td>${m.dias_atraso ?? "—"}</td>
        `;
        tabla.appendChild(tr);
    });
};
