import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

/* ===== DOM ===== */
const mensaje = document.getElementById("mensaje");
const btnPago = document.getElementById("btnPago");

/* ===== ENTER ===== */
document.addEventListener("keydown", e => {
    if (e.key === "Enter") btnPago.click();
});

/* ===== REGISTRAR PAGO ===== */
btnPago.onclick = async () => {
    mensaje.textContent = "";
    mensaje.style.color = "red";

    const placa = document.getElementById("placa").value.trim().toUpperCase();
    const monto = Number(document.getElementById("monto").value);
    const fechaPagoDestino = document.getElementById("fecha").value;
    const usuarioId = localStorage.getItem("usuario_id");

    if (!placa || !monto || !fechaPagoDestino) {
        mensaje.textContent = "Complete todos los campos";
        return;
    }

    const { data: moto, error: errorMoto } = await supabase
        .from("motos")
        .select("id, placa, nombre, usuario_creador")
        .eq("placa", placa)
        .single();

    if (errorMoto || !moto) {
        mensaje.textContent = "Moto no encontrada";
        return;
    }

    if (moto.usuario_creador !== usuarioId) {
        mensaje.textContent = "❌ No puedes registrar pagos de esta moto";
        return;
    }

    const { data: usuario } = await supabase
        .from("usuarios")
        .select("nombre_completo")
        .eq("id", usuarioId)
        .single();

    if (!usuario || !usuario.nombre_completo) {
        mensaje.textContent = "❌ El usuario no tiene nombre asignado";
        return;
    }

    const nombreEmpleado = usuario.nombre_completo;

    const { data: pagoExistente } = await supabase
        .from("pagos")
        .select("id")
        .eq("moto_id", moto.id)
        .eq("fecha_pago", fechaPagoDestino)
        .limit(1);

    if (pagoExistente && pagoExistente.length > 0) {
        mensaje.textContent = "❌ Ya existe un pago para esa fecha";
        return;
    }

    const { data: ultimoPago } = await supabase
        .from("pagos")
        .select("consecutivo")
        .eq("usuario_creador", usuarioId)
        .order("consecutivo", { ascending: false })
        .limit(1)
        .maybeSingle();

    const consecutivo = ultimoPago?.consecutivo ? ultimoPago.consecutivo + 1 : 1;
    const fechaHoraRecibido = new Date().toISOString();

    const { error } = await supabase.from("pagos").insert([{
        moto_id: moto.id,
        usuario_id: usuarioId,
        usuario_creador: usuarioId,
        monto,
        consecutivo,
        fecha_pago: fechaPagoDestino,
        fecha_sin_hora: fechaPagoDestino,
        fecha: fechaHoraRecibido
    }]);

    if (error) {
        mensaje.textContent = "❌ Error al registrar el pago";
        return;
    }

    mensaje.style.color = "lime";
    mensaje.textContent = "✅ Pago registrado correctamente";

    generarFactura({
        consecutivo,
        placa: moto.placa,
        propietario: moto.nombre,
        monto,
        empleado: nombreEmpleado,
        caja: `Caja ${consecutivo}`,
        fechaPago: formatearFecha(fechaPagoDestino),
        fechaHoraRecibido: formatearFechaHora(fechaHoraRecibido)
    });

    document.getElementById("placa").value = "";
    document.getElementById("monto").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("placa").focus();
};

/* ===== FACTURA ===== */
function generarFactura(d) {
    imprimirHTML(`
        <div class="factura">
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
    `);
}

/* ================= IMPRESIÓN BASE (DIG-E200I) ================= */
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
                p { margin: 3px 0; font-size: 11px; word-break: break-word; }
                .linea { border-top: 1px dashed #000; margin: 6px 0; }
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

/* ===== UTILIDADES ===== */
function formatoCOP(valor) {
    return Number(valor).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    });
}

function formatearFecha(fecha) {
    return new Date(fecha + "T00:00:00").toLocaleDateString("es-CO");
}

function formatearFechaHora(fecha) {
    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "medium"
    });
}


