import { supabase } from "./supabase.js";

/* ================= DOM ================= */
const mensaje = document.getElementById("mensaje");
const tablaBody = document.querySelector("#tablaReporte tbody");
const totalP = document.getElementById("total");
const mesInput = document.getElementById("mes");
const usuarioFiltro = document.getElementById("usuarioFiltro");
const btnBuscar = document.getElementById("btnBuscar");
const btnImprimirMes = document.getElementById("btnImprimirMes");

/* ================= SESIÓN ================= */
const rol = localStorage.getItem("rol_actual");
const usuarioId = localStorage.getItem("usuario_id");

/* ================= VARIABLES ================= */
let datosGlobales = [];
let totalMesGlobal = 0;

/* ================= ADMIN ================= */
if (rol === "administrador") {
    usuarioFiltro.style.display = "inline-block";
    cargarUsuarios();
}

async function cargarUsuarios() {
    const { data } = await supabase
        .from("usuarios")
        .select("id, nombre_completo")
        .eq("eliminado", false)
        .order("nombre_completo");

    usuarioFiltro.innerHTML = `<option value="">Todos los empleados</option>`;
    data.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre_completo;
        usuarioFiltro.appendChild(opt);
    });
}

/* ================= BUSCAR ================= */
btnBuscar.addEventListener("click", buscarReporteMensual);

async function buscarReporteMensual() {
    mensaje.textContent = "";
    tablaBody.innerHTML = "";
    totalP.textContent = "";
    datosGlobales = [];
    totalMesGlobal = 0;

    const mes = mesInput.value;
    if (!mes) {
        mensaje.textContent = "⚠️ Selecciona un mes";
        return;
    }

    /* ===== FECHAS UTC (FIX DEFINITIVO) ===== */
    const [year, month] = mes.split("-");
    const inicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    let query = supabase
        .from("vista_reporte_mensual")
        .select("*")
        .gte("created_at", inicio.toISOString())
        .lt("created_at", fin.toISOString())
        .order("created_at", { ascending: true });

    if (rol === "empleado") {
        query = query.eq("empleado_id", usuarioId);
    }

    if (rol === "administrador" && usuarioFiltro.value) {
        query = query.eq("empleado_id", usuarioFiltro.value);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        mensaje.textContent = "⚠️ Error al consultar el reporte";
        return;
    }

    if (!data || data.length === 0) {
        mensaje.textContent = "⚠️ No hay pagos en este mes";
        return;
    }

    datosGlobales = data;

    data.forEach(p => {
        totalMesGlobal += Number(p.monto);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fechaCOL(p.created_at)}</td>
            <td>${p.empleado}</td>
            <td>${p.placa}</td>
            <td>${formatoCOP(p.monto)}</td>
            <td>
                <button class="btnImprimir">🖨</button>
            </td>
        `;

        tr.querySelector(".btnImprimir").addEventListener("click", () => {
            imprimirIndividual(p);
        });

        tablaBody.appendChild(tr);
    });

    totalP.textContent = `Total del mes: ${formatoCOP(totalMesGlobal)}`;
}

/* ================= IMPRIMIR INDIVIDUAL ================= */
function imprimirIndividual(p) {
    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>
            <h4>Comprobante de Pago</h4>

            <table>
                <tr><th>Fecha</th><td>${fechaCOL(p.created_at)}</td></tr>
                <tr><th>Empleado</th><td>${p.empleado}</td></tr>
                <tr><th>Placa</th><td>${p.placa}</td></tr>
                <tr><th>Propietario</th><td>${p.propietario}</td></tr>
                <tr><th>Monto</th><td>${formatoCOP(p.monto)}</td></tr>
            </table>

            <div class="firma">
                ____________________________<br>
                Firma
            </div>
        </div>
    `);
}

/* ================= IMPRIMIR TOTAL DEL MES ================= */
btnImprimirMes.addEventListener("click", () => {
    if (!datosGlobales.length) {
        mensaje.textContent = "⚠️ No hay datos para imprimir";
        return;
    }

    let filas = datosGlobales.map(p => `
        <tr>
            <td>${fechaCOL(p.created_at)}</td>
            <td>${p.empleado}</td>
            <td>${p.placa}</td>
            <td>${formatoCOP(p.monto)}</td>
        </tr>
    `).join("");

    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>
            <h4>Reporte Mensual</h4>

            <table>
                <tr>
                    <th>Mes</th>
                    <th>Total</th>
                </tr>
                <tr>
                    <td>${mesInput.value}</td>
                    <td>${formatoCOP(totalMesGlobal)}</td>
                </tr>
            </table>

            <div class="linea"></div>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Empleado</th>
                        <th>Placa</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                    <tr>
                        <td colspan="3"><b>Total del mes</b></td>
                        <td><b>${formatoCOP(totalMesGlobal)}</b></td>
                    </tr>
                </tbody>
            </table>

            <div class="firma">
                ____________________________<br>
                Firma responsable
            </div>
        </div>
    `);
});

/* ================= IMPRESIÓN BASE (MISMA DEL DIARIO) ================= */
function imprimirHTML(html) {
    const w = window.open("", "_blank");
    w.document.write(`
        <html>
        <head>
            <style>
                body { font-family: Arial; padding: 30px; }
                .factura { border: 2px solid #000; padding: 25px; max-width: 800px; margin:auto; }
                h2,h4 { text-align:center; margin:5px; }
                table { width:100%; border-collapse:collapse; margin-top:15px; }
                th,td { border:1px solid #000; padding:8px; text-align:center; }
                th { background:#f2f2f2; }
                .linea { border-top:1px dashed #000; margin:20px 0; }
                .firma { margin-top:40px; text-align:center; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${html}
        </body>
        </html>
    `);
    w.document.close();
}

/* ================= UTILIDADES ================= */
function formatoCOP(valor) {
    return Number(valor).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    });
}

function fechaCOL(fecha) {
    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "medium"
    });
}
