import { supabase } from './supabase.js';

const btnLogin = document.getElementById("btnLogin");
const mensaje = document.getElementById("mensaje");

async function login() {
    const usuarioInput = document.getElementById("usuario").value.trim();
    const passwordInput = document.getElementById("password").value.trim();

    mensaje.textContent = "";
    mensaje.style.color = "red";

    if (!usuarioInput || !passwordInput) {
        mensaje.textContent = "Complete ambos campos";
        return;
    }

    const { data, error } = await supabase
        .rpc("login_usuario", {
            p_usuario: usuarioInput,
            p_password: passwordInput
        });

    if (error) {
        console.error("Error RPC login_usuario:", error);
        mensaje.textContent = "Error al consultar el usuario: " + error.message;
        return;
    }

    if (!data || data.length === 0) {
        mensaje.textContent = "Usuario o contraseña incorrectos / deshabilitado";
        return;
    }

    const usuario = data[0];

    // 💾 Guardar sesión
    localStorage.setItem("usuario_actual", usuario.usuario);
    localStorage.setItem("rol_actual", usuario.rol);
    localStorage.setItem("usuario_id", usuario.id);
    localStorage.setItem("nombre_completo", usuario.nombre_completo);
    localStorage.setItem("sesionActiva", "true");

    mensaje.style.color = "lime";
    mensaje.textContent = "Acceso correcto, redirigiendo...";

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 800);
}

btnLogin.addEventListener("click", login);

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") login();
    });
});

window.login = login;
