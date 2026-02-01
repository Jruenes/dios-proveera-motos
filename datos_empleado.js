import { supabase } from './supabase.js';

const busquedaInput = document.getElementById("busquedaEmpleado");
const resultadosDiv = document.getElementById("resultados");

const usuarioActual = localStorage.getItem("usuario");
const rol = localStorage.getItem("rol");

// Solo admin puede usar esta página
if (rol !== "admin") {
    alert("Acceso denegado: solo administradores");
    window.location.href = "dashboard.html";
}

// Verificar sesión y bloqueo
if (localStorage.getItem("sesionActiva") !== "true") {
    window.location.href = "index.html";
}

async function buscarEmpleado() {
    const texto = busquedaInput.value.trim();
    resultadosDiv.innerHTML = "";

    if (!texto) return alert("Ingresa nombre o cédula");

    // Buscar empleado
    const { data: empleados, error } = await supabase.from("usuarios")
        .select("*")
        .or(`usuario.ilike.%${texto}%, cedula.eq.${texto}`)
        .eq("rol", "empleado");

    if (error) return alert("Error al buscar empleado: " + error.message);
    if (!empleados || empleados.length === 0) {
        resultadosDiv.innerHTML = "<p>No se encontraron empleados</p>";
        return;
    }

    // Mostrar información de cada empleado
    for (const emp of empleados) {
        resultadosDiv.innerHTML += `<div class="info">
            <h3>${emp.usuario} (${emp.cedula}) ${emp.bloqueado ? '🔒 Bloqueado' : ''}</h3>
            <div id="motos_${emp.id}"><b>Motos registradas:</b></div>
            <div id="pagos_${emp.id}"><b>Pagos registrados:</b></div>
        </div>`;

        // Motos registradas
        const { data: motos } = await supabase.from("motos")
            .select("*")
            .eq("creado_por", emp.id);

        const motosDiv = document.getElementById(`motos_${emp.id}`);
        if (motos.length === 0) motosDiv.innerHTML += "<p>No registró motos</p>";
        else motos.forEach(m => {
            motosDiv.innerHTML += `<p>Placa: ${m.placa} - Propietario: ${m.nombre}</p>`;
        });

        // Pagos registrados
        const { data: pagos } = await supabase.from("pagos")
            .select("monto, fecha, moto: motos(placa, nombre)")
            .eq("creado_por", emp.id);

        const pagosDiv = document.getElementById(`pagos_${emp.id}`);
        if (pagos.length === 0) pagosDiv.innerHTML += "<p>No registró pagos</p>";
        else {
            pagos.forEach(p => {
                pagosDiv.innerHTML += `<p>Moto: ${p.moto.placa} - ${p.moto.nombre} - Fecha: ${p.fecha} - Monto: $${Number(p.monto).toLocaleString("es-CO")}</p>`;
            });
        }
    }
}

// Volver
function volver() {
    window.location.href = "dashboard.html";
}

// Enter para buscar
busquedaInput.addEventListener("keydown", e => {
    if (e.key === "Enter") buscarEmpleado();
});

// Exponer funciones
window.buscarEmpleado = buscarEmpleado;
window.volver = volver;

// Botón buscar
document.getElementById("btnBuscar").addEventListener("click", buscarEmpleado);
