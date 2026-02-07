import { supabase } from "./supabase.js";

/* ================= SEGURIDAD ================= */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

const rol = localStorage.getItem("rol_actual");
const usuarioId = localStorage.getItem("usuario_id");

/* ================= DOM ================= */
const btnBuscar = document.getElementById("btnBuscar");
const tabla = document.getElementById("tabla");
const totalTxt = document.getElementById("total");
const thEliminar = document.getElementById("thEliminar");

/* ================= VARIABLES ================= */
let pagosGlobal = [];
let fichaMoto = null;

/* ================= MOSTRAR COLUMNA ELIMINAR SOLO ADMIN ================= */
if (rol === "administrador") {
    thEliminar.style.display = "table-cell";
}

/* ================= ENTER ================= */
document.addEventListener("keydown", e => {
    if (e.key === "Enter") btnBuscar.click();
});

/* ================= BUSCAR HISTORIAL ================= */
btnBuscar.addEventListener("click", async () => {
    tabla.innerHTML = "";
    totalTxt.innerHTML = "";
    pagosGlobal = [];
    fichaMoto = null;

    const placa = document.getElementById("placa").value.trim().toUpperCase();
    if (!placa) return;

    let query = supabase
        .from("vista_reporte_pagos")
        .select(`
            pago_id,
            consecutivo,
            placa,
            propietario,
            empleado_id,
            empleado,
            monto,
            cuotas,
            fecha_pago,
            created_at
        `)
        .eq("placa", placa)
        .order("fecha_pago", { ascending: true });

    if (rol === "empleado") {
        query = query.eq("empleado_id", usuarioId);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        tabla.innerHTML = `<tr><td colspan="6">❌ Error al consultar</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="6">No hay pagos registrados</td></tr>`;
        return;
    }

    pagosGlobal = data;

    fichaMoto = {
        placa: data[0].placa,
        propietario: data[0].propietario
    };

    pintarTablaPagos();
    pintarTotal();
    enlazarBotonesImprimir();
    enlazarBotonesEliminar();
});

/* ================= PINTAR TABLA ================= */
function pintarTablaPagos() {
    tabla.innerHTML = "";

    pagosGlobal.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${fechaSolo(p.fecha_pago)}</td>
            <td>${p.cuotas}</td>
            <td>${formatoCOP(p.monto)}</td>
            <td>${p.empleado}</td>
            <td style="text-align:center;">
                <button class="btnImprimir" data-id="${p.pago_id}">🖨️</button>
            </td>
            ${
                rol === "administrador"
                    ? `<td style="text-align:center;">
                        <button class="btnEliminarPago" data-id="${p.pago_id}">🗑️</button>
                       </td>`
                    : ``
            }
        `;

        tabla.appendChild(tr);
    });
}

/* ================= TOTAL ================= */
function pintarTotal() {
    let total = pagosGlobal.reduce((s, p) => s + Number(p.monto), 0);

    totalTxt.innerHTML = `
        💰 Total pagado: <strong>${formatoCOP(total)}</strong><br><br>
        <button id="btnImprimirTotal">🖨️ Imprimir total</button>
    `;

    document
        .getElementById("btnImprimirTotal")
        .addEventListener("click", imprimirResumen);
}

/* ================= ENLAZAR IMPRIMIR ================= */
function enlazarBotonesImprimir() {
    document.querySelectorAll(".btnImprimir").forEach(btn => {
        btn.addEventListener("click", () => {
            const pago = pagosGlobal.find(p => p.pago_id === btn.dataset.id);
            imprimirPago(pago);
        });
    });
}

/* ================= VALIDAR CLAVE ADMIN ================= */
async function validarClaveAdmin(clave) {
    const { data, error } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol", "administrador")
        .eq("password", clave)
        .eq("activo", true)
        .eq("eliminado", false)
        .limit(1);

    if (error) {
        console.error(error);
        return false;
    }

    return data && data.length > 0;
}

/* ================= ELIMINAR PAGO ================= */
function enlazarBotonesEliminar() {
    if (rol !== "administrador") return;

    document.querySelectorAll(".btnEliminarPago").forEach(btn => {
        btn.addEventListener("click", async () => {
            const pagoId = btn.dataset.id;

            if (!confirm("⚠️ ¿Seguro que deseas eliminar este pago?")) return;

            const clave = prompt("🔑 Ingresa la clave del administrador:");
            if (!clave) return;

            const esAdmin = await validarClaveAdmin(clave);
            if (!esAdmin) {
                alert("❌ Clave incorrecta");
                return;
            }

            const { error } = await supabase
                .from("pagos")
                .delete()
                .eq("id", pagoId);

            if (error) {
                alert("❌ Error eliminando el pago");
                return;
            }

            alert("✅ Pago eliminado");

            pagosGlobal = pagosGlobal.filter(p => p.pago_id !== pagoId);

            pintarTablaPagos();
            pintarTotal();
            enlazarBotonesImprimir();
            enlazarBotonesEliminar();
        });
    });
}

/* ================= IMPRIMIR PAGO ================= */
function imprimirPago(p) {
    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>

            <div class="direccion">
                Barrio La Gloria II - Calle Los Amigos Cra 63A#13D-46<br>
                Cartagena de Indias
            </div>

            <p><strong>No. Recibo:</strong> ${String(p.consecutivo).padStart(3, "0")}</p>
            <p><strong>Placa:</strong> ${p.placa}</p>
            <p><strong>Propietario:</strong> ${p.propietario}</p>

            <div class="linea"></div>

            <p><strong>Fecha del pago:</strong> ${fechaSolo(p.fecha_pago)}</p>
            <p><strong>Fecha de registro:</strong> ${fechaHoraCOL(p.created_at)}</p>
            <p><strong>Cuota:</strong> ${p.cuotas}</p>
            <p><strong>Atendido por:</strong> ${p.empleado}</p>

            <div class="linea"></div>

            <p class="valor">${formatoCOP(p.monto)}</p>

            <div class="firma">
                ____________________________<br>
                Firma
            </div>
        </div>
    `);
}

