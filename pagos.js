import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

/* ===== DOM ===== */
const mensaje = document.getElementById("mensaje");
const btnPago = document.getElementById("btnPago");
const placaInput = document.getElementById("placa");
const cuotasInput = document.getElementById("cuotas");
const cuotaInicialInput = document.getElementById("cuota_inicial");

/* ===== ENTER ===== */
document.addEventListener("keydown", e => {
    if (e.key === "Enter") btnPago.click();
});

/* ===== AUTOCALCULAR CUOTA ===== */
placaInput.addEventListener("blur", async () => {
    const placa = placaInput.value.trim().toUpperCase();
    if (!placa) return;

    cuotasInput.value = "";
    cuotaInicialInput.value = "";
    cuotaInicialInput.disabled = true;

    const { data: moto } = await supabase
        .from("motos")
        .select("id")
        .eq("placa", placa)
        .single();

    if (!moto) return;

    const { data: ultimoPago } = await supabase
        .from("pagos")
        .select("cuotas")
        .eq("moto_id", moto.id)
        .order("cuotas", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (ultimoPago?.cuotas) {
        cuotasInput.value = ultimoPago.cuotas + 1;
        cuotaInicialInput.disabled = true;
    } else {
        cuotaInicialInput.disabled = false;
    }
});

/* ===== REGISTRAR PAGO ===== */
btnPago.onclick = async () => {
    mensaje.textContent = "";
    mensaje.style.color = "red";

    const placa = placaInput.value.trim().toUpperCase();
    const total = Number(document.getElementById("monto").value);
    const fechaPago = document.getElementById("fecha").value;
    const usuarioId = localStorage.getItem("usuario_id");
    const cuotaInicial = Number(cuotaInicialInput.value) || 0;

    if (!placa || !total || !fechaPago) {
        mensaje.textContent = "Complete todos los campos";
        return;
    }

    /* ===== MOTO ===== */
    const { data: moto } = await supabase
        .from("motos")
        .select("id, placa, nombre, usuario_creador")
        .eq("placa", placa)
        .single();

    if (!moto) {
        mensaje.textContent = "Moto no encontrada";
        return;
    }

    if (moto.usuario_creador !== usuarioId) {
        mensaje.textContent = "❌ No puedes registrar pagos de esta moto";
        return;
    }

    /* ===== USUARIO ===== */
    const { data: usuario } = await supabase
        .from("usuarios")
        .select("nombre_completo")
        .eq("id", usuarioId)
        .single();

    if (!usuario?.nombre_completo) {
        mensaje.textContent = "Usuario sin nombre";
        return;
    }

    const nombreEmpleado = usuario.nombre_completo;

    const montoPorCuota = cuotaInicial > 0
        ? Math.round(total / cuotaInicial)
        : total;

    /* ===== SOLO HISTÓRICO (CUOTA INICIAL) ===== */
    if (cuotaInicial > 0) {
        await generarCuotasIniciales(
            moto.id,
            cuotaInicial,
            montoPorCuota,
            fechaPago,
            usuarioId
        );

        mensaje.style.color = "lime";
        mensaje.textContent = "✅ Cuotas iniciales registradas correctamente";
        return; // ⛔ AQUÍ SE ACABA TODO
    }

    /* ===== CUOTA ACTUAL ===== */
    let cuotaActual = 1;
    const { data: ultimoPago } = await supabase
        .from("pagos")
        .select("cuotas")
        .eq("moto_id", moto.id)
        .order("cuotas", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (ultimoPago?.cuotas) cuotaActual = ultimoPago.cuotas + 1;

    /* ===== BLOQUEAR FECHA ===== */
    const { data: existeFecha } = await supabase
        .from("pagos")
        .select("id")
        .eq("moto_id", moto.id)
        .eq("fecha_pago", fechaPago)
        .limit(1);

    if (existeFecha.length) {
        mensaje.textContent = "❌ Ya existe un pago para esa fecha";
        return;
    }

    /* ===== CONSECUTIVO ===== */
    const { data: ultimoRecibo } = await supabase
        .from("pagos")
        .select("consecutivo")
        .eq("usuario_creador", usuarioId)
        .order("consecutivo", { ascending: false })
        .limit(1)
        .maybeSingle();

    const consecutivo = ultimoRecibo?.consecutivo
        ? ultimoRecibo.consecutivo + 1
        : 1;

    const fechaHora = new Date().toISOString();

    /* ===== INSERT PAGO NORMAL ===== */
    await supabase.from("pagos").insert([{
        moto_id: moto.id,
        usuario_id: usuarioId,
        usuario_creador: usuarioId,
        monto: montoPorCuota,
        cuotas: cuotaActual,
        consecutivo,
        fecha_pago: fechaPago,
        fecha_sin_hora: fechaPago,
        fecha: fechaHora
    }]);

    mensaje.style.color = "lime";
    mensaje.textContent = "✅ Pago registrado correctamente";

    generarFactura({
        consecutivo,
        placa: moto.placa,
        propietario: moto.nombre,
        monto: montoPorCuota,
        cuotas: cuotaActual,
        empleado: nombreEmpleado,
        fechaPago: formatearFecha(fechaPago),
        fechaHoraRecibido: formatearFechaHora(fechaHora)
    });

    placaInput.value = "";
    document.getElementById("monto").value = "";
    cuotasInput.value = "";
    cuotaInicialInput.value = "";
    cuotaInicialInput.disabled = false;
    document.getElementById("fecha").value = "";
    placaInput.focus();
};

/* ===== CUOTAS INICIALES DESDE FECHA EXACTA ===== */
async function generarCuotasIniciales(motoId, cantidad, monto, fechaBase, usuarioId) {
    const pagos = [];
    let fecha = new Date(fechaBase);

    for (let i = cantidad; i >= 1; i--) {
        const fechaISO = fecha.toISOString().split("T")[0];

        pagos.push({
            moto_id: motoId,
            usuario_id: usuarioId,
            usuario_creador: usuarioId,
            monto,
            cuotas: i,
            fecha_pago: fechaISO,
            fecha_sin_hora: fechaISO,
            fecha: fecha.toISOString()
        });

        fecha.setDate(fecha.getDate() - 1);
    }

    await supabase.from("pagos").insert(pagos);
}

/* ===== FACTURA (INTOCABLE) ===== */
function generarFactura(d) {
    imprimirHTML(`
        <div class="factura">
            <h2>Dios Proveerá Moto</h2>
            <div class="direccion">
                Barrio La Gloria II - Calle Los Amigos Cra 63A#13D-46<br>
                Cartagena de Indias
            </div>
            <p><strong>No. Recibo:</strong> ${String(d.consecutivo).padStart(3,"0")}</p>
            <p><strong>Placa:</strong> ${d.placa}</p>
            <p><strong>Propietario:</strong> ${d.propietario}</p>
            <div class="linea"></div>
            <p><strong>Fecha a la que va el pago:</strong> ${d.fechaPago}</p>
            <p><strong>Fecha y hora recibido:</strong> ${d.fechaHoraRecibido}</p>
            <p><strong>Cuota:</strong> ${d.cuotas}</p>
            <p><strong>Atendido por:</strong> ${d.empleado}</p>
            <div class="linea"></div>
            <p class="valor">${formatoCOP(d.monto)}</p>
            <div class="firma">____________________________<br>Firma</div>
        </div>
    `);
}

/* ===== IMPRESIÓN ===== */
function imprimirHTML(html) {
    const v = window.open("", "_blank");
    v.document.write(`
        <html>
        <head>
            <style>
                @page { size: 80mm auto; margin: 0 }
                body { font-family: Arial; width: 60mm }
                .factura { padding: 3mm }
                h2 { text-align: center }
                .direccion { text-align: center; font-size: 10px }
                p { font-size: 11px; margin: 3px 0 }
                .linea { border-top: 1px dashed #000; margin: 6px 0 }
                .valor { text-align: center; font-size: 15px; font-weight: bold }
                .firma { text-align: center; margin-top: 18px; font-size: 10px }
            </style>
        </head>
        <body onload="window.print();window.close()">
            ${html}
        </body>
        </html>
    `);
    v.document.close();
}

/* ===== UTILIDADES ===== */
function formatoCOP(v) {
    return Number(v).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    });
}
function formatearFecha(f) {
    return new Date(f + "T00:00:00").toLocaleDateString("es-CO");
}
function formatearFechaHora(f) {
    return new Date(f).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "medium"
    });
}
