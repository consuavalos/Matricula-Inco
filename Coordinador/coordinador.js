import { protegerRuta, cerrarSesionSupabase } from "../auth-guard.js";
import { buscarMatriculaPorNie } from "../supabase-data.js";
import { mostrarFichaConsulta } from "./ficha-consulta.js";

const accesoCoordinador = await protegerRuta("coordinador");

if (accesoCoordinador) {
  const identificador = document.getElementById("identificadorCoordinador");
  const nombre = sessionStorage.getItem("nombreUsuario") || "Coordinador";
  if (identificador) identificador.textContent = `Coordinador responsable: ${nombre}`;
  document.getElementById("botonConsulta").disabled = false;
}

document.getElementById("buscarMatriculaCoordinador").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!accesoCoordinador) return;
  const nie = document.getElementById("nieConsulta").value.trim();
  const estado = document.getElementById("estadoConsulta");
  const ficha = document.getElementById("fichaConsulta");
  const boton = document.getElementById("botonConsulta");
  if (boton.disabled) return;
  ficha.hidden = true;
  ficha.replaceChildren();
  if (!nie) {
    estado.textContent = "Escriba el NIE del estudiante.";
    return;
  }
  boton.disabled = true;
  estado.textContent = "Buscando matrícula…";
  try {
    const datos = await buscarMatriculaPorNie(nie);
    if (!datos) {
      estado.textContent = "No se encontró ninguna matrícula con ese NIE.";
      return;
    }
    mostrarFichaConsulta(ficha, datos);
    ficha.hidden = false;
    estado.textContent = "Matrícula encontrada. Consulta de solo lectura.";
  } catch (error) {
    estado.textContent = `No se pudo consultar la matrícula. ${error.message || "Intente nuevamente."}`;
  } finally {
    boton.disabled = false;
  }
});

window.imprimirActa = function () {
  if (accesoCoordinador) window.print();
};

window.cerrarSesion = cerrarSesionSupabase;
