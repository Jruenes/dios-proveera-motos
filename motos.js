import { supabase } from "./supabase.js";

/* ===== SEGURIDAD ===== */
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}

const mensaje = document.getElementById("mensaje");

/* ===== MOSTRAR / OCULTAR CODEUDOR ===== */
const radiosCodeudor = document.querySelectorAll('input[name="codeudor"]');
const formCodeudor = document.getElementById("formCodeudor");

radiosCodeudor.forEach(radio => {
    radio.addEventListener("change", () => {
        formCodeudor.style.display = radio.value === "si" ? "block" : "none";
    });
});

/* ===== REGISTRAR MOTO ===== */
document.getElementById("btnRegistrar").onclick = async () => {
    const usuarioId = localStorage.getItem("usuario_id");

    const placa = document.getElementById("placa").value.trim().toUpperCase();
    const nombre = document.getElementById("nombre").value.trim();
    const cedula = document.getElementById("cedula").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    const tieneCodeudor = document.querySelector('input[name="codeudor"]:checked').value === "si";

    mensaje.textContent = "";
    mensaje.style.color = "red";

    if (!placa || !nombre || !cedula) {
        mensaje.textContent = "Complete los campos obligatorios";
        return;
    }

    /* ===== VERIFICAR PLACA ===== */
    const { data: existe } = await supabase
        .from("motos")
        .select("id")
        .eq("placa", placa)
        .limit(1);

    if (existe && existe.length > 0) {
        mensaje.textContent = "⚠️ Esta moto ya está registrada";
        return;
    }

    /* ===== INSERTAR MOTO ===== */
    const { data: motoInsertada, error } = await supabase
        .from("motos")
        .insert([{
            placa,
            nombre,
            cedula,
            direccion,
            telefono,
            usuario_creador: usuarioId
        }])
        .select()
        .single();

    if (error) {
        mensaje.textContent = "❌ Error al registrar la moto";
        return;
    }

    /* ===== INSERTAR CODEUDOR (SI EXISTE) ===== */
    if (tieneCodeudor) {
        const codeudorNombre = document.getElementById("codeudorNombre").value.trim();
        const codeudorCedula = document.getElementById("codeudorCedula").value.trim();
        const codeudorDireccion = document.getElementById("codeudorDireccion").value.trim();
        const codeudorTelefono = document.getElementById("codeudorTelefono").value.trim();

        if (!codeudorNombre || !codeudorCedula) {
            mensaje.textContent = "⚠️ Complete los datos del codeudor";
            return;
        }

        await supabase.from("codeudores").insert([{
            moto_id: motoInsertada.id,
            nombre: codeudorNombre,
            cedula: codeudorCedula,
            direccion: codeudorDireccion,
            telefono: codeudorTelefono
        }]);
    }

    mensaje.style.color = "lime";
    mensaje.textContent = "✅ Moto registrada correctamente";

    document.querySelectorAll("input").forEach(i => {
        if (i.type !== "radio") i.value = "";
        if (i.type === "radio" && i.value === "no") i.checked = true;
    });

    formCodeudor.style.display = "none";
};
