import { db } from "../firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================
   REFERENCIAS
========================================================= */
const form = document.getElementById("matriculaForm");
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

const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const btnGuardar = document.getElementById("btnGuardar");

const pasos = document.querySelectorAll(".form-step");

const fotoInput = document.getElementById("fotoEstudiante");
const vistaPrevia = document.getElementById("vistaPreviaFoto");

let pasoActual = 1;
const TOTAL_PASOS = pasos.length;

/* =========================================================
   VALIDACIÓN POR CAMPO (mensajes en vivo + bloqueo de avance)
========================================================= */
const mensajesPersonalizados = {
  nie: "El NIE debe contener solo números (máximo 9 dígitos).",
  duiEstudiante: "Formato requerido: 00000000-0.",
  lugarNacimiento: "Ingrese el lugar de nacimiento del estudiante.",
  tipoTransporte: "Seleccione el tipo de transporte que utiliza.",
  distanciaKm: "Ingrese la distancia en kilómetros hasta la institución.",
  zonaResidencia: "Seleccione la zona de residencia.",
  conQuienVive: "Seleccione con quién vive el estudiante.",
  direccionResidencia: "Ingrese la dirección de residencia.",
  primerApellido: "Ingrese el primer apellido (solo letras, máximo 10 caracteres).",
  segundoApellido: "Ingrese el segundo apellido (solo letras, máximo 10 caracteres).",
  primerNombre: "Ingrese el primer nombre (solo letras, máximo 10 caracteres).",
  segundoNombre: "Ingrese el segundo nombre (solo letras, máximo 10 caracteres).",
  fechaNacimiento: "Seleccione la fecha de nacimiento del estudiante.",
  sexo: "Seleccione el sexo del estudiante.",
  telefonoEstudiante: "Formato requerido: 0000-0000.",
  correoEstudiantil: "Escriba solo números; el dominio @clases.edu.sv se agrega automáticamente.",
  correoPersonal: "Ingrese un correo electrónico válido con arroba (@).",
  grado: "Seleccione el grado que cursará.",
  especialidad: "Seleccione la especialidad o bachillerato.",
  ultimoAnioAprobado: "Seleccione el último año aprobado.",
  colegioAnterior: "Ingrese el nombre del centro educativo anterior.",
  hermanosCentroeducativo: "Indique si tiene hermanos en el centro educativo.",
  nombresHermanos: "Ingrese el nombre del hermano o hermana (solo letras).",
  computadoraMineducyt: "Indique si posee computadora MINEDUCYT.",
  internet: "Indique si posee acceso a internet.",
  tallaZapatos: "Ingrese la talla de zapatos.",
  tallaCamisa: "Ingrese la talla de camisa.",
  tallaPantalon: "Ingrese la talla de pantalón.",
  tallaBlusa: "Ingrese la talla de blusa.",
  tallaFalda: "Ingrese la talla de falda.",
  vacunaCovid: "Indique si tiene la vacuna COVID-19.",
  enfermedad: "Indique si padece alguna enfermedad.",
  cualEnfermedad: "Especifique la enfermedad.",
  medicamento: "Especifique el medicamento que utiliza.",
  responsable: "Ingrese el nombre del responsable (solo letras).",
  parentesco: "Ingrese el parentesco (solo letras).",
  duiResponsable: "Formato requerido: 00000000-0.",
  telefonoResponsable: "Formato requerido: 0000-0000.",
  whatsappResponsable: "Formato requerido: 0000-0000.",
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
  partidaNumero: "Ingrese el número de partida (solo números).",
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

// Valida un solo campo y muestra/oculta su mensaje de error
function validarCampo(el) {
  if (el.type === "file" || el.type === "submit" || el.type === "button") return true;
  if (el.readOnly || el.disabled) return true;

  if (!campoVisible(el)) {
    limpiarError(el);
    return true;
  }

  let valido = true;
  let mensaje = "";
  const valor = el.value ? el.value.trim() : "";

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

  // Validación extra: el correo personal siempre debe contener "@"
  if (valido && el.id === "correoPersonal" && valor && !valor.includes("@")) {
    valido = false;
    mensaje = "El correo debe contener el símbolo arroba (@).";
  }

  // Validación extra: NIE ya registrado (se marca desde verificarNieDuplicado)
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

// Valida todos los campos visibles de un paso; si hay error, enfoca el primero
function validarPaso(numeroPaso) {
  const seccion = document.querySelector(`.form-step[data-step="${numeroPaso}"]`);
  if (!seccion) return true;

  const campos = seccion.querySelectorAll("input, select, textarea");
  let pasoValido = true;
  let primerInvalido = null;

  campos.forEach((el) => {
    if (el.type === "submit" || el.type === "button" || el.readOnly || el.disabled) return;
    const ok = validarCampo(el);
    if (!ok) {
      pasoValido = false;
      if (!primerInvalido) primerInvalido = el;
    }
  });

  if (primerInvalido) {
    primerInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
    primerInvalido.focus({ preventScroll: true });
  }

  return pasoValido;
}

// Enlazar validación en vivo a todos los campos del formulario
const todosLosCampos = form.querySelectorAll("input, select, textarea");
todosLosCampos.forEach((el) => {
  if (el.type === "submit" || el.type === "button" || el.type === "file") return;
  el.addEventListener("input", () => validarCampo(el));
  el.addEventListener("change", () => validarCampo(el));
  el.addEventListener("blur", () => validarCampo(el));
});

/* =========================================================
   NIE DUPLICADO — verificar contra Firestore
========================================================= */

// Consulta Firestore y devuelve true si el NIE ya existe en "matriculas"
async function nieYaExisteEnBD(valorNie) {
  if (!valorNie) return false;
  try {
    const q = query(collection(db, "matriculas"), where("nie", "==", valorNie));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error verificando NIE duplicado:", error);
    // Si falla la consulta, no bloqueamos al usuario por un problema de red/permisos;
    // la validación final se repite de todas formas al enviar el formulario.
    return false;
  }
}

// Verificación en vivo cuando el usuario termina de escribir el NIE (blur)
async function verificarNieDuplicado() {
  if (!nie) return;
  const valor = nie.value.trim();

  // Limpiar estado previo mientras se revisa
  nie.dataset.duplicado = "false";

  if (!valor) return;

  const span = obtenerSpanError(nie);
  const contenedor = obtenerContenedor(nie);
  if (span) span.textContent = "Verificando NIE…";
  if (contenedor) contenedor.classList.remove("campo-invalido");

  const existe = await nieYaExisteEnBD(valor);
  nie.dataset.duplicado = existe ? "true" : "false";

  // Vuelve a correr la validación normal del campo, que ahora
  // toma en cuenta dataset.duplicado
  validarCampo(nie);

  if (!existe && span && span.textContent === "Verificando NIE…") {
    span.textContent = "";
  }
}

if (nie) {
  nie.addEventListener("blur", verificarNieDuplicado);
  // Si el usuario vuelve a editar el NIE después de haber sido marcado
  // como duplicado, se limpia esa marca hasta la próxima verificación.
  nie.addEventListener("input", () => {
    nie.dataset.duplicado = "false";
  });
}

/* =========================================================
   FUNCIONES FALTANTES (AGREGADAS)
========================================================= */

// Bloquea únicamente el avance. La fecha y el grado quedan disponibles
// para que el usuario pueda corregirlos sin perder lo que ya escribió.
function actualizarBloqueoEdad(bloqueado) {
  if (form) form.dataset.edadBloqueada = bloqueado ? "true" : "false";
  if (btnSiguiente && pasoActual === 1) btnSiguiente.disabled = bloqueado;
  if (btnGuardar) btnGuardar.disabled = bloqueado;
}

// Función para configurar campos de salud
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

// Función para configurar la foto (versión mejorada)
function configurarFoto() {
  if (!fotoInput) return;

  fotoInput.addEventListener("change", function(e) {
    const file = this.files[0];
    if (!file) {
      if (vistaPrevia) vistaPrevia.innerHTML = "";
      return;
    }

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert("⚠️ Solo se permiten archivos de imagen");
      this.value = "";
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("⚠️ La imagen no debe superar los 2MB");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      // Guardar la imagen en Base64 en un campo oculto
      const fotoBase64 = event.target.result;
      
      // Mostrar vista previa
      const img = document.createElement("img");
      img.src = fotoBase64;
      img.alt = "Foto del estudiante";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      if (vistaPrevia) {
        vistaPrevia.innerHTML = "";
        vistaPrevia.appendChild(img);
      }
      
      // Guardar el Base64 en un input oculto para enviarlo
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

// Función para configurar campos de hermanos
function configurarCamposHermanos() {
  const selectHermanos = document.getElementById("hermanosCentroeducativo");
  const campoNombres = document.getElementById("campoNombresHermanos");
  const campoNivel = document.getElementById("campoNivelAcademico");
  const inputNombres = document.getElementById("nombresHermanos");
  const inputNivel = document.getElementById("nivelAcademico");

  if (!selectHermanos) return;

  selectHermanos.addEventListener("change", function() {
    if (this.value === "Sí") {
      if (campoNombres) campoNombres.style.display = "block";
      if (campoNivel) campoNivel.style.display = "block";
      if (inputNombres) inputNombres.required = true;
      if (inputNivel) inputNivel.required = true;
    } else {
      if (campoNombres) campoNombres.style.display = "none";
      if (campoNivel) campoNivel.style.display = "none";
      if (inputNombres) {
        inputNombres.required = false;
        inputNombres.value = "";
        limpiarError(inputNombres);
      }
      if (inputNivel) {
        inputNivel.required = false;
        inputNivel.value = "";
        limpiarError(inputNivel);
      }
    }
  });
}

/* =========================================================
   VALIDACIÓN DE FORMATO DE TALLAS (letras y números)
========================================================= */
const TALLAS_VALIDAS = ["XS", "S", "M", "L", "XL"];

const camposLetra = ["tallaCamisa", "tallaPantalon", "tallaBlusa", "tallaFalda"];
const camposNumero = ["tallaZapatos"];

function getErrorSpan(input) {
  // Busca automáticamente el span de error asociado, si existe
  return document.getElementById("error" + input.id.replace("talla", ""));
}

function mostrarError(input, mensaje, errorSpan = getErrorSpan(input)) {
  input.classList.add("input-invalido");
  if (errorSpan) errorSpan.textContent = mensaje;
}

function limpiarErrorTalla(input, errorSpan = getErrorSpan(input)) {
  input.classList.remove("input-invalido");
  if (errorSpan) errorSpan.textContent = "";
}

function validarTallaLetra(input) {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
  });

  input.addEventListener("blur", () => {
    const valor = input.value.trim().toUpperCase();
    input.value = valor;

    if (!input.required && valor === "") {
      limpiarErrorTalla(input);
      return;
    }
    if (valor === "") {
      mostrarError(input, "Este campo es obligatorio.");
    } else if (!TALLAS_VALIDAS.includes(valor)) {
      mostrarError(input, "Talla inválida. Use: XS, S, M, L, XL.");
    } else {
      limpiarErrorTalla(input);
    }
  });
}

function validarTallaNumero(input) {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "").slice(0, 2);
  });

  input.addEventListener("blur", () => {
    const valor = input.value.trim();

    if (!input.required && valor === "") {
      limpiarErrorTalla(input);
      return;
    }
    if (valor === "") {
      mostrarError(input, "Este campo es obligatorio.");
    } else if (!/^\d{1,2}$/.test(valor)) {
      mostrarError(input, "Solo números, máximo 2 dígitos.");
    } else {
      limpiarErrorTalla(input);
    }
  });
}

