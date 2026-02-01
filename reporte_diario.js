import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

/* ===== DOM ===== */
const fechaInput = document.getElementById("fecha");
const usuarioFiltro = document.getElementById("usuarioFiltro");
const btnBuscar = document.getElementById("btnBuscar");
const tabla = document.getElementById("tabla");
const totalTxt = document.getElementById("totalDia");
const btnImprimirTotal = document.getElementById("btnImprimirTotal");

const pagaronHoyTxt = document.getElementById("pagaronHoy");
const noPagaronHoyTxt = document.getElementById("noPagaronHoy");

const tablaNoPagaronBody = document.getElementById("tablaNoPagaronBody");

/* ===== SESIÓN ===== */
const rol = localStorage.getItem("rol_actual");
const usuarioId = localStorage.getItem("usuario_id");

/* ===== VARIABLES GLOBALES ===== */
let registros = [];
let fechaGlobal = "";
let motosSinPagoGlobal = [];

/* ===== SOLO ADMIN VE FILTRO ===== */
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
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre_completo;
        usuarioFiltro.appendChild(opt);
    });
}

/* ===== BUSCAR REPORTE ===== */
btnBuscar.onclick = async () => {
    tabla.innerHTML = "";
    tablaNoPagaronBody.innerHTML = "";
    totalTxt.textContent = "$0";
    pagaronHoyTxt.textContent = "0";
    noPagaronHoyTxt.textContent = "0";

    registros = [];
    motosSinPagoGlobal = [];

    const fecha = fechaInput.value;
    const empleadoId = usuarioFiltro.value;
    fechaGlobal = fecha;

    if (!fecha) {
        alert("Seleccione una fecha");
        return;
    }

    /* ===== PAGOS DEL DÍA ===== */
    let query = supabase
        .from("reporte_diario")
        .select("*")
        .eq("fecha_sin_hora", fecha);

    if (rol === "empleado") query = query.eq("empleado_id", usuarioId);
    if (rol === "administrador" && empleadoId) query = query.eq("empleado_id", empleadoId);

    const { data: pagos } = await query;

    let total = 0;

    if (pagos && pagos.length > 0) {
        registros = pagos;

        pagos.forEach((r, index) => {
            total += Number(r.monto);
            tabla.innerHTML += `
                <tr>
                    <td>${r.empleado}</td>
                    <td>${r.placa}</td>
                    <td>${r.propietario}</td>
                    <td>${formatoCOP(r.monto)}</td>
                    <td>${r.fecha_sin_hora}</td>
                    <td>
                        <button onclick="imprimirPago(${index})">🖨</button>
                    </td>
                </tr>
            `;
        });

        totalTxt.textContent = formatoCOP(total);
        pagaronHoyTxt.textContent = pagos.length;
    } else {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px;">
                    😊 No hay pagos registrados para esta fecha
                </td>
            </tr>
        `;
    }

    /* ===== MOTOS SIN PAGO ===== */
    let motosQuery = supabase
        .from("motos")
        .select("id, placa, nombre, usuario_creador");

    if (rol === "empleado") motosQuery = motosQuery.eq("usuario_creador", usuarioId);
    if (rol === "administrador" && empleadoId) motosQuery = motosQuery.eq("usuario_creador", empleadoId);

    const { data: motos } = await motosQuery;

    const placasPagadas = registros.map(r => r.placa);
    motosSinPagoGlobal = motos.filter(m => !placasPagadas.includes(m.placa));

    noPagaronHoyTxt.textContent = motosSinPagoGlobal.length;

    if (motosSinPagoGlobal.length === 0) {
        tablaNoPagaronBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center;">
                    🎉 Todas las motos pagaron hoy
                </td>
            </tr>
        `;
        return;
    }

    for (const m of motosSinPagoGlobal) {
        const { data: emp } = await supabase
            .from("usuarios")
            .select("nombre_completo")
            .eq("id", m.usuario_creador)
            .single();

        tablaNoPagaronBody.innerHTML += `
            <tr>
                <td>${m.placa}</td>
                <td>${m.nombre}</td>
                <td>${emp?.nombre_completo || ""}</td>
            </tr>
        `;
    }
};

