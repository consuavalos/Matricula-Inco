import { iniciarBuscadorNacimiento, validarLugarNacimiento } from './buscador-nacimiento.js';
import {
  crearMatricula,
  nieYaExiste,
  obtenerSiguienteFicha,
} from "../supabase-data.js";

/* =========================================================
   REFERENCIAS
========================================================= */
const form = document.getElementById("matriculaForm");
iniciarBuscadorNacimiento();
const mensajeExito = document.getElementById("mensajeExito");

const numeroFicha = document.getElementById("numeroFicha");
const fechaMatricula = document.getElementById("fechaMatricula");
const horaMatricula = document.getElementById("horaMatricula");
const nie = document.getElementById("nie");
const tipoIngreso = document.getElementById("tipoIngreso");

const fechaNacimiento = document.getElementById("fechaNacimiento");
const edad = document.getElementById("edad");
const avisoSobreedad = document.getElementById("avisoSobreedad");

const grado = document.getElementById("grado");
const enfermedad = document.getElementById("enfermedad");
const conQuienVive = document.getElementById("conQuienVive");
const conQuienViveOtro = document.getElementById("conQuienViveOtro");
const campoConQuienViveOtro = document.getElementById("campoConQuienViveOtro");
const bloqueDatosMadre = document.getElementById("bloqueDatosMadre");
const bloqueDatosPadre = document.getElementById("bloqueDatosPadre");

const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const btnGuardar = document.getElementById("btnGuardar");

const pasos = document.querySelectorAll(".form-step");

const fotoInput = document.getElementById("fotoEstudiante");
const vistaPrevia = document.getElementById("vistaPreviaFoto");

let pasoActual = 1;
const TOTAL_PASOS = pasos.length;

