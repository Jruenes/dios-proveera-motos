// Proteger todas las páginas privadas
if (!localStorage.getItem("usuario_id")) {
    window.location.href = "index.html";
}
