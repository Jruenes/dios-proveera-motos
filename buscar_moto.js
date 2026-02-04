import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

const placaInput = document.getElementById("placa");
const usuarioFiltro = document.getElementById("usuarioFiltro");
const btnBuscar = document.getElementById("btnBuscar");
const tabla = document.getElementById("tabla");
const totalMotosTxt = document.getElementById("totalMotos");
const thEliminar = document.getElementById("thEliminar");

const rol = localStorage.getItem("rol_actual");
const usuarioId = localStorage.getItem("usuario_id");

let motosCache = [];

/* ===== MOSTRAR TH ELIMINAR SOLO ADMIN ===== */
if (rol === "administrador" && thEliminar) {
    thEliminar.style.display = "";
}

/* ===== ADMIN ===== */
if (rol === "administrador") {
    usuarioFiltro.style.display = "inline-block";
    cargarUsuarios();
}

/* ===== CARGAR USUARIOS ===== */
async function cargarUsuarios() {
    const { data } = await supabase
        .from("usuarios")
        .select("id, nombre_completo")
        .order("nombre_completo");

    usuarioFiltro.innerHTML = `<option value="">Todos los empleados</option>`;
    data.forEach(u => {
        usuarioFiltro.innerHTML += `
            <option value="${u.id}">${u.nombre_completo}</option>
        `;
    });
}

/* ===== TOTAL MOTOS ===== */
document.addEventListener("DOMContentLoaded", cargarTotalMotos);

async function cargarTotalMotos() {
    let query = supabase
        .from("motos")
        .select("id", { count: "exact", head: true });

    if (rol === "empleado") {
        query = query.eq("usuario_creador", usuarioId);
    }

    const { count } = await query;
    totalMotosTxt.textContent = count || 0;
}

/* ===== BUSCAR ===== */
btnBuscar.addEventListener("click", cargarMotos);

async function cargarMotos() {
    tabla.innerHTML = "";

    const texto = placaInput.value.trim();
    const empleado = usuarioFiltro.value;

    let query = supabase
        .from("motos")
        .select(`
            id,
            placa,
            nombre,
            cedula,
            direccion,
            telefono,
            usuario_creador,
            usuarios(nombre_completo),
            codeudores (
                nombre,
                cedula,
                direccion,
                telefono
            )
        `);

    if (rol === "empleado") {
        query = query.eq("usuario_creador", usuarioId);
    }

    if (rol === "administrador" && empleado) {
        query = query.eq("usuario_creador", empleado);
    }

    if (texto) {
        query = query.or(
            `placa.ilike.%${texto}%,nombre.ilike.%${texto}%`
        );
    }

    const { data, error } = await query.order("placa");

    if (error || !data || data.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;">
                    😕 No se encontraron motos
                </td>
            </tr>
        `;
        totalMotosTxt.textContent = 0;
        return;
    }

    motosCache = data;
    totalMotosTxt.textContent = data.length;
    pintarTabla();
}

/* ===== TABLA ===== */
function pintarTabla() {
    tabla.innerHTML = "";

    motosCache.forEach((m, i) => {
        const tieneCodeudor = m.codeudores && m.codeudores.length > 0;

        tabla.innerHTML += `
            <tr>
                <td>${m.placa}</td>
                <td>${m.nombre}</td>
                <td>${m.cedula}</td>
                <td>${m.direccion || "-"}</td>
                <td>${m.telefono || "-"}</td>
                <td>${m.usuarios?.nombre_completo || "-"}</td>
                <td style="text-align:center;">
                    ${tieneCodeudor ? "🟢" : "🔴"}
                </td>
                <td style="text-align:center;">
                    <button onclick="imprimirFicha(${i})">🖨️</button>
                </td>

                ${rol === "administrador" ? `
                    <td style="text-align:center;">
                        <button class="btn-eliminar" onclick="eliminarMoto(${i})">🗑️</button>
                    </td>
                ` : ""}
            </tr>
        `;
    });
}

/* ===== ELIMINAR (SOLO ADMIN) ===== */
window.eliminarMoto = async function (i) {
    if (rol !== "administrador") return;

    const m = motosCache[i];
    if (!m) return;

    const ok = confirm(`⚠️ ¿Seguro que deseas eliminar la moto ${m.placa}?\n\nEsta acción NO se puede deshacer.`);
    if (!ok) return;

    // 1) eliminar codeudores primero (por seguridad)
    await supabase
        .from("codeudores")
        .delete()
        .eq("moto_id", m.id);

    // 2) eliminar moto
    const { error } = await supabase
        .from("motos")
        .delete()
        .eq("id", m.id);

    if (error) {
        alert("❌ No se pudo eliminar la moto.");
        console.error(error);
        return;
    }

    // 3) actualizar tabla en pantalla
    motosCache.splice(i, 1);
    totalMotosTxt.textContent = motosCache.length;
    pintarTabla();

    alert("✅ Moto eliminada correctamente.");
};

/* ===== FACTURA (NO TOCADA) ===== */
window.imprimirFicha = function (i) {
    const m = motosCache[i];
    if (!m) return;

    const empleado = m.usuarios?.nombre_completo || "-";
    const c = m.codeudores?.[0];

    let bloqueCodeudor = `
        <div class="nota-codeudor">
            Esta moto no tiene codeudor registrado
        </div>
    `;

    if (c) {
        bloqueCodeudor = `
            <h4>Datos del codeudor</h4>
            <table>
                <tr>
                    <th>Nombre</th>
                    <td>${c.nombre}</td>
                </tr>
                <tr>
                    <th>Cédula</th>
                    <td>${c.cedula}</td>
                </tr>
                <tr>
                    <th>Dirección</th>
                    <td>${c.direccion || "-"}</td>
                </tr>
                <tr>
                    <th>Teléfono</th>
                    <td>${c.telefono || "-"}</td>
                </tr>
            </table>
        `;
    }

    const v = window.open("", "_blank");

    v.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Recibo</title>
<style>
body { font-family: Arial; padding: 30px; }
.factura {
    border: 2px solid #000;
    padding: 25px;
    max-width: 650px;
    margin: auto;
    position: relative;
}
h1, h2 { text-align: center; margin: 6px 0; }
h4 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; }
.direccion { text-align: center; font-size: 13px; margin-bottom: 15px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th, td { border: 1px solid #000; padding: 8px; font-size: 14px; }
th { background: #f2f2f2; width: 35%; }
.nota-codeudor {
    position: absolute;
    bottom: 15px;
    right: 20px;
    font-size: 11px;
    color: #777;
    font-style: italic;
}
</style>
</head>

<body onload="window.print(); window.close();">
<div class="factura">

<h1>INFORMACIÓN DEL CLIENTE</h1>

<h2>Dios Proveerá Moto</h2>
<div class="direccion">
Barrio La Gloria II - Calle Los Amigos Cra 63A #13D-46<br>
Cartagena de Indias
</div>

<h4>Datos del propietario</h4>
<table>
<tr><th>Placa</th><td>${m.placa}</td></tr>
<tr><th>Nombre</th><td>${m.nombre}</td></tr>
<tr><th>Cédula</th><td>${m.cedula}</td></tr>
<tr><th>Dirección</th><td>${m.direccion || "-"}</td></tr>
<tr><th>Teléfono</th><td>${m.telefono || "-"}</td></tr>
</table>

<h4>Atendido por</h4>
<table>
<tr><th>Empleado</th><td>${empleado}</td></tr>
</table>

${bloqueCodeudor}

</div>
</body>
</html>
    `);

    v.document.close();
};
