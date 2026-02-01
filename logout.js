const btnLogout = document.getElementById("btnCerrar");

btnLogout.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});