function inicializarValidacionTallas() {
  camposLetra.forEach(id => {
    const input = document.getElementById(id);
    if (input) validarTallaLetra(input);
  });

  camposNumero.forEach(id => {
    const input = document.getElementById(id);
    if (input) validarTallaNumero(input);
  });
}

/* =========================================================
   CONFIGURACIÓN DE TALLAS (tu función original, sin cambios)
========================================================= */
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

/* =========================================================
   INICIALIZACIÓN
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  configurarTallas();
  inicializarValidacionTallas();
});

/* =========================================================
   INICIO
========================================================= */
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

    // ===== EVENTOS DE NAVEGACIÓN =====
    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", async () => {
        // No avanza al siguiente paso si el paso actual tiene campos inválidos
        if (!validarPaso(pasoActual)) return;

        // Si estamos saliendo del paso que contiene el NIE, confirmar que
        // no esté duplicado antes de continuar.
        if (pasoActual === 1 && nie) {
          await verificarNieDuplicado();
          if (nie.dataset.duplicado === "true") {
            validarCampo(nie);
            nie.scrollIntoView({ behavior: "smooth", block: "center" });
            nie.focus({ preventScroll: true });
            return;
          }
        }

        if (pasoActual < TOTAL_PASOS) {
          mostrarPaso(pasoActual + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    if (btnAnterior) {
      btnAnterior.addEventListener("click", () => {
        if (pasoActual > 1) {
          mostrarPaso(pasoActual - 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    // ===== VALIDACIONES EXTRA =====
    if (grado) grado.addEventListener("change", validarSobreedad);
    if (tipoIngreso) tipoIngreso.addEventListener("change", validarSobreedad);

  } catch (error) {
    console.error("Error al iniciar el formulario:", error);
  }
});

/* =========================================================
   ENVÍO DEL FORMULARIO (FUERA DEL DOMContentLoaded)
========================================================= */
if (form) {
  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    // Verificar si el formulario está bloqueado por edad
    const mensajeBloqueo = document.getElementById("mensajeBloqueoEdad");
    if (mensajeBloqueo && mensajeBloqueo.classList.contains("mostrar")) {
      alert("❌ No se puede guardar la matrícula porque el estudiante supera la edad máxima permitida.");
      return;
    }

    // Validar todos los pasos (mensaje individual debajo de cada campo
    // y salto automático al primer paso con errores)
    let formularioValido = true;
    let primerPasoInvalido = null;

    for (let i = 1; i <= TOTAL_PASOS; i++) {
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

    // Verificación final e infalible: revisar contra Firestore que el NIE
    // no exista ya, justo antes de guardar (evita condiciones de carrera
    // o que el usuario haya editado el NIE sin volver a salir del campo).
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

    // Preparar datos
    const formData = new FormData(form);
    const data = {};

    // Procesar cada campo
    formData.forEach((value, key) => {
      // Ignorar el campo de archivo (fotoEstudiante)
      if (key !== "fotoEstudiante" && value.trim() !== "") {
        data[key] = value;
      }
    });

    // Agregar la foto en Base64 si existe
    const fotoBase64Input = document.getElementById("fotoBase64");
    if (fotoBase64Input && fotoBase64Input.value) {
      data.fotoEstudiante = fotoBase64Input.value;
    }

    // Agregar metadatos
    data.fechaMatricula = fechaMatricula ? fechaMatricula.textContent : "";
    data.horaMatricula = horaMatricula ? horaMatricula.textContent : "";
    data.numeroFicha = numeroFicha ? numeroFicha.value : "";
    data.estado = "Activo";
    data.fechaRegistro = new Date().toISOString();

    console.log("📤 Datos a guardar:", data);

    try {
      // Mostrar mensaje de carga
      if (mensajeExito) {
        mensajeExito.textContent = "⏳ Guardando matrícula...";
        mensajeExito.style.color = "blue";
      }

      const docRef = await addDoc(collection(db, "matriculas"), data);
      console.log("✅ Matrícula guardada con ID:", docRef.id);

      if (mensajeExito) {
        mensajeExito.textContent = "✅ ¡Matrícula guardada exitosamente! ID: " + docRef.id;
        mensajeExito.style.color = "green";
        mensajeExito.style.fontWeight = "bold";
        mensajeExito.style.fontSize = "1.2rem";
      }

      // Resetear formulario después de 3 segundos
      setTimeout(async () => {
        form.reset();
        if (vistaPrevia) vistaPrevia.innerHTML = "";
        if (edad) edad.value = "";
        if (nie) nie.dataset.duplicado = "false";
        
        // Limpiar campos de tallas según sexo
        const sexoSelect = document.getElementById("sexo");
        if (sexoSelect) sexoSelect.value = "";
        configurarTallas();
        
        // Eliminar foto Base64
        const fotoBase64 = document.getElementById("fotoBase64");
        if (fotoBase64) fotoBase64.remove();

        // Limpiar mensajes de error visibles
        form.querySelectorAll(".campo-invalido").forEach(c => c.classList.remove("campo-invalido"));
        form.querySelectorAll(".error-mensaje").forEach(s => s.textContent = "");
        
        if (mensajeExito) {
          mensajeExito.textContent = "";
          mensajeExito.style.color = "";
        }
        
        window.scrollTo({ top: 0, behavior: "smooth" });
        await generarNumeroFicha();
        mostrarPaso(1);
      }, 3000);

    } catch (error) {
      console.error("❌ Error al guardar:", error);
      if (mensajeExito) {
        mensajeExito.textContent = "❌ Error al guardar: " + error.message;
        mensajeExito.style.color = "red";
      }
      
      // Mostrar error más amigable
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
  horas = horas ? horas : 12; // el 0 se muestra como 12
  const horasFormateadas = String(horas).padStart(2, "0");

  horaMatricula.textContent = `${horasFormateadas}:${minutos} ${ampm}`;
}

/* =========================================================
   GENERAR NÚMERO DE FICHA
========================================================= */
async function generarNumeroFicha() {
  if (!numeroFicha) return;

  try {
    const snapshot = await getDocs(collection(db, "matriculas"));
    const total = snapshot.size + 1;
    const correlativo = String(total).padStart(3, "0");
    const anio = new Date().getFullYear();
    numeroFicha.value = `FIC-${anio}-${correlativo}`;
    console.log("📝 Número de ficha generado:", numeroFicha.value);
  } catch (error) {
    console.error("Error generando número de ficha:", error);
    // Fallback: usar timestamp
    const timestamp = Date.now().toString().slice(-4);
    const anio = new Date().getFullYear();
    numeroFicha.value = `FIC-${anio}-${timestamp}`;
  }
}

/* =========================================================
   CORREO ESTUDIANTIL — el usuario solo escribe números,
   el dominio "@clases.edu.sv" se agrega automáticamente.
========================================================= */
function configurarCorreoEstudiantil() {
  const input = document.getElementById("correoEstudiantil");
  if (!input) return;

  const DOMINIO = "@clases.edu.sv";

  input.addEventListener("input", () => {
    // Tomar solo lo que el usuario escribió antes del arroba (si lo hay)
    // y dejar únicamente números.
    const parteUsuario = input.value.split("@")[0];
    const soloNumeros = parteUsuario.replace(/\D/g, "");

    input.value = soloNumeros ? soloNumeros + DOMINIO : "";

    // Mantener el cursor justo después de los números (antes del dominio)
    const posicionCursor = soloNumeros.length;
    requestAnimationFrame(() => {
      try {
        input.setSelectionRange(posicionCursor, posicionCursor);
      } catch (err) {
        /* algunos navegadores/campos pueden no soportarlo, se ignora */
      }
    });

    if (soloNumeros && !/^[0-9]+@clases\.edu\.sv$/.test(input.value)) {
      input.setCustomValidity("El correo debe contener solo números y el dominio @clases.edu.sv");
    } else {
      input.setCustomValidity("");
    }
  });

  // Evitar que el usuario pegue texto con letras dentro del correo
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const texto = (e.clipboardData || window.clipboardData).getData("text");
    const soloNumeros = texto.replace(/\D/g, "");
    input.value = soloNumeros ? soloNumeros + DOMINIO : "";
    validarCampo(input);
  });
}

/* =========================================================
   AUTOCOMPLETAR CORREO ESTUDIANTIL DESDE EL NIE
   Cada vez que el usuario escribe en el campo NIE, el correo
   estudiantil se llena automáticamente con esos mismos números
   más el dominio @clases.edu.sv
========================================================= */
const DOMINIO_CORREO_ESTUDIANTIL = "@clases.edu.sv";

function sincronizarCorreoEstudiantilConNie() {
  const correoEstudiantil = document.getElementById("correoEstudiantil");
  if (!correoEstudiantil || !nie) return;

  const soloNumeros = nie.value.replace(/\D/g, "");
  correoEstudiantil.value = soloNumeros ? soloNumeros + DOMINIO_CORREO_ESTUDIANTIL : "";
  correoEstudiantil.setCustomValidity("");

  // Refresca el mensaje de error/validación del campo si ya se había tocado
  validarCampo(correoEstudiantil);
}

/* =========================================================
   FECHA DE NACIMIENTO
========================================================= */
function configurarFechaNacimiento() {
  if (!fechaNacimiento) return;

  // No se permite seleccionar una fecha futura. Los límites por grado se
  // comprueban con la edad calculada a la fecha de corte del ciclo 2027.
  const hoy = new Date();
  const hoyLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  fechaNacimiento.setAttribute("max", hoyLocal);

  fechaNacimiento.addEventListener("change", function() {
    calcularEdad();
    validarSobreedad();
  });

  fechaNacimiento.addEventListener("input", function() {
    calcularEdad();
    validarSobreedad();
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
  const fechaCorte = new Date("2027-01-01T00:00:00");

  let anios = fechaCorte.getFullYear() - nacimiento.getFullYear();
  const mes = fechaCorte.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && fechaCorte.getDate() < nacimiento.getDate())) {
    anios--;
  }

  edad.value = anios;
  console.log("Edad calculada:", anios);
}

/* =========================================================
   VALIDAR SOBREEDAD
========================================================= */
function validarSobreedad() {
  if (!edad || !grado) return;

  const reglas = {
    "Primer Año": { minima: 14, maxima: 17 },
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
    mensaje.innerHTML = `El estudiante tendrá <b>${edadActual} años</b> al 1 de enero de 2027. ` +
      `${grado.value} requiere una edad mínima de <b>${regla.minima} años</b>.`;
    mensaje.classList.add("mostrar");
    if (estadoRevision) estadoRevision.value = "No permitido por edad mínima";
    actualizarBloqueoEdad(true);
  } else if (edadActual > regla.maxima && grado.value === "Primer Año") {
    mensaje.innerHTML = `El estudiante tendrá <b>${edadActual} años</b> al 1 de enero de 2027. ` +
      `Primer Año permite una edad máxima de <b>${regla.maxima} años</b>.`;
    mensaje.classList.add("mostrar");
    if (estadoRevision) estadoRevision.value = "No permitido por edad máxima";
    actualizarBloqueoEdad(true);
  } else if (edadActual > regla.maxima) {
    if (avisoSobreedad) {
      avisoSobreedad.innerHTML = `El estudiante tendrá <b>${edadActual} años</b> al 1 de enero de 2027 y ` +
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

  if (btnSiguiente) {
    btnSiguiente.style.display = paso === TOTAL_PASOS ? "none" : "inline-block";
  }

  if (btnGuardar) {
    btnGuardar.style.display = paso === TOTAL_PASOS ? "inline-block" : "none";
  }

  pasoActual = paso;
  actualizarBarraProgreso(paso);
}

/* =========================================================
   BARRA DE PROGRESO (paso actual / total, con relleno)
========================================================= */
function actualizarBarraProgreso(paso) {
  const texto = document.getElementById("progresoTexto");
  const porcentaje = document.getElementById("progresoPorcentaje");
  const relleno = document.getElementById("progresoRelleno");

  if (!texto || !porcentaje || !relleno || !TOTAL_PASOS) return;

  const pct = Math.round((paso / TOTAL_PASOS) * 100);
  texto.textContent = `Paso ${paso} de ${TOTAL_PASOS}`;
  porcentaje.textContent = `${pct}%`;
  relleno.style.width = `${pct}%`;
}

/* ============================================================
   VALIDACIÓN Y FORMATO DE TELÉFONOS
   Formato obligatorio: 0000-0000
   (solo números, no se permiten letras)
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

    // Eliminar todo lo que NO sea número
    let numeros = this.value.replace(/\D/g, "");

    // Máximo 8 números
    numeros = numeros.substring(0, 8);

    // Agregar guion después de los primeros 4
    if (numeros.length > 4) {
      numeros =
        numeros.substring(0, 4) +
        "-" +
        numeros.substring(4);
    }

    this.value = numeros;
  });

});

/* ============================================================
   VALIDACIÓN Y FORMATO DE DUI y NIE
   Formato DUI: 00000000-0 / NIE: solo números
   (solo números, no se permiten letras)
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

    // Eliminar letras y cualquier carácter que no sea número
    let numeros = this.value.replace(/\D/g, "");

    // Máximo 9 números
    numeros = numeros.substring(0, 9);

    // Agregar guion antes del último número
    if (numeros.length > 8) {
      numeros =
        numeros.substring(0, 8) +
        "-" +
        numeros.substring(8);
    }

    this.value = numeros;
  });

});

/* ============================================================
   VALIDACIÓN NIE — solo números
   Además de dejar solo números, sincroniza automáticamente
   el correo electrónico estudiantil con el valor del NIE.
   ============================================================ */
if (nie) {
  nie.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
    sincronizarCorreoEstudiantilConNie();
  });
}

/* ============================================================
   CAMPOS DE SOLO LETRAS (nombres, apellidos, parentesco, etc.)
   No permite números ni símbolos, solo letras, tildes, ñ y espacios.
   Además, se capitaliza EN VIVO (mientras se escribe) la primera
   letra de cada palabra (Ej: "juan carlos" -> "Juan Carlos"),
   y se vuelve a normalizar al salir del campo (blur).
   ============================================================ */

// Campos que están divididos (apellido/nombre por separado): máximo 10
const camposLetraCortos = [
  "primerApellido",
  "segundoApellido",
  "primerNombre",
  "segundoNombre"
];

// Campos de nombre completo en un solo input: máximo 50
const camposLetraLargos = [
  "nombresHermanos",
  "responsable",
  "madreNombre",
  "padreNombre"
];

// Campo de solo letras sin restricción especial de longitud de nombre (parentesco)
const camposSoloLetras = ["parentesco"];

function capitalizarTexto(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .map(palabra => (palabra.length ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(" ");
}

// Capitaliza en vivo conservando la posición del cursor
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
    // Solo letras, tildes, ñ y espacios — nada de números ni símbolos
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
