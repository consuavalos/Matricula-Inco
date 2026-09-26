import { protegerRuta, cerrarSesionSupabase } from "../auth-guard.js";

const accesoCoordinador = await protegerRuta("coordinador");

if (accesoCoordinador) {
  const identificador = document.getElementById("identificadorCoordinador");
  const nombre = sessionStorage.getItem("nombreUsuario") || "Coordinador";
  if (identificador) identificador.textContent = `Coordinador responsable: ${nombre}`;
}

window.imprimirActa = function () {
  if (accesoCoordinador) window.print();
};

window.cerrarSesion = cerrarSesionSupabase;