function mostrarComprobanteMatricula(data) {
  const nombre = [data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido]
    .filter(Boolean)
    .join(" ");

  const campos = [
    ["Número de ficha", data.numeroFicha],
    ["NIE", data.nie],
    ["Estudiante", nombre],
    ["Grado", data.grado],
    ["Especialidad", data.especialidad],
    ["Tipo de ingreso", data.tipoIngreso],
    ["Fecha de matrícula", data.fechaMatricula],
    ["Hora", data.horaMatricula],
  ];

  // Datos del encargado/a: si el parentesco es Mamá o Papá, se muestra
  // además el nombre registrado en los datos de la madre/padre.
  const parentesco = data.parentesco || "";
  let etiquetaResponsable = "Responsable";
  if (parentesco === "Mamá") etiquetaResponsable = "Responsable (Madre)";
  else if (parentesco === "Papá") etiquetaResponsable = "Responsable (Padre)";
  else if (parentesco) etiquetaResponsable = `Responsable (${parentesco})`;

  campos.push([etiquetaResponsable, data.responsable]);
  if (data.telefonoResponsable) campos.push(["Teléfono del responsable", data.telefonoResponsable]);
  if (data.correoResponsable) campos.push(["Correo del responsable", data.correoResponsable]);

  const destino = document.getElementById("datosComprobante");
  if (destino) {
    destino.innerHTML = campos
      .filter(([, valor]) => valor)
      .map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${valor}</dd></div>`)
      .join("");
  }
}

window.imprimirComprobanteMatricula = function () {
  window.print();
};

window.descargarComprobantePDF = function () {
  const elemento = document.getElementById("comprobanteImprimible");
  if (!elemento) return;

  if (typeof html2pdf === "undefined") {
    alert("No se pudo cargar el generador de PDF (revise su conexión a internet). Puede usar el botón Imprimir y elegir “Guardar como PDF”.");
    return;
  }

  // Corrige el PDF en blanco: si la página está desplazada (scroll),
  // html2canvas captura el área equivocada. Se sube al tope antes de generar.
  window.scrollTo(0, 0);

  const fichaInput = document.getElementById("numeroFicha");
  const nombreArchivo = `Comprobante-Matricula-${(fichaInput && fichaInput.value) || "INCO"}.pdf`;

  const opciones = {
    margin: 10,
    filename: nombreArchivo,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  setTimeout(() => {
    html2pdf().set(opciones).from(elemento).save();
  }, 50);
};

window.volverInicioMatricula = function () {
  window.location.replace("../index.html");
};

/* =========================================================
   VALIDACIÓN POR CAMPO
========================================================= */
const mensajesPersonalizados = {
  nie: "El NIE debe contener solo números (máximo 9 dígitos).",
  duiEstudiante: "Formato requerido: 00000000-0.",
  lugarNacimiento: "Ingrese el lugar de nacimiento del estudiante.",
  tipoTransporte: "Seleccione el tipo de transporte que utiliza.",
  zonaResidencia: "Seleccione la zona de residencia.",
  conQuienVive: "Seleccione con quién vive el estudiante.",
  conQuienViveOtro: "Especifique con quién vive el estudiante.",
  direccionResidencia: "Ingrese la dirección de residencia.",
  primerApellido: "Ingrese el primer apellido (solo letras, máximo 10 caracteres).",
  segundoApellido: "Ingrese el segundo apellido (solo letras, máximo 10 caracteres).",
  primerNombre: "Ingrese el primer nombre (solo letras, máximo 10 caracteres).",
  segundoNombre: "Ingrese el segundo nombre (solo letras, máximo 10 caracteres).",
  fechaNacimiento: "Seleccione la fecha de nacimiento del estudiante.",
  sexo: "Seleccione el sexo del estudiante.",
  telefonoEstudiante: "Ingrese exactamente 8 números.",
  correoEstudiantil: "Escriba solo números; el dominio @clases.edu.sv se agrega automáticamente.",
  correoPersonal: "Ingrese un correo electrónico válido con arroba (@).",
  grado: "Seleccione el grado que cursará.",
  tipoIngreso: "Indique si el estudiante es de nuevo ingreso o antiguo ingreso.",
  especialidad: "Seleccione la especialidad o bachillerato.",
  ultimoAnioAprobado: "Seleccione el último año aprobado.",
  colegioAnterior: "Ingrese el nombre del centro educativo anterior.",
  hermanosCentroeducativo: "Indique si tiene hermanos en el centro educativo.",
  computadoraMineducyt: "Indique si posee computadora MINEDUCYT.",
  internet: "Indique si posee acceso a internet.",
  tallaZapatos: "Seleccione la talla de zapatos.",
  tallaCamisa: "Seleccione la talla de camisa.",
  tallaPantalon: "Seleccione la talla de pantalón.",
  tallaBlusa: "Seleccione la talla de blusa.",
  tallaFalda: "Seleccione la talla de falda.",
  vacunaCovid: "Indique si tiene la vacuna COVID-19.",
  enfermedad: "Indique si padece alguna enfermedad.",
  cualEnfermedad: "Especifique la enfermedad.",
  medicamento: "Especifique el medicamento que utiliza.",
  responsable: "Ingrese el nombre del responsable (solo letras).",
  parentesco: "Seleccione el parentesco del responsable.",
  duiResponsable: "Formato requerido: 00000000-0.",
  telefonoResponsable: "Ingrese exactamente 8 números.",
  whatsappResponsable: "Ingrese exactamente 8 números.",
  correoResponsable: "Ingrese un correo electrónico válido que termine en @gmail.com.",
  distanciaKm: "Ingrese la distancia en kilómetros (máximo 3 números, puede incluir un punto decimal).",
  madreNombre: "Ingrese el nombre completo de la madre (solo letras).",
  madreOcupacion: "Ingrese la ocupación de la madre.",
  madreLugarTrabajo: "Ingrese el lugar de trabajo de la madre.",
  madreDui: "Formato requerido: 00000000-0.",
  madreLugarNacimiento: "Ingrese el lugar de nacimiento de la madre.",
  madreFechaNacimiento: "Seleccione la fecha de nacimiento de la madre.",
  madreCelular: "Formato requerido: 0000-0000.",
  padreNombre: "Ingrese el nombre completo del padre (solo letras).",
  padreOcupacion: "Ingrese la ocupación del padre.",
  padreLugarTrabajo: "Ingrese el lugar de trabajo del padre.",
  padreDui: "Formato requerido: 00000000-0.",
  padreLugarNacimiento: "Ingrese el lugar de nacimiento del padre.",
  padreFechaNacimiento: "Seleccione la fecha de nacimiento del padre.",
  padreCelular: "Formato requerido: 0000-0000.",
  partidaNumero: "Ingrese el número de partida (solo números, máximo 5 dígitos).",
  folio: "Ingrese el folio (solo números).",
  tomo: "Ingrese el tomo (solo números).",
  libro: "Ingrese el libro (solo números)."
};

const MENSAJE_OBLIGATORIO = "Este campo es obligatorio.";

function obtenerContenedor(el) {
  return el.closest(".campo") || el.parentElement;
}

function obtenerSpanError(el) {
  const contenedor = obtenerContenedor(el);
  let span = contenedor.querySelector(".error-mensaje");
  if (!span) {
    span = document.createElement("span");
    span.className = "error-mensaje";
    contenedor.appendChild(span);
  }
  return span;
}

function campoVisible(el) {
  const contenedor = obtenerContenedor(el);
  if (!contenedor) return true;
  return contenedor.offsetParent !== null;
}

function limpiarError(el) {
  const contenedor = obtenerContenedor(el);
  if (!contenedor) return;
  contenedor.classList.remove("campo-invalido");
  const span = contenedor.querySelector(".error-mensaje");
  if (span) span.textContent = "";
  el.style.borderColor = "";
}

function validarCampo(el) {
  if (el.type === "submit" || el.type === "button") return true;

  if (el.type === "file") {
    const fotoError = document.getElementById("fotoError");
    if (el.hasAttribute("required") && el.files.length === 0) {
      if (fotoError) fotoError.textContent = "La fotografía es obligatoria.";
      el.closest(".foto-label")?.style.setProperty("border-color", "red");
      return false;
    } else {
      if (fotoError) fotoError.textContent = "";
      el.closest(".foto-label")?.style.removeProperty("border-color");
      return true;
    }
  }

  if (el.readOnly || el.disabled) return true;

  if (!campoVisible(el)) {
    limpiarError(el);
    return true;
  }

  let valido = true;
  let mensaje = "";
  const valor = el.value ? el.value.trim() : "";

  if (el.id === "lugarNacimiento") {
    mensaje = validarLugarNacimiento(el);
    valido = !mensaje;
  }

  if (el.hasAttribute("required") && !valor) {
    valido = false;
    mensaje = mensajesPersonalizados[el.id] || MENSAJE_OBLIGATORIO;
  } else if (valor && el.pattern) {
    const regex = new RegExp("^(?:" + el.pattern + ")$");
    if (!regex.test(valor)) {
      valido = false;
      mensaje = mensajesPersonalizados[el.id] || el.title || "El valor ingresado no es válido.";
    }
  }

  if (valido && (el.id === "correoPersonal" || el.id === "correoResponsable") && valor && !valor.includes("@")) {
    valido = false;
    mensaje = "El correo debe contener el símbolo arroba (@).";
  }

  if (valido && el.id === "nie" && el.dataset.duplicado === "true") {
    valido = false;
    mensaje = "Este NIE ya se encuentra registrado en el sistema.";
  }

  const contenedor = obtenerContenedor(el);
  const span = obtenerSpanError(el);

  if (!valido) {
    if (contenedor) contenedor.classList.add("campo-invalido");
    el.style.borderColor = "red";
    span.textContent = mensaje;
  } else {
    limpiarError(el);
  }
  return valido;
}

function validarPaso(numeroPaso) {
  const seccion = document.querySelector(`.form-step[data-step="${numeroPaso}"]`);
  if (!seccion) return true;

  if (numeroPaso === 2) {
    const gradoSeleccionado = document.getElementById("grado")?.value;
    const ultimoAnioAprobado = document.getElementById("ultimoAnioAprobado")?.value;

    if (gradoSeleccionado && ultimoAnioAprobado) {
      const anioEsperado = {
        "Primer Año": "Noveno Grado",
        "Segundo Año": "Primer Año",
        "Tercer Año": "Segundo Año"
      }[gradoSeleccionado];

      if (ultimoAnioAprobado !== anioEsperado && ultimoAnioAprobado !== gradoSeleccionado) {
        alert(`❌ Error de coherencia:\nSi el estudiante va a cursar "${gradoSeleccionado}", el último año aprobado debe ser "${anioEsperado}" (o el mismo año si está repitiendo).\n\nCorrija la información antes de continuar.`);
        return false;
      }
    }

    if (!validarHermanos()) {
      return false;
    }
  }

  const campos = seccion.querySelectorAll("input, select, textarea");
  let pasoValido = true;
  let primerInvalido = null;

  campos.forEach((el) => {
    if (el.type === "submit" || el.type === "button" || el.readOnly || el.disabled) return;
    if (el.classList && el.classList.contains("hermano-input")) return; // validado aparte
    const ok = validarCampo(el);
    if (!ok) {
      pasoValido = false;
      if (!primerInvalido) primerInvalido = el;
    }
  });

  if (!validarHermanos()) {
    pasoValido = false;
  }

  if (primerInvalido) {
    primerInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
    if (primerInvalido.type !== "file") {
      primerInvalido.focus({ preventScroll: true });
    }
  }

  return pasoValido;
}

// Enlazar validación en vivo
const todosLosCampos = form.querySelectorAll("input, select, textarea");
todosLosCampos.forEach((el) => {
  if (el.type === "submit" || el.type === "button" || el.type === "file") return;
  el.addEventListener("input", () => validarCampo(el));
  el.addEventListener("change", () => validarCampo(el));
  el.addEventListener("blur", () => validarCampo(el));
});

/* =========================================================
   NIE DUPLICADO
========================================================= */
async function nieYaExisteEnBD(valorNie) {
  if (!valorNie) return false;
  try {
    return await nieYaExiste(valorNie);
  } catch (error) {
    console.error("Error verificando NIE duplicado:", error);
    return false;
  }
}

async function verificarNieDuplicado() {
  if (!nie) return;
  const valor = nie.value.trim();
  nie.dataset.duplicado = "false";
  if (!valor) return;

  const span = obtenerSpanError(nie);
  const contenedor = obtenerContenedor(nie);
  if (span) span.textContent = "Verificando NIE…";
  if (contenedor) contenedor.classList.remove("campo-invalido");

  const existe = await nieYaExisteEnBD(valor);
  nie.dataset.duplicado = existe ? "true" : "false";
  validarCampo(nie);

  if (!existe && span && span.textContent === "Verificando NIE…") {
    span.textContent = "";
  }
}

if (nie) {
  nie.addEventListener("blur", verificarNieDuplicado);
  nie.addEventListener("input", () => {
    nie.dataset.duplicado = "false";
  });
}

/* =========================================================
   FUNCIONES DE CONFIGURACIÓN
========================================================= */
function actualizarBloqueoEdad(bloqueado) {
  if (form) form.dataset.edadBloqueada = bloqueado ? "true" : "false";
  if (btnSiguiente && pasoActual === 1) btnSiguiente.disabled = bloqueado;
  if (btnGuardar) btnGuardar.disabled = bloqueado;
}

function configurarCamposSalud() {
  const enfermedad = document.getElementById("enfermedad");
  const campoCualEnfermedad = document.getElementById("campoCualEnfermedad");
  const campoMedicamento = document.getElementById("campoMedicamento");
  const campoOtros = document.getElementById("campoOtros");

  if (!enfermedad) return;

  enfermedad.addEventListener("change", function() {
    if (this.value === "Sí") {
      if (campoCualEnfermedad) campoCualEnfermedad.style.display = "block";
      if (campoMedicamento) campoMedicamento.style.display = "block";
      if (campoOtros) campoOtros.style.display = "block";
    } else {
      if (campoCualEnfermedad) {
        campoCualEnfermedad.style.display = "none";
        const inp = campoCualEnfermedad.querySelector("input");
        if (inp) { inp.value = ""; limpiarError(inp); }
      }
      if (campoMedicamento) {
        campoMedicamento.style.display = "none";
        const inp = campoMedicamento.querySelector("input");
        if (inp) { inp.value = ""; limpiarError(inp); }
      }
      if (campoOtros) {
        campoOtros.style.display = "none";
        const inp = campoOtros.querySelector("input");
        if (inp) { inp.value = ""; limpiarError(inp); }
      }
    }
  });
}

function configurarFoto() {
  if (!fotoInput) return;

  fotoInput.required = true;

  fotoInput.addEventListener("change", function(e) {
    const file = this.files[0];
    const fotoError = document.getElementById("fotoError");

    if (!file) {
      if (vistaPrevia) vistaPrevia.innerHTML = "";
      this.closest(".foto-label")?.classList.remove("con-foto");
      if (fotoError) fotoError.textContent = "La fotografía es obligatoria.";
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("⚠️ Solo se permiten archivos de imagen");
      this.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("⚠️ La imagen no debe superar los 2MB");
      this.value = "";
      return;
    }

    if (fotoError) fotoError.textContent = "";
    this.closest(".foto-label")?.style.removeProperty("border-color");

    const reader = new FileReader();
    reader.onload = function(event) {
      const fotoBase64 = event.target.result;

      const img = document.createElement("img");
      img.src = fotoBase64;
      img.alt = "Foto del estudiante";
      if (vistaPrevia) {
        vistaPrevia.innerHTML = "";
        vistaPrevia.appendChild(img);
        fotoInput.closest(".foto-label")?.classList.add("con-foto");
      }

      let hiddenInput = document.getElementById("fotoBase64");
      if (!hiddenInput) {
        hiddenInput = document.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.id = "fotoBase64";
        hiddenInput.name = "fotoBase64";
        form.appendChild(hiddenInput);
      }
      hiddenInput.value = fotoBase64;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   HERMANOS EN EL CENTRO EDUCATIVO (dinámico, máx. 3)
========================================================= */
const MAX_HERMANOS = 3;
let contadorHermanos = 0;

function crearFilaHermano() {
  contadorHermanos++;
  const idSufijo = contadorHermanos;

  const fila = document.createElement("div");
  fila.className = "fila-hermano";
  fila.dataset.indice = idSufijo;

  fila.innerHTML = `
    <div class="campo hermano-campo-nombre">
      <label for="nombreHermano_${idSufijo}">Nombre del hermano/a</label>
      <input type="text" id="nombreHermano_${idSufijo}" name="nombresHermanos[]"
             class="hermano-input hermano-nombre" maxlength="50"
             pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ\\s]+"
             placeholder="Nombre completo" />
    </div>
    <div class="campo hermano-campo-grado">
      <label for="gradoHermano_${idSufijo}">Grado actual</label>
      <select id="gradoHermano_${idSufijo}" name="gradosHermanos[]"
              class="hermano-input hermano-grado">
        <option value="">Seleccione el grado</option>
        <option value="Primer Año">Primer Año</option>
        <option value="Segundo Año">Segundo Año</option>
        <option value="Tercer Año">Tercer Año</option>
      </select>
    </div>
    <button type="button" class="btn-hermano-quitar" title="Quitar este hermano" aria-label="Quitar este hermano">✕</button>
  `;

  const btnQuitar = fila.querySelector(".btn-hermano-quitar");
  btnQuitar.addEventListener("click", () => {
    fila.remove();
    actualizarEstadoBotonesHermanos();
  });

  fila.querySelectorAll(".hermano-input").forEach((inp) => {
    inp.addEventListener("input", () => limpiarError(inp));
    inp.addEventListener("change", () => limpiarError(inp));
  });

  return fila;
}

function actualizarEstadoBotonesHermanos() {
  const lista = document.getElementById("listaHermanos");
  const btnMas = document.getElementById("btnAgregarHermano");
  if (!lista || !btnMas) return;
  const total = lista.querySelectorAll(".fila-hermano").length;
  btnMas.disabled = total >= MAX_HERMANOS;
  btnMas.title = total >= MAX_HERMANOS
    ? `Máximo ${MAX_HERMANOS} hermanos`
    : "Agregar otro hermano o hermana";
}

function validarHermanos() {
  const selectHermanos = document.getElementById("hermanosCentroeducativo");
  if (!selectHermanos || selectHermanos.value !== "Sí") return true;

  const lista = document.getElementById("listaHermanos");
  const avisoHermanos = document.getElementById("avisoHermanosVacio");
  if (!lista) return true;

  const filas = lista.querySelectorAll(".fila-hermano");

  if (filas.length === 0) {
    if (avisoHermanos) {
      avisoHermanos.textContent = "Agregue al menos un hermano o hermana con el botón “+”.";
      avisoHermanos.style.display = "block";
    }
    return false;
  }

  let valido = true;
  filas.forEach((fila) => {
    const nombre = fila.querySelector(".hermano-nombre");
    const gradoH = fila.querySelector(".hermano-grado");
    const nombreVacio = !nombre.value.trim();
    const gradoVacio = !gradoH.value.trim();

    if (nombreVacio || gradoVacio) {
      valido = false;
      fila.classList.add("fila-hermano-invalida");
      if (nombreVacio) { nombre.style.borderColor = "red"; }
      if (gradoVacio) { gradoH.style.borderColor = "red"; }
    } else {
      fila.classList.remove("fila-hermano-invalida");
      nombre.style.borderColor = "";
      gradoH.style.borderColor = "";
    }
  });

  if (avisoHermanos) {
    avisoHermanos.textContent = valido
      ? ""
      : "Complete el nombre y grado de cada hermano agregado, o elimínelo con el botón “✕”.";
    avisoHermanos.style.display = valido ? "none" : "block";
  }

  return valido;
}

function limpiarHermanos() {
  const lista = document.getElementById("listaHermanos");
  if (lista) lista.innerHTML = "";
  const avisoHermanos = document.getElementById("avisoHermanosVacio");
  if (avisoHermanos) {
    avisoHermanos.textContent = "";
    avisoHermanos.style.display = "none";
  }
  actualizarEstadoBotonesHermanos();
}

function configurarCamposHermanos() {
  const selectHermanos = document.getElementById("hermanosCentroeducativo");
  const bloqueHermanos = document.getElementById("bloqueHermanos");
  const btnMas = document.getElementById("btnAgregarHermano");
  const lista = document.getElementById("listaHermanos");

  if (!selectHermanos || !bloqueHermanos || !btnMas || !lista) return;

  btnMas.addEventListener("click", () => {
    const total = lista.querySelectorAll(".fila-hermano").length;
    if (total >= MAX_HERMANOS) return;
    lista.appendChild(crearFilaHermano());
    actualizarEstadoBotonesHermanos();
  });

  selectHermanos.addEventListener("change", function() {
    if (this.value === "Sí") {
      bloqueHermanos.style.display = "block";
      if (lista.querySelectorAll(".fila-hermano").length === 0) {
        lista.appendChild(crearFilaHermano());
      }
      actualizarEstadoBotonesHermanos();
    } else {
      bloqueHermanos.style.display = "none";
      limpiarHermanos();
    }
  });
}

const TALLAS_VALIDAS = ["XS", "S", "M", "L", "XL"];

function configurarTallas() {
  const sexo = document.getElementById("sexo");
  const campoCamisa = document.getElementById("campoCamisa");
  const campoPantalon = document.getElementById("campoPantalon");
  const campoBlusa = document.getElementById("campoBlusa");
  const campoFalda = document.getElementById("campoFalda");
  const tallaCamisa = document.getElementById("tallaCamisa");
  const tallaPantalon = document.getElementById("tallaPantalon");
  const tallaBlusa = document.getElementById("tallaBlusa");
  const tallaFalda = document.getElementById("tallaFalda");

  if (!sexo) return;

  if (campoCamisa) campoCamisa.style.display = "none";
  if (campoPantalon) campoPantalon.style.display = "none";
  if (campoBlusa) campoBlusa.style.display = "none";
  if (campoFalda) campoFalda.style.display = "none";

  sexo.addEventListener("change", function() {
    if (this.value === "Masculino") {
      if (campoCamisa) campoCamisa.style.display = "block";
      if (campoPantalon) campoPantalon.style.display = "block";
      if (campoBlusa) campoBlusa.style.display = "none";
      if (campoFalda) campoFalda.style.display = "none";

      if (tallaCamisa) tallaCamisa.required = true;
      if (tallaPantalon) tallaPantalon.required = true;
      if (tallaBlusa) {
        tallaBlusa.required = false;
        tallaBlusa.value = "";
        limpiarError(tallaBlusa);
      }
      if (tallaFalda) {
        tallaFalda.required = false;
        tallaFalda.value = "";
        limpiarError(tallaFalda);
      }

    } else if (this.value === "Femenino") {
      if (campoCamisa) campoCamisa.style.display = "none";
      if (campoPantalon) campoPantalon.style.display = "none";
      if (campoBlusa) campoBlusa.style.display = "block";
      if (campoFalda) campoFalda.style.display = "block";

      if (tallaCamisa) {
        tallaCamisa.required = false;
        tallaCamisa.value = "";
        limpiarError(tallaCamisa);
      }
      if (tallaPantalon) {
        tallaPantalon.required = false;
        tallaPantalon.value = "";
        limpiarError(tallaPantalon);
      }
      if (tallaBlusa) tallaBlusa.required = true;
      if (tallaFalda) tallaFalda.required = true;

    } else {
      if (campoCamisa) campoCamisa.style.display = "none";
      if (campoPantalon) campoPantalon.style.display = "none";
      if (campoBlusa) campoBlusa.style.display = "none";
      if (campoFalda) campoFalda.style.display = "none";

      if (tallaCamisa) tallaCamisa.required = false;
      if (tallaPantalon) tallaPantalon.required = false;
      if (tallaBlusa) tallaBlusa.required = false;
      if (tallaFalda) tallaFalda.required = false;
    }
  });
}

function configurarUltimoAnioAprobado() {
  const ultimoAnio = document.getElementById("ultimoAnioAprobado");
  const ayuda = document.getElementById("ayudaUltimoAnio");
  if (!grado || !ultimoAnio) return;

  const mostrarAvisoRepeticion = () => {
    if (!ayuda) return;
    ayuda.classList.remove("advertencia-repeticion", "anio-correcto");

    if (!grado.value || !ultimoAnio.value) {
      ayuda.textContent = "";
      return;
    }

    const anioAnteriorEsperado = {
      "Primer Año": "Noveno Grado",
      "Segundo Año": "Primer Año",
      "Tercer Año": "Segundo Año"
    }[grado.value];

    if (ultimoAnio.value === anioAnteriorEsperado) {
      ayuda.textContent = `✓ Año anterior correcto: ${ultimoAnio.value}.`;
      ayuda.classList.add("anio-correcto");
    } else {
      ayuda.textContent = ultimoAnio.value === grado.value
        ? `⚠️ El estudiante está repitiendo ${grado.value}.`
        : `⚠️ Posible repetición: para cursar ${grado.value}, el año anterior esperado es ${anioAnteriorEsperado}.`;
      ayuda.classList.add("advertencia-repeticion");
    }
  };

  grado.addEventListener("change", mostrarAvisoRepeticion);
  ultimoAnio.addEventListener("change", mostrarAvisoRepeticion);
  mostrarAvisoRepeticion();
}

function configurarAutollenadoResponsable() {
  const parentesco = document.getElementById("parentesco");
  const responsable = document.getElementById("responsable");
  const duiResponsable = document.getElementById("duiResponsable");
  const telefonoResponsable = document.getElementById("telefonoResponsable");
  const correoResponsable = document.getElementById("correoResponsable");
  if (!parentesco || !responsable) return;

  const idsAutollenables = [
    "madreNombre", "madreDui", "madreCelular",
    "padreNombre", "padreDui", "padreCelular"
  ];

  idsAutollenables.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (evento) => {
      delete evento.currentTarget.dataset.autollenadoResponsable;
    });
  });

  const sincronizar = () => {
    idsAutollenables.forEach((id) => {
      const campo = document.getElementById(id);
      if (campo?.dataset.autollenadoResponsable === "true") {
        campo.value = "";
        delete campo.dataset.autollenadoResponsable;
        limpiarError(campo);
      }
    });

    const prefijo = parentesco.value === "Mamá" ? "madre" : parentesco.value === "Papá" ? "padre" : "";
    if (!prefijo) return;
    const asignaciones = [
      [`${prefijo}Nombre`, responsable.value],
      [`${prefijo}Dui`, duiResponsable?.value || ""],
      [`${prefijo}Celular`, telefonoResponsable?.value || ""]
    ];
    asignaciones.forEach(([id, valor]) => {
      const campo = document.getElementById(id);
      if (campo) {
        campo.value = valor;
        campo.dataset.autollenadoResponsable = "true";
        validarCampo(campo);
      }
    });
  };

  [parentesco, responsable, duiResponsable, telefonoResponsable, correoResponsable]
    .filter(Boolean)
    .forEach(campo => campo.addEventListener("input", sincronizar));
  parentesco.addEventListener("change", sincronizar);
}

/* =========================================================
   DISTANCIA EN KM: máximo 3 números (con un decimal opcional)
========================================================= */
function configurarDistanciaKm() {
  const campo = document.getElementById("distanciaKm");
  if (!campo) return;

  campo.addEventListener("input", function () {
    let valor = this.value.replace(/[^0-9.]/g, "");

    // Permitir un solo punto decimal
    const partes = valor.split(".");
    if (partes.length > 2) {
      valor = partes[0] + "." + partes.slice(1).join("");
    }

    const [entero, decimal] = valor.split(".");
    let enteroLimitado = (entero || "").slice(0, 3);
    let resultado = enteroLimitado;

    if (valor.includes(".")) {
      const decimalLimitado = (decimal || "").slice(0, Math.max(0, 3 - enteroLimitado.length));
      resultado = enteroLimitado + "." + decimalLimitado;
    }

    this.value = resultado;
  });
}

/* =========================================================
   DOCUMENTACIÓN A PRESENTAR (según grado y tipo de ingreso)
========================================================= */
const DOCUMENTACION = {
  "Nuevo ingreso": {
    "Primer Año": [
      "Certificado de 9° grado o boleta de nota con firma y sello (original y copia).",
      "Partida de nacimiento reciente (original y copia, máximo 3 meses de emisión).",
      "Constancia de conducta (original y copia).",
      "Cuatro fotografías de 3.5cm x 2.5cm (blanco y negro de tiempo en papel granulado). Podrán ser tomadas y recibidas en la institución.",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul).",
      "Dos fotocopias de DUI del responsable (y del estudiante si es mayor de edad) al 150%."
    ],
    "Segundo Año": [
      "Certificado de 9° grado y 1° año bachillerato (original y copia).",
      "Partida de nacimiento reciente (original y copia, máximo 3 meses de emisión).",
      "Constancia de conducta (original y copia).",
      "Constancia de servicios social estudiantil (original y copia).",
      "Cuatro fotografías de 3.5cm x 2.5cm (blanco y negro de tiempo en papel granulado). Podrán ser tomadas y recibidas en la institución.",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul).",
      "Dos fotocopias de DUI del responsable (y del estudiante si es mayor de edad) al 150%."
    ],
    "Tercer Año": [
      "Certificado de 9° grado, 1° y 2° año de bachillerato (original y copia).",
      "Partida de nacimiento reciente (original y copia, máximo 3 meses de emisión).",
      "Constancia de conducta (original y copia).",
      "Constancia de servicio social estudiantil (original y copia).",
      "Cuatro fotografías de 3.5cm x 2.5cm (blanco y negro de tiempo en papel granulado). Podrán ser tomadas y recibidas en la institución.",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul).",
      "Dos copias de DUI del responsable (y del estudiante si es mayor de edad) al 150%."
    ]
  },
  "Antiguo ingreso": {
    "Segundo Año": [
      "Cuatro fotografías de 3.5cm x 2.5cm (blanco y negro de tiempo en papel granulado). Podrán ser tomadas y recibidas en la institución.",
      "Boleta de notas SIGES de primer año de bachillerato con materias aprobadas (original y copia).",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul).",
      "Dos fotocopias de DUI del responsable (y del estudiante si es mayor de edad) al 150%."
    ],
    "Tercer Año": [
      "Cuatro fotografías de 3.5cm x 2.5cm (blanco y negro de tiempo en papel granulado). Podrán ser tomadas y recibidas en la institución.",
      "Boleta de notas SIGES de segundo año de bachillerato con materias aprobadas (original y copia).",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul).",
      "Dos fotocopias de DUI del responsable (y del estudiante si es mayor de edad) al 150%."
    ]
  }
};

function actualizarDocumentacion() {
  const bloque = document.getElementById("bloqueDocumentacion");
  if (!bloque) return;

  const tipo = tipoIngreso ? tipoIngreso.value : "";
  const gradoValor = grado ? grado.value : "";

  const lista = (DOCUMENTACION[tipo] && DOCUMENTACION[tipo][gradoValor]) || null;

  if (!tipo || !gradoValor) {
    bloque.innerHTML = `<p class="documentacion-placeholder">Seleccione el grado (Paso 1) y el tipo de ingreso (Paso 2) para ver la documentación requerida.</p>`;
    return;
  }

  if (!lista) {
    bloque.innerHTML = `<p class="documentacion-placeholder">No hay documentación registrada para "${gradoValor}" como "${tipo}". Consulte con la institución.</p>`;
    return;
  }

  bloque.innerHTML = `
    <span class="documentacion-etiqueta">${tipo} · ${gradoValor}</span>
    <h4>Documentos a presentar</h4>
    <ul>${lista.map(item => `<li>${item}</li>`).join("")}</ul>
  `;
}

/* =========================================================
   DUI DEL ESTUDIANTE: opcional si es menor, obligatorio a los 18
========================================================= */
function actualizarRequeridoDuiEstudiante() {
  const duiEstudiante = document.getElementById("duiEstudiante");
  if (!duiEstudiante || !edad) return;

  const edadActual = parseInt(edad.value);
  const esObligatorio = !Number.isNaN(edadActual) && edadActual >= 18;

  duiEstudiante.required = esObligatorio;

  const label = document.querySelector('label[for="duiEstudiante"]');
  if (label) {
    label.textContent = esObligatorio
      ? "DUI del estudiante"
      : "DUI del estudiante (opcional)";
  }

  if (!esObligatorio && !duiEstudiante.value.trim()) {
    limpiarError(duiEstudiante);
  } else {
    validarCampo(duiEstudiante);
  }
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  configurarTallas();
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    colocarFechaHoraActual();
    setInterval(colocarFechaHoraActual, 1000);
    await generarNumeroFicha();
    mostrarPaso(1);
    configurarCamposSalud();
    configurarFoto();
    configurarCorreoEstudiantil();
    configurarFechaNacimiento();
    configurarCamposHermanos();
    configurarTallas();
    configurarUltimoAnioAprobado();
    configurarAutollenadoResponsable();
    configurarConQuienVive();
    configurarTema();
    configurarDistanciaKm();
    actualizarRequeridoDuiEstudiante();

    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", async () => {
        if (!validarPaso(pasoActual)) return;

        if (pasoActual === 1 && nie) {
          await verificarNieDuplicado();
          if (nie.dataset.duplicado === "true") {
            validarCampo(nie);
            nie.scrollIntoView({ behavior: "smooth", block: "center" });
            nie.focus({ preventScroll: true });
            return;
          }
        }

        const secuencia = obtenerSecuenciaPasos();
        const posicion = secuencia.indexOf(pasoActual);
        if (posicion < secuencia.length - 1) {
          mostrarPaso(secuencia[posicion + 1]);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    if (btnAnterior) {
      btnAnterior.addEventListener("click", () => {
        const secuencia = obtenerSecuenciaPasos();
        const posicion = secuencia.indexOf(pasoActual);
        if (posicion > 0) {
          mostrarPaso(secuencia[posicion - 1]);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    if (grado) grado.addEventListener("change", validarSobreedad);
    if (tipoIngreso) tipoIngreso.addEventListener("change", validarSobreedad);

    if (grado) grado.addEventListener("change", actualizarDocumentacion);
    if (tipoIngreso) tipoIngreso.addEventListener("change", actualizarDocumentacion);
    actualizarDocumentacion();

  } catch (error) {
    console.error("Error al iniciar el formulario:", error);
  }
});

/* =========================================================
   ENVÍO DEL FORMULARIO
========================================================= */
if (form) {
  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const lugar = document.getElementById("lugarNacimiento");
    if (lugar && validarLugarNacimiento(lugar)) {
      mostrarPaso(1);
      validarCampo(lugar);
      lugar.focus();
      return;
    }

    const mensajeBloqueo = document.getElementById("mensajeBloqueoEdad");
    if (mensajeBloqueo && mensajeBloqueo.classList.contains("mostrar")) {
      alert("❌ No se puede guardar la matrícula porque el estudiante supera la edad máxima permitida.");
      return;
    }

    let formularioValido = true;
    let primerPasoInvalido = null;

    for (const i of obtenerSecuenciaPasos()) {
      const ok = validarPaso(i);
      if (!ok) {
        formularioValido = false;
        if (!primerPasoInvalido) primerPasoInvalido = i;
      }
    }

    if (!formularioValido) {
      mostrarPaso(primerPasoInvalido);
      validarPaso(primerPasoInvalido);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (mensajeExito) {
        mensajeExito.textContent = "❌ Complete todos los campos obligatorios correctamente.";
        mensajeExito.style.color = "red";
      }
      return;
    }

    if (mensajeExito) {
      mensajeExito.textContent = "⏳ Verificando NIE…";
      mensajeExito.style.color = "blue";
    }

    const valorNie = nie ? nie.value.trim() : "";
    const nieDuplicado = await nieYaExisteEnBD(valorNie);

    if (nieDuplicado) {
      nie.dataset.duplicado = "true";
      validarCampo(nie);
      mostrarPaso(1);
      nie.scrollIntoView({ behavior: "smooth", block: "center" });
      nie.focus({ preventScroll: true });
      if (mensajeExito) {
        mensajeExito.textContent = "❌ Este NIE ya está registrado. No se puede matricular dos veces con el mismo NIE.";
        mensajeExito.style.color = "red";
      }
      return;
    }

    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
      if (key !== "fotoEstudiante" && key !== "nombresHermanos[]" && key !== "gradosHermanos[]" && value.trim() !== "") {
        data[key] = value;
      }
    });

    // Hermanos: se arman como lista de objetos { nombre, grado }
    const nombresHermanos = formData.getAll("nombresHermanos[]").map(v => v.trim());
    const gradosHermanos = formData.getAll("gradosHermanos[]").map(v => v.trim());
    const hermanos = nombresHermanos
      .map((nombreH, i) => ({ nombre: nombreH, grado: gradosHermanos[i] || "" }))
      .filter(h => h.nombre || h.grado);
    if (hermanos.length) {
      data.hermanos = hermanos;
    }

    if (data.conQuienVive === "Otros" && data.conQuienViveOtro) {
      data.conQuienVive = `Otros: ${data.conQuienViveOtro}`;
    }

    const fotoBase64Input = document.getElementById("fotoBase64");
    if (fotoBase64Input && fotoBase64Input.value) {
      data.fotoEstudiante = fotoBase64Input.value;
    }

    data.fechaMatricula = fechaMatricula ? fechaMatricula.textContent : "";
    data.horaMatricula = horaMatricula ? horaMatricula.textContent : "";
    data.numeroFicha = numeroFicha ? numeroFicha.value : "";
    data.estado = "Activo";
    data.fechaRegistro = new Date().toISOString();

    console.log("📤 Datos a guardar:", data);

    try {
      if (mensajeExito) {
        mensajeExito.textContent = "⏳ Guardando matrícula...";
        mensajeExito.style.color = "blue";
      }

      const docRef = await crearMatricula(data);
      console.log("✅ Matrícula guardada con ID:", docRef.id);

      form.querySelectorAll("input, select, textarea, button").forEach((campo) => {
        campo.disabled = true;
      });
      form.hidden = true;

      const panelFinal = document.getElementById("matriculaFinalizada");
      if (panelFinal) panelFinal.hidden = false;
      mostrarComprobanteMatricula(data);

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      console.error("❌ Error al guardar:", error);
      if (mensajeExito) {
        mensajeExito.textContent = "❌ Error al guardar: " + error.message;
        mensajeExito.style.color = "red";
      }

      if (error.message.includes("Unsupported field value")) {
        alert("❌ Error con la foto. Por favor, intenta con otra imagen o sin foto.");
      }
    }
  });
}

/* =========================================================
   FECHA Y HORA
========================================================= */
function colocarFechaHoraActual() {
  if (!fechaMatricula || !horaMatricula) return;

  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  fechaMatricula.textContent = `${dia}/${mes}/${anio}`;

  let horas = ahora.getHours();
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const ampm = horas >= 12 ? "PM" : "AM";
  horas = horas % 12;
  horas = horas ? horas : 12;
  const horasFormateadas = String(horas).padStart(2, "0");

  horaMatricula.textContent = `${horasFormateadas}:${minutos} ${ampm}`;
}

/* =========================================================
   GENERAR NÚMERO DE FICHA
========================================================= */
async function generarNumeroFicha() {
  if (!numeroFicha) return;

  try {
    numeroFicha.value = await obtenerSiguienteFicha();
    console.log("📝 Número de ficha generado:", numeroFicha.value);
  } catch (error) {
    console.error("Error generando número de ficha:", error);
    const timestamp = Date.now().toString().slice(-4);
    const anio = new Date().getFullYear();
    numeroFicha.value = `FIC-${anio}-${timestamp}`;
  }
}

/* =========================================================
   CORREO ESTUDIANTIL
========================================================= */
function configurarCorreoEstudiantil() {
  const input = document.getElementById("correoEstudiantil");
  if (!input) return;

  input.readOnly = true;
  input.style.backgroundColor = "#f3f4f6";
  input.style.cursor = "not-allowed";

  const DOMINIO = "@clases.edu.sv";

  if (nie) {
    nie.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
      const soloNumeros = this.value;
      input.value = soloNumeros ? soloNumeros + DOMINIO : "";
      validarCampo(input);
    });
  }
}

/* =========================================================
   FECHA DE NACIMIENTO
========================================================= */
function configurarFechaNacimiento() {
  if (!fechaNacimiento) return;

  const hoy = new Date();
  const hoyLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  fechaNacimiento.setAttribute("max", hoyLocal);
  const fechaCorteEdad = document.getElementById("fechaCorteEdad");
  if (fechaCorteEdad) fechaCorteEdad.value = hoyLocal;

  fechaNacimiento.addEventListener("change", function() {
    calcularEdad();
    validarSobreedad();
    actualizarRequeridoDuiEstudiante();
  });

  fechaNacimiento.addEventListener("input", function() {
    calcularEdad();
    validarSobreedad();
    actualizarRequeridoDuiEstudiante();
  });
}

/* =========================================================
   CALCULAR EDAD
========================================================= */
function calcularEdad() {
  if (!fechaNacimiento || !edad) return;

  if (!fechaNacimiento.value) {
    edad.value = "";
    return;
  }

  const nacimiento = new Date(fechaNacimiento.value + "T00:00:00");
  const fechaCorte = new Date();

  let anios = fechaCorte.getFullYear() - nacimiento.getFullYear();
  const mes = fechaCorte.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && fechaCorte.getDate() < nacimiento.getDate())) {
    anios--;
  }

  edad.value = anios;
}

/* =========================================================
   VALIDAR SOBREEDAD
========================================================= */
function validarSobreedad() {
  if (!edad || !grado) return;

  const reglas = {
    "Primer Año": { minima: 14, maxima: 18 },
    "Segundo Año": { minima: 15, maxima: 20 },
    "Tercer Año": { minima: 17, maxima: 20 },
  };
  const mensaje = document.getElementById("mensajeBloqueoEdad");
  const estadoRevision = document.getElementById("estadoRevisionEdad");
  const edadActual = parseInt(edad.value);
  const regla = reglas[grado.value];

  mensaje.classList.remove("mostrar");
  mensaje.textContent = "";
  if (avisoSobreedad) {
    avisoSobreedad.classList.remove("mostrar", "valido", "revision");
    avisoSobreedad.textContent = "";
  }

  if (!regla || Number.isNaN(edadActual)) {
    if (estadoRevision) estadoRevision.value = "No evaluada";
    actualizarBloqueoEdad(false);
    return;
  }

  if (edadActual < regla.minima) {
    mensaje.innerHTML = `El estudiante tiene <b>${edadActual} años</b>. ` +
      `${grado.value} requiere una edad mínima de <b>${regla.minima} años</b>.`;
    mensaje.classList.add("mostrar");
    if (estadoRevision) estadoRevision.value = "No permitido por edad mínima";
    actualizarBloqueoEdad(true);
  } else if (edadActual > regla.maxima && grado.value === "Primer Año") {
    mensaje.innerHTML = `El estudiante tiene <b>${edadActual} años</b>. ` +
      `Primer Año permite una edad máxima de <b>${regla.maxima} años</b>.`;
    mensaje.classList.add("mostrar");
    if (estadoRevision) estadoRevision.value = "No permitido por edad máxima";
    actualizarBloqueoEdad(true);
  } else if (grado.value === "Primer Año" && edadActual === 18) {
    if (avisoSobreedad) {
      avisoSobreedad.innerHTML = `⚠️ Precaución: el estudiante tiene <b>18 años</b>. Puede continuar con la matrícula, pero el caso quedará <b>pendiente de revisión administrativa</b>.`;
      avisoSobreedad.classList.add("mostrar", "revision");
    }
    if (estadoRevision) estadoRevision.value = "Pendiente";
    actualizarBloqueoEdad(false);
  } else if (edadActual > regla.maxima) {
    if (avisoSobreedad) {
      avisoSobreedad.innerHTML = `El estudiante tiene <b>${edadActual} años</b> y ` +
        `supera el máximo regular de <b>${regla.maxima} años</b> para ${grado.value}. ` +
        `Puede continuar, pero la solicitud quedará <b>pendiente de revisión administrativa</b>.`;
      avisoSobreedad.classList.add("mostrar", "revision");
    }
    if (estadoRevision) estadoRevision.value = "Pendiente";
    actualizarBloqueoEdad(false);
  } else {
    if (avisoSobreedad) {
      avisoSobreedad.innerHTML = `Edad válida: <b>${edadActual} años</b>. ` +
        `El rango permitido para ${grado.value} es de ${regla.minima} a ${regla.maxima} años.`;
      avisoSobreedad.classList.add("mostrar", "valido");
    }
    if (estadoRevision) estadoRevision.value = "No requerida";
    actualizarBloqueoEdad(false);
  }

  actualizarRequeridoDuiEstudiante();
}

/* =========================================================
   MOSTRAR PASO
========================================================= */
function mostrarPaso(paso) {
  if (!pasos.length) return;

  pasos.forEach((section, index) => {
    const stepNum = index + 1;

    if (stepNum === paso) {
      section.classList.add("activo");
      section.style.display = "block";
    } else {
      section.classList.remove("activo");
      section.style.display = "none";
    }
  });

  if (btnAnterior) {
    btnAnterior.style.display = paso === 1 ? "none" : "inline-block";
  }

  const secuencia = obtenerSecuenciaPasos();
  const posicion = secuencia.indexOf(paso);
  const esUltimoPaso = posicion === secuencia.length - 1;

  if (btnSiguiente) btnSiguiente.style.display = esUltimoPaso ? "none" : "inline-block";

  if (btnGuardar) {
    btnGuardar.style.display = esUltimoPaso ? "inline-block" : "none";
  }

  pasoActual = paso;
  actualizarBarraProgreso(paso);

  if (paso === 6) {
    actualizarDocumentacion();
  }
}

function actualizarBarraProgreso(paso) {
  const texto = document.getElementById("progresoTexto");
  const porcentaje = document.getElementById("progresoPorcentaje");
  const relleno = document.getElementById("progresoRelleno");

  const secuencia = obtenerSecuenciaPasos();
  const pasoVisible = secuencia.indexOf(paso) + 1;
  const totalVisible = secuencia.length;
  if (!texto || !porcentaje || !relleno || !totalVisible) return;

  const pct = Math.round((pasoVisible / totalVisible) * 100);
  texto.textContent = `Paso ${pasoVisible} de ${totalVisible}`;
  porcentaje.textContent = `${pct}%`;
  relleno.style.width = `${pct}%`;
}

function obtenerSecuenciaPasos() {
  return [1, 2, 3, 4, 5, 6];
}

function configurarConQuienVive() {
  if (!conQuienVive) return;
  const actualizar = () => {
    const esOtro = conQuienVive.value === "Otros";
    if (campoConQuienViveOtro) campoConQuienViveOtro.hidden = !esOtro;
    if (conQuienViveOtro) {
      conQuienViveOtro.required = esOtro;
      conQuienViveOtro.disabled = !esOtro;
      if (!esOtro) {
        conQuienViveOtro.value = "";
        limpiarError(conQuienViveOtro);
      }
    }
    // Las preguntas sobre la Madre y el Padre siempre se muestran y son
    // siempre obligatorias, sin importar con quién viva el estudiante.
    actualizarBarraProgreso(pasoActual);
  };
  conQuienVive.addEventListener("change", actualizar);
  actualizar();
}

function configurarTema() {
  const boton = document.getElementById("btnTema");
  if (!boton) return;
  const aplicar = (oscuro) => {
    document.body.classList.toggle("tema-oscuro", oscuro);
    boton.setAttribute("aria-pressed", String(oscuro));
    boton.setAttribute("aria-label", oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    boton.querySelector(".icono-tema").textContent = oscuro ? "☀️" : "🌙";
    boton.querySelector(".texto-tema").textContent = oscuro ? "Tema claro" : "Tema oscuro";
  };
  aplicar(localStorage.getItem("temaMatricula") === "oscuro");
  boton.addEventListener("click", () => {
    const oscuro = !document.body.classList.contains("tema-oscuro");
    aplicar(oscuro);
    localStorage.setItem("temaMatricula", oscuro ? "oscuro" : "claro");
  });
}

/* ============================================================
   VALIDACIÓN Y FORMATO DE TELÉFONOS
============================================================ */
const camposTelefono = [
  "telefonoEstudiante",
  "telefonoResponsable",
  "whatsappResponsable",
  "madreCelular",
  "padreCelular"
];

camposTelefono.forEach(id => {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.addEventListener("input", function () {
    let numeros = this.value.replace(/\D/g, "");
    numeros = numeros.substring(0, 8);
    if (numeros.length > 4) {
      numeros = numeros.substring(0, 4) + "-" + numeros.substring(4);
    }
    this.value = numeros;
  });
});

/* ============================================================
   VALIDACIÓN Y FORMATO DE DUI
============================================================ */
const camposDui = [
  "duiEstudiante",
  "duiResponsable",
  "madreDui",
  "padreDui"
];

camposDui.forEach(id => {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.addEventListener("input", function () {
    let numeros = this.value.replace(/\D/g, "");
    numeros = numeros.substring(0, 9);
    if (numeros.length > 8) {
      numeros = numeros.substring(0, 8) + "-" + numeros.substring(8);
    }
    this.value = numeros;
  });
});

/* ============================================================
   CAMPOS DE SOLO LETRAS
============================================================ */
const camposLetraCortos = [
  "primerApellido",
  "segundoApellido",
  "primerNombre",
  "segundoNombre"
];

const camposLetraLargos = [
  "responsable",
  "madreNombre",
  "padreNombre"
];

const camposSoloLetras = ["parentesco"];

function capitalizarTexto(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .map(palabra => (palabra.length ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(" ");
}

function capitalizarEnVivo(input) {
  const posicionCursor = input.selectionStart;
  const valorOriginal = input.value;
  const valorCapitalizado = capitalizarTexto(valorOriginal);

  if (valorOriginal !== valorCapitalizado) {
    input.value = valorCapitalizado;
    input.setSelectionRange(posicionCursor, posicionCursor);
  }
}

function configurarCampoSoloLetras(id, maxLongitud) {
  const campo = document.getElementById(id);
  if (!campo) return;

  if (maxLongitud) campo.setAttribute("maxlength", String(maxLongitud));

  campo.addEventListener("input", function () {
    let valor = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "");
    if (maxLongitud) valor = valor.slice(0, maxLongitud);
    this.value = valor;
    capitalizarEnVivo(this);
  });

  campo.addEventListener("blur", function () {
    if (this.value.trim()) {
      this.value = capitalizarTexto(this.value.trim());
    }
    validarCampo(this);
  });
}

camposLetraCortos.forEach(id => configurarCampoSoloLetras(id, 10));
camposLetraLargos.forEach(id => configurarCampoSoloLetras(id, 50));
camposSoloLetras.forEach(id => configurarCampoSoloLetras(id, null));

/* ============================================================
   CAMPOS DE SOLO NÚMEROS (partida de nacimiento)
============================================================ */
const camposNumeroSimple = [
  "partidaNumero",
  "folio",
  "tomo",
  "libro"
];

camposNumeroSimple.forEach(id => {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
  });
});