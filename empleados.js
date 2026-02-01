import { supabase } from "./supabase.js";

/* ===== ELEMENTOS DEL DOM ===== */
const nombreInput = document.getElementById("nombre");
const usuarioInput = document.getElementById("usuario");
const passwordInput = document.getElementById("password");
const rolSelect = document.getElementById("rol");
const mensaje = document.getElementById("mensaje");
const tabla = document.getElementById("tablaUsuarios");
const btnGuardar = document.getElementById("btnGuardar");

let usuarioEditando = null;

/* ===== CARGAR USUARIOS ===== */
async function cargarUsuarios() {
    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("nombre_completo");

    if (error) {
        mensaje.textContent = "❌ Error al cargar usuarios: " + error.message;
        return;
    }

    tabla.innerHTML = "";

    data
        .filter(u => !u.eliminado)
        .forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u.nombre_completo}</td>
                <td>${u.usuario}</td>
                <td>
                    <span id="pass-${u.id}">••••••</span>
                    <button class="btn-ver" data-id="${u.id}" data-pass="${u.password}">👁</button>
                </td>
                <td>${u.rol}</td>
                <td>${u.activo ? "Activo" : "Inactivo"}</td>
                <td>
                    <button onclick="editarUsuario('${u.id}')">Editar</button>
                    <button onclick="cambiarEstado('${u.id}', ${u.activo})">
                        ${u.activo ? "Deshabilitar" : "Habilitar"}
                    </button>
                    <button onclick="eliminarUsuario('${u.id}')">Eliminar</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
}

/* ===== VER / OCULTAR PASSWORD CON ADMIN REAL ===== */
tabla.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("btn-ver")) return;

    const span = document.getElementById(`pass-${e.target.dataset.id}`);
    const passwordReal = e.target.dataset.pass;

    // Si ya está visible, solo ocultar (sin pedir nada)
    if (span.textContent !== "••••••") {
        span.textContent = "••••••";
        return;
    }

    // Si está oculto, pedir usuario y clave de admin
    const usuarioAdmin = prompt("Ingrese usuario administrador:");
    const claveAdmin = prompt("Ingrese contraseña del administrador:");

    if (!usuarioAdmin || !claveAdmin) {
        alert("❌ Debe ingresar usuario y contraseña");
        return;
    }

    // Validar en la base de datos
    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("usuario", usuarioAdmin)
        .eq("rol", "administrador")
        .eq("password", claveAdmin) // si usas hash, habría que validar distinto
        .single();

    if (error || !data) {
        alert("❌ Usuario o contraseña de administrador incorrectos");
        return;
    }

    // Mostrar contraseña
    span.textContent = passwordReal;
});

/* ===== GUARDAR / ACTUALIZAR USUARIO ===== */
btnGuardar.onclick = async () => {
    mensaje.textContent = "";
    mensaje.style.color = "red";

    const nombre = nombreInput.value.trim();
    const usuario = usuarioInput.value.trim();
    const password = passwordInput.value.trim();
    const rol = rolSelect.value;

    if (!nombre || !usuario || !rol) {
        mensaje.textContent = "Complete los campos obligatorios";
        return;
    }

    if (usuarioEditando) {
        const updateData = { nombre_completo: nombre, usuario, rol };
        if (password) updateData.password = password;

        const { error } = await supabase
            .from("usuarios")
            .update(updateData)
            .eq("id", usuarioEditando);

        if (error) {
            mensaje.textContent = "❌ Error al actualizar: " + error.message;
            return;
        }

        mensaje.style.color = "lime";
        mensaje.textContent = "Usuario actualizado";
    } else {
        if (!password) {
            mensaje.textContent = "La contraseña es obligatoria al crear un usuario";
            return;
        }

        const { error } = await supabase
            .from("usuarios")
            .insert([{
                nombre_completo: nombre,
                usuario,
                password,
                rol,
                activo: true,
                eliminado: false
            }]);

        if (error) {
            mensaje.textContent = "❌ Error al crear usuario: " + error.message;
            return;
        }

        mensaje.style.color = "lime";
        mensaje.textContent = "✅ Usuario creado correctamente";
    }

    limpiar();
    cargarUsuarios();
};

/* ===== EDITAR ===== */
window.editarUsuario = async (id) => {
    const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single();

    if (!data) return;

    usuarioEditando = id;
    nombreInput.value = data.nombre_completo;
    usuarioInput.value = data.usuario;
    rolSelect.value = data.rol;
    passwordInput.value = data.password;

    btnGuardar.textContent = "Actualizar";
};

/* ===== HABILITAR / DESHABILITAR ===== */
window.cambiarEstado = async (id, activo) => {
    if (!confirm("¿Seguro?")) return;

    const { error } = await supabase
        .from("usuarios")
        .update({ activo: !activo })
        .eq("id", id);

    if (error) {
        mensaje.textContent = "❌ Error al cambiar estado: " + error.message;
        return;
    }

    cargarUsuarios();
};

/* ===== ELIMINAR USUARIO ===== */
window.eliminarUsuario = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;

    const { error } = await supabase
        .from("usuarios")
        .update({ eliminado: true, activo: false })
        .eq("id", id);

    if (error) {
        mensaje.textContent = "❌ Error al eliminar usuario: " + error.message;
        return;
    }

    mensaje.style.color = "lime";
    mensaje.textContent = "✅ Usuario eliminado";

    cargarUsuarios();
};

/* ===== LIMPIAR FORM ===== */
function limpiar() {
    usuarioEditando = null;
    nombreInput.value = "";
    usuarioInput.value = "";
    passwordInput.value = "";
    rolSelect.value = "";
    btnGuardar.textContent = "Guardar";
}

/* ===== INICIO ===== */
cargarUsuarios();
