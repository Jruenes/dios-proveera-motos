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

/* ================= VARIABLES ================= */
let pagosGlobal = [];
let fichaMoto = null;

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
        tabla.innerHTML = `<tr><td colspan="4">❌ Error al consultar</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4">No hay pagos registrados</td></tr>`;
        return;
    }

    pagosGlobal = data;

    fichaMoto = {
        placa: data[0].placa,
        propietario: data[0].propietario
    };

    let total = 0;

    pagosGlobal.forEach(p => {
        total += Number(p.monto);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fechaSolo(p.fecha_pago)}</td>
            <td>${formatoCOP(p.monto)}</td>
            <td>${p.empleado}</td>
            <td>
                <button class="btnImprimir" data-id="${p.pago_id}">🖨️</button>
            </td>
        `;
        tabla.appendChild(tr);
    });

    totalTxt.innerHTML = `
        💰 Total pagado: <strong>${formatoCOP(total)}</strong><br><br>
        <button id="btnImprimirTotal">🖨️ Imprimir total</button>
    `;

    document.querySelectorAll(".btnImprimir").forEach(btn => {
        btn.addEventListener("click", () => {
            const pago = pagosGlobal.find(p => p.pago_id === btn.dataset.id);
            imprimirPago(pago);
        });
    });

    document
        .getElementById("btnImprimirTotal")
        .addEventListener("click", imprimirResumen);
});

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
                    <th>Fecha del pago</th>
                    <th>Monto</th>
                </tr>
                ${filas}
                <tr>
                    <td><strong>Total</strong></td>
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
                body { font-family: Arial; padding: 30px; }
                .factura {
                    border: 2px solid #000;
                    padding: 25px;
                    max-width: 600px;
                    margin: auto;
                }
                h2 {
                    text-align: center;
                    margin-bottom: 5px;
                }
                .direccion {
                    text-align: center;
                    font-size: 13px;
                    margin-bottom: 10px;
                }
                p { margin: 6px 0; font-size: 15px; }
                .linea { border-top: 1px dashed #000; margin: 12px 0; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    text-align: center;
                }
                .valor {
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                }
                .firma {
                    margin-top: 45px;
                    text-align: center;
                }
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

/*
    fecha_pago viene de Supabase como DATE (YYYY-MM-DD)
    NO se debe convertir con Date() porque resta un día
*/
function fechaSolo(fecha) {
    if (!fecha) return "";
    const [yyyy, mm, dd] = fecha.split("-");
    return `${dd}/${mm}/${yyyy}`;
}

/*
    created_at viene como TIMESTAMP (ISO)
    Aquí SÍ es correcto aplicar zona horaria
*/
function fechaHoraCOL(fecha) {
    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "medium"
    });
}