/* ================= IMPRIMIR RESUMEN ================= */
function imprimirResumen() {
    let total = pagosGlobal.reduce((s, p) => s + Number(p.monto), 0);

    let filas = pagosGlobal.map(p => `
        <tr>
            <td>${fechaSolo(p.fecha_pago)}</td>
            <td>Cuota ${p.cuotas}</td>
            <td>${formatoCOP(p.monto)}</td>
        </tr>
    `).join("");

    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>

            <div class="direccion">
                Barrio La Gloria II - Calle Los Amigos Cra 63A#13D-46<br>
                Cartagena de Indias
            </div>

            <p><strong>Placa:</strong> ${fichaMoto.placa}</p>
            <p><strong>Propietario:</strong> ${fichaMoto.propietario}</p>

            <div class="linea"></div>

            <table>
                <tr>
                    <th>Fecha</th>
                    <th>Cuota</th>
                    <th>Monto</th>
                </tr>
                ${filas}
                <tr>
                    <td colspan="2"><strong>Total</strong></td>
                    <td><strong>${formatoCOP(total)}</strong></td>
                </tr>
            </table>

            <div class="firma">
                ____________________________<br>
                Firma
            </div>
        </div>
    `);
}

/* ================= IMPRESIÓN BASE ================= */
function imprimirHTML(html) {
    const v = window.open("", "_blank");
    v.document.write(`
        <html>
        <head>
            <style>
                @page { size: 80mm auto; margin: 0; }
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 60mm; }
                .factura { width: 60mm; padding: 3mm; }
                h2 { text-align: center; margin: 4px 0; font-size: 14px; }
                .direccion { text-align: center; font-size: 10px; margin-bottom: 6px; }
                p { margin: 3px 0; font-size: 11px; }
                .linea { border-top: 1px dashed #000; margin: 6px 0; }
                table { width: 100%; font-size: 10px; border-collapse: collapse; }
                th, td { padding: 3px; text-align: center; }
                .valor { font-size: 15px; font-weight: bold; text-align: center; }
                .firma { margin-top: 18px; text-align: center; font-size: 10px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${html}
        </body>
        </html>
    `);
    v.document.close();
}

/* ================= UTILIDADES ================= */
function formatoCOP(valor) {
    return Number(valor).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    });
}

function fechaSolo(fecha) {
    if (!fecha) return "";
    const [yyyy, mm, dd] = fecha.split("-");
    return `${dd}/${mm}/${yyyy}`;
}

function fechaHoraCOL(fecha) {
    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "medium"
    });
}