/* ===== IMPRIMIR INDIVIDUAL (FIX DEFINITIVO) ===== */
window.imprimirPago = (index) => {
    const r = registros[index];

    generarFactura({
        caja: "CAJA 1",
        consecutivo: r.consecutivo,
        placa: r.placa,
        propietario: r.propietario,
        empleado: r.empleado,
        monto: r.monto,
        fechaPago: r.fecha_sin_hora,
        fechaHoraRecibido: new Date().toLocaleString("es-CO")
    });
};

/* ===== IMPRIMIR TOTAL DEL DÍA ===== */
btnImprimirTotal.onclick = () => {
    if (registros.length === 0) {
        alert("No hay datos para imprimir.");
        return;
    }

    let total = 0;

    const filasPagaron = registros.map(r => {
        total += Number(r.monto);
        return `
            <tr>
                <td>${r.placa}</td>
                <td>${r.propietario}</td>
                <td>${r.fecha_sin_hora}</td>
                <td>${formatoCOP(r.monto)}</td>
            </tr>
        `;
    }).join("");

    const filasNoPagaron = motosSinPagoGlobal.map(m => `
        <tr>
            <td>${fechaGlobal}</td>
            <td>${m.placa}</td>
            <td>${m.nombre}</td>
        </tr>
    `).join("");

    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>
            <h4>Reporte Diario</h4>

            <table>
                <tr>
                    <th>Fecha</th>
                    <th>Motos que pagaron</th>
                    <th>Motos que no pagaron</th>
                </tr>
                <tr>
                    <td>${fechaGlobal}</td>
                    <td>${pagaronHoyTxt.textContent}</td>
                    <td>${noPagaronHoyTxt.textContent}</td>
                </tr>
            </table>

            <div class="linea"></div>

            <table>
                <thead>
                    <tr>
                        <th>Placa</th>
                        <th>Propietario</th>
                        <th>Fecha</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasPagaron}
                    <tr>
                        <td colspan="3"><b>Total del día</b></td>
                        <td><b>${formatoCOP(total)}</b></td>
                    </tr>
                </tbody>
            </table>

            <div class="linea"></div>

            <h4>Motos sin pago registrado</h4>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Placa</th>
                        <th>Propietario</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasNoPagaron || `<tr><td colspan="3">Todas las motos pagaron</td></tr>`}
                </tbody>
            </table>

            <div class="firma">
                ____________________________<br>
                Firma responsable
            </div>
        </div>
    `);
};

/* ===== IMPRESIÓN BASE ===== */
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

/* ===== FACTURA INDIVIDUAL (INTOCABLE) ===== */
function generarFactura(d) {
    const v = window.open("", "_blank");

    v.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Recibo</title>
<style>
body { font-family: Arial; padding: 30px; }
.factura { border: 2px solid #000; padding: 25px; max-width: 600px; margin: auto; position: relative; }
h2 { text-align: center; margin-bottom: 5px; }
.direccion { text-align: center; font-size: 13px; margin-bottom: 10px; }
.caja { position: absolute; top: 20px; right: 20px; font-weight: bold; }
p { margin: 6px 0; font-size: 15px; }
.linea { border-top: 1px dashed #000; margin: 12px 0; }
.valor { font-size: 18px; font-weight: bold; text-align: center; }
.firma { margin-top: 45px; text-align: center; }
</style>
</head>

<body onload="window.print(); window.close();">
<div class="factura">

<div class="caja">${d.caja}</div>

<h2>Dios Proveerá Moto</h2>
<div class="direccion">
Barrio La Gloria II - Calle Los Amigos Cra 63A#13D-46<br>
Cartagena de Indias
</div>

<p><strong>No. Recibo:</strong> ${String(d.consecutivo).padStart(3, "0")}</p>
<p><strong>Placa:</strong> ${d.placa}</p>
<p><strong>Propietario:</strong> ${d.propietario}</p>

<div class="linea"></div>

<p><strong>Fecha a la que va el pago:</strong> ${d.fechaPago}</p>
<p><strong>Fecha y hora recibido:</strong> ${d.fechaHoraRecibido}</p>
<p><strong>Atendido por:</strong> ${d.empleado}</p>

<div class="linea"></div>

<p class="valor">${formatoCOP(d.monto)}</p>

<div class="firma">
____________________________<br>
Firma
</div>

</div>
</body>
</html>
    `);

    v.document.close();
}

/* ===== FORMATO COP ===== */
function formatoCOP(valor) {
    return Number(valor).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    });
}

/* ===== ENTER ===== */
document.addEventListener("keydown", e => {
    if (e.key === "Enter") btnBuscar.click();
});
