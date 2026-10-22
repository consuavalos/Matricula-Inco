import { protegerRuta } from "../auth-guard.js";
import {
  activarEdicion,
  desactivarEdicion,
  etiquetaCampo,
  marcarErrorCampo,
  nieBusquedaValido,
  restringirBuscadorNie,
  validarMatricula,
} from "../validacion-matricula.js";
import {
  actualizarMatricula,
  buscarMatriculaPorNie,
  guardarDocumentos as guardarDocumentosSupabase,
} from "../supabase-data.js";

const accesoDocente = await protegerRuta("docente");

if (accesoDocente) {
  const identificador = document.getElementById("identificadorDocente");
  const nombre = sessionStorage.getItem("nombreUsuario") || "Docente";
  if (identificador) identificador.textContent = `Docente responsable: ${nombre}`;
}

/* =========================================================
   INDICACIONES / DOCUMENTOS REQUERIDOS POR AÑO
   (Si se edita aquí, editar igual en Administrador/admin.js)
   NOTA: el punto 1 de "tercer_antiguo" se completó siguiendo el
   patrón de "segundo_antiguo"; verifique contra el volante físico.
========================================================= */
const INDICACIONES = {
  primer_nuevo: {
    etiqueta: "Primer Año - Nuevo Ingreso",
    items: [
      "Boleta o Certificado de Noveno Grado (Original y copia) con firma y sello",
      "Partida de nacimiento reciente, que no exceda 3 meses (Original y copia)",
      "Constancia de Conducta (Original y copia)",
      "Cuatro fotografías de 3.5cm x 2.5cm, blanco y negro de tiempo, en papel granulado",
      "Hoja de inscripción con llenado completo y datos reales solicitados",
      "Dos fotocopias de DUI del Responsable (al 150%)",
    ],
  },
  segundo_nuevo: {
    etiqueta: "Segundo Año - Nuevo Ingreso / Traslado",
    items: [
      "Certificado de 9° y 1° año de bachillerato (Original y copia)",
      "Partida de nacimiento reciente (Original y copia)",
      "Cuatro fotografías de 3.5cm x 2.5cm, blanco y negro de tiempo, en papel granulado",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul)",
      "Fotocopias de DUI (al 150%) si es mayor de edad",
    ],
  },
  segundo_antiguo: {
    etiqueta: "Segundo Año - Antiguo Ingreso",
    items: [
      "Certificado o boletas con firma y sello de notas de 9° grado y 1° año de bachillerato (Original y copia)",
      "Partida de nacimiento reciente (Original y copia)",
      "Constancia de Conducta (Original y copia)",
      "Constancia de Servicio Social Estudiantil (Original y copia)",
      "Cuatro fotografías de 3.5cm x 2.5cm, blanco y negro de tiempo, en papel granulado",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul)",
      "Dos fotocopias de DUI del Responsable (al 150%)",
    ],
  },
  tercer_antiguo: {
    etiqueta: "Tercer Año - Antiguo Ingreso",
    items: [
      "Certificado o boletas con firma y sello de notas de 9°, 1° y 2° año de bachillerato (Original y copia) — VERIFICAR contra volante físico",
      "Partida de nacimiento reciente (Original y copia)",
      "Constancia de Conducta (Original y copia)",
      "Constancia de Servicio Social Estudiantil (Original y copia)",
      "Prueba de Avanzo (Original y copia)",
      "Cuatro fotografías de 3.5cm x 2.5cm, blanco y negro de tiempo, en papel granulado",
      "Hoja de inscripción con llenado completo y datos solicitados (letra legible y tinta azul)",
      "Dos fotocopias de DUI del Responsable (al 150%)",
    ],
  },
};

const INDICACIONES_GENERALES = [
  "El o la estudiante debe venir acompañado de su padre, madre o responsable",
  "Las fotografías deben venir con el nombre completo del estudiante escrito",
  "Niñas: no lucir peinados extravagantes, maquillaje, cabello pintado ni aretes",
  "Niños: corte de cabello formal (clara/francesa) y sin barba",
];

/* =========================================================
   REFERENCIAS
========================================================= */
const mensajeBusqueda = document.getElementById("mensajeBusqueda");
const resultadosSection = document.getElementById("resultadosBusqueda");
const buscarInput = document.getElementById("buscarInput");
const seccionDocumentos = document.getElementById("seccionDocumentos");
const tipoIndicacionesSelect = document.getElementById("tipoIndicacionesSelect");
const listaPrincipal = document.getElementById("listaPrincipal");
const listaGeneral = document.getElementById("listaGeneral");
const observacionesDocumentos = document.getElementById("observacionesDocumentos");
const mensajeDocumentos = document.getElementById("mensajeDocumentos");

let matriculaActual = null;
let guardandoCambios = false;

/* Todos los campos de la ficha (mismo listado que el administrador + tipoIngreso) */
const CAMPOS_FICHA = [
  "numeroFicha", "fechaMatricula", "nie",
  "primerApellido", "segundoApellido", "primerNombre", "segundoNombre",
  "fechaNacimiento", "edad", "sexo", "telefonoEstudiante", "correoEstudiantil", "correoPersonal",
  "grado", "tipoIngreso", "especialidad", "ultimoAnioAprobado", "colegioAnterior",
  "hermanosCentroeducativo", "nombresHermanos", "nivelAcademico",
  "computadoraMineducyt", "internet",
  "tallaCamisa", "tallaPantalon", "tallaBlusa", "tallaFalda", "tallaZapatos",
  "enfermedad", "cualEnfermedad", "medicamento", "otros",
  "responsable", "parentesco", "duiResponsable", "telefonoResponsable",
  "whatsappResponsable", "correoResponsable",
  "madreNombre", "madreOcupacion", "madreLugarTrabajo", "madreDui",
  "madreLugarNacimiento", "madreFechaNacimiento", "madreCelular",
  "padreNombre", "padreOcupacion", "padreLugarTrabajo", "padreDui",
  "padreLugarNacimiento", "padreFechaNacimiento", "padreCelular",
];

/* =========================================================
   EDICIÓN DE DATOS
========================================================= */
function establecerEdicion(activa) {
  resultadosSection.querySelectorAll('input[id^="r_"]').forEach((campo) => {
    campo.readOnly = !activa;
    campo.classList.toggle("campo-editable", activa);
  });
  document.getElementById("btnModificar").style.display = activa ? "none" : "inline-block";
  document.getElementById("btnGuardarCambios").style.display = activa ? "inline-block" : "none";
  document.getElementById("btnCancelarCambios").style.display = activa ? "inline-block" : "none";
  // Aplica / quita las mismas restricciones del formulario de Nuevo Ingreso
  if (activa) activarEdicion(resultadosSection);
  else desactivarEdicion(resultadosSection);
}

window.modificarcampos = function () {
  if (!accesoDocente || guardandoCambios) return;
  if (!matriculaActual) {
    alert("⚠️ Primero busque un estudiante.");
    return;
  }
  establecerEdicion(true);
  mostrarMensaje("Puede modificar los datos y luego guardar los cambios o cancelar.", "info");
};

window.cancelarModificacion = function () {
  if (!matriculaActual || guardandoCambios) return;
  mostrarResultados(matriculaActual);
  establecerEdicion(false);
  mostrarMensaje("Modificación cancelada.", "info");
};

window.guardarCambios = async function () {
  if (!accesoDocente || !matriculaActual || guardandoCambios) return;
  const cambios = {};
  resultadosSection.querySelectorAll('input[id^="r_"]').forEach((campo) => {
    const clave = campo.id.slice(2);
    const valor = campo.value.trim();
    if (valor !== String(matriculaActual[clave] ?? "")) cambios[clave] = valor;
  });
  if (!Object.keys(cambios).length) {
    establecerEdicion(false);
    mostrarMensaje("No hay cambios para guardar.", "info");
    return;
  }
  // Mismas reglas del formulario de Nuevo Ingreso, aplicadas a lo que se modificó
  const errores = validarMatricula(resultadosSection, Object.keys(cambios));
  if (!Object.keys(errores).length && "nie" in cambios) {
    try {
      const existente = await buscarMatriculaPorNie(cambios.nie);
      if (existente) errores.nie = "Ya existe una matrícula con ese NIE";
    } catch (error) {
      console.error("No se pudo comprobar si el NIE ya existe:", error);
    }
    if (errores.nie) marcarErrorCampo(resultadosSection, "nie", errores.nie);
  }
  if (Object.keys(errores).length) {
    const lista = Object.keys(errores).map((k) => etiquetaCampo(resultadosSection, k)).join(", ");
    mostrarMensaje(`Corrija los campos marcados en rojo: ${lista}.`, "warning");
    return;
  }
  guardandoCambios = true;
  const controles = [document.getElementById("btnGuardarCambios"), document.getElementById("btnCancelarCambios"), buscarInput];
  controles.forEach((control) => (control.disabled = true));
  resultadosSection.querySelectorAll('input[id^="r_"]').forEach((campo) => (campo.readOnly = true));
  mostrarMensaje("Guardando cambios…", "loading");
  try {
    await actualizarMatricula(matriculaActual, cambios);
    Object.assign(matriculaActual, cambios);
    mostrarResultados(matriculaActual);
    establecerEdicion(false);
    prepararDocumentos(matriculaActual);
    mostrarMensaje("✅ Cambios guardados correctamente.", "success");
  } catch (error) {
    establecerEdicion(true);
    mostrarMensaje(`No se pudieron guardar los cambios: ${error.message}`, "error");
  } finally {
    guardandoCambios = false;
    controles.forEach((control) => (control.disabled = false));
  }
};

/* Llena el <select> de tipos de indicaciones una sola vez */
Object.keys(INDICACIONES).forEach((clave) => {
  const opt = document.createElement("option");
  opt.value = clave;
  opt.textContent = INDICACIONES[clave].etiqueta;
  tipoIndicacionesSelect.appendChild(opt);
});

function detectarTipoIndicaciones(grado, tipoIngreso) {
  const g = (grado || "").toLowerCase();
  const t = (tipoIngreso || "").toLowerCase();
  const esAntiguo = t.includes("antiguo");

  if (g.includes("tercer")) return "tercer_antiguo";
  if (g.includes("segundo")) return esAntiguo ? "segundo_antiguo" : "segundo_nuevo";
  return "primer_nuevo";
}

/* =========================================================
   BÚSQUEDA POR NIE
========================================================= */
window.buscarMatricula = async function () {
  if (!accesoDocente || guardandoCambios) return;
  const valor = buscarInput.value.trim();

  if (!valor) {
    mostrarMensaje("⚠️ Escriba un NIE.", "warning");
    ocultarResultados();
    return;
  }

  if (!nieBusquedaValido(valor)) {
    mostrarMensaje("⚠️ El NIE solo debe contener números (máximo 12 dígitos).", "warning");
    ocultarResultados();
    return;
  }

  try {
    mostrarMensaje("⏳ Buscando...", "loading");
    ocultarResultados();

    const encontrado = await buscarMatriculaPorNie(valor);

    if (!encontrado) {
      mostrarMensaje("❌ No se encontró ningún estudiante con ese NIE.", "error");
      ocultarResultados();
      return;
    }

    matriculaActual = encontrado;
    mostrarMensaje("✅ Estudiante encontrado.", "success");
    mostrarResultados(encontrado);
    prepararDocumentos(encontrado);
  } catch (error) {
    console.error("❌ Error:", error);
    mostrarMensaje("❌ Error: " + error.message, "error");
    ocultarResultados();
  }
};

/* =========================================================
   MOSTRAR RESULTADOS (VISTA EN PANTALLA)
========================================================= */
function mostrarResultados(data) {
  if (resultadosSection) {
    resultadosSection.style.display = "block";
    resultadosSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Al cambiar de estudiante, ocultar el bloque de documentos hasta que lo pidan
  seccionDocumentos.style.display = "none";
  document.getElementById("btnToggleDocumentos").textContent = "📄 Documentos";

  const alertas = document.getElementById("alertasAcademicas");
  if (alertas) {
    const alerta = obtenerAlertaAcademica(data);
    alertas.innerHTML = alerta.html === "—" ? "" : alerta.html;
    alertas.hidden = alerta.html === "—";
  }

  CAMPOS_FICHA.forEach((clave) => {
    const elemento = document.getElementById("r_" + clave);
    if (elemento) elemento.value = data[clave] || "";
  });

  const fotoContenedor = document.getElementById("r_fotoContenedor");
  const fotoImg = document.getElementById("r_fotoEstudiante");
  if (fotoContenedor && fotoImg) {
    if (data.fotoURL) {
      fotoImg.src = data.fotoURL;
      fotoContenedor.style.display = "block";
    } else {
      fotoImg.removeAttribute("src");
      fotoContenedor.style.display = "none";
    }
  }
}

/* =========================================================
   DOCUMENTOS: PREPARAR / RENDERIZAR CHECKLIST
========================================================= */
function prepararDocumentos(data) {
  const tipoDetectado = detectarTipoIndicaciones(data.grado, data.tipoIngreso);
  tipoIndicacionesSelect.value = tipoDetectado;

  const guardado = data.documentosChecklist || null;

  renderChecklist(tipoDetectado, guardado);
  observacionesDocumentos.value = guardado?.observaciones || "";
  mensajeDocumentos.textContent = guardado
    ? "ℹ️ Ya existe un registro guardado para este estudiante. Puede editarlo y volver a guardar."
    : "";
}

function renderChecklist(tipo, guardado) {
  const config = INDICACIONES[tipo];

  listaPrincipal.innerHTML = "";
  config.items.forEach((texto, i) => {
    const previo = guardado && guardado.tipo === tipo ? guardado.principal?.[i] : null;
    listaPrincipal.appendChild(crearItemChecklist("principal", i, texto, previo));
  });

  listaGeneral.innerHTML = "";
  INDICACIONES_GENERALES.forEach((texto, i) => {
    const previo = guardado ? guardado.general?.[i] : null;
    listaGeneral.appendChild(crearItemChecklist("general", i, texto, previo));
  });
}

function crearItemChecklist(grupo, indice, texto, previo) {
  const wrapper = document.createElement("div");
  wrapper.className = "checklist-item";
  wrapper.dataset.grupo = grupo;
  wrapper.dataset.indice = indice;

  const marcado = previo?.marcado || false;
  const nota = previo?.nota || "";
  if (marcado) wrapper.classList.add("marcado");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = marcado;
  checkbox.addEventListener("change", () => {
    wrapper.classList.toggle("marcado", checkbox.checked);
  });

  const contenido = document.createElement("div");

  const label = document.createElement("div");
  label.className = "texto-indicacion";
  label.textContent = texto;

  const inputNota = document.createElement("input");
  inputNota.type = "text";
  inputNota.placeholder = "¿Cómo lo trajo? Ej: original y copia, solo copia, pendiente...";
  inputNota.value = nota;

  contenido.appendChild(label);
  contenido.appendChild(inputNota);
  wrapper.appendChild(checkbox);
  wrapper.appendChild(contenido);

  return wrapper;
}

window.cambiarTipoIndicaciones = function () {
  const tipo = tipoIndicacionesSelect.value;
  const guardado = matriculaActual?.documentosChecklist || null;
  renderChecklist(tipo, guardado);
};

window.toggleDocumentos = function () {
  if (!matriculaActual) {
    alert("⚠️ Primero busque un estudiante.");
    return;
  }
  const visible = seccionDocumentos.style.display === "block";
  seccionDocumentos.style.display = visible ? "none" : "block";
  document.getElementById("btnToggleDocumentos").textContent = visible
    ? "📄 Documentos"
    : "📄 Ocultar documentos";

  if (!visible) {
    seccionDocumentos.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

window.guardarDocumentos = async function () {
  if (!matriculaActual) {
    alert("⚠️ Primero busque un estudiante.");
    return;
  }

  const tipo = tipoIndicacionesSelect.value;

  const leerGrupo = (grupo) =>
    Array.from(document.querySelectorAll(`#lista${grupo === "principal" ? "Principal" : "General"} .checklist-item`))
      .map((item) => ({
        marcado: item.querySelector('input[type="checkbox"]').checked,
        nota: item.querySelector('input[type="text"]').value.trim(),
      }));

  const registro = {
    tipo,
    principal: leerGrupo("principal"),
    general: leerGrupo("general"),
    observaciones: observacionesDocumentos.value.trim(),
    actualizado: new Date().toISOString(),
    revisadoPorNombre: sessionStorage.getItem("nombreUsuario") || "Docente",
    revisadoPorCorreo: sessionStorage.getItem("correoUsuario") || "",
  };

  try {
    mensajeDocumentos.textContent = "⏳ Guardando...";
    mensajeDocumentos.style.color = "#1976d2";

    await guardarDocumentosSupabase(matriculaActual, registro);

    matriculaActual.documentosChecklist = registro;

    mensajeDocumentos.textContent = "✅ Registro de documentos guardado. El administrador podrá verlo.";
    mensajeDocumentos.style.color = "#2e7d32";
  } catch (error) {
    console.error("❌ Error al guardar documentos:", error);
    mensajeDocumentos.textContent = "❌ Error al guardar: " + error.message;
    mensajeDocumentos.style.color = "#d32f2f";
  }
};

/* =========================================================
   MENSAJES
========================================================= */
function mostrarMensaje(texto, tipo = "info") {
  if (!mensajeBusqueda) return;

  mensajeBusqueda.textContent = texto;

  const estilos = {
    error: { color: "#d32f2f", bg: "#ffebee", border: "#d32f2f" },
    warning: { color: "#f57c00", bg: "#fff3e0", border: "#f57c00" },
    loading: { color: "#1976d2", bg: "#e3f2fd", border: "#1976d2" },
    success: { color: "#2e7d32", bg: "#e8f5e9", border: "#2e7d32" },
    info: { color: "#1a3a2b", bg: "#e8f0fe", border: "#1a3a2b" },
  };

  const estilo = estilos[tipo] || estilos.info;
  mensajeBusqueda.style.color = estilo.color;
  mensajeBusqueda.style.backgroundColor = estilo.bg;
  mensajeBusqueda.style.padding = "10px";
  mensajeBusqueda.style.borderRadius = "8px";
  mensajeBusqueda.style.border = `2px solid ${estilo.border}`;
}

function ocultarResultados() {
  establecerEdicion(false);
  if (resultadosSection) resultadosSection.style.display = "none";
  matriculaActual = null;
}

/* Alertas de repitiente / sobreedad (mismas reglas que el administrador) */
function obtenerAlertaAcademica(matricula) {
  const grado = matricula.grado || "";
  const ultimoAnio = matricula.ultimoAnioAprobado || "";
  const edad = Number.parseInt(matricula.edad, 10);
  const maximaPorGrado = { "Primer Año": 18, "Segundo Año": 20, "Tercer Año": 20 };
  const esSobreedad = Number.isFinite(edad) && (
    (grado === "Primer Año" && edad >= maximaPorGrado[grado]) ||
    (grado !== "Primer Año" && edad > maximaPorGrado[grado])
  );

  const esRepitiente = !!grado && ultimoAnio === grado;
  const alertas = [];
  if (esRepitiente) alertas.push('<span class="badge-alerta badge-repitiente">Repitiendo año</span>');
  if (esSobreedad) alertas.push('<span class="badge-alerta badge-sobreedad">Sobreedad</span>');
  return {
    claseFila: esSobreedad ? "fila-sobreedad" : (esRepitiente ? "fila-repitiente" : ""),
    html: alertas.length ? alertas.join(" ") : "—",
    esRepitiente,
    esSobreedad,
  };
}

/* =========================================================
   BUSCAR CON ENTER
========================================================= */
if (buscarInput) {
  restringirBuscadorNie(buscarInput, 12);
  buscarInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      window.buscarMatricula();
    }
  });

  buscarInput.addEventListener("focus", function () {
    if (!matriculaActual) {
      mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");
    }
  });
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
console.log("✅ Panel docente INCO cargado correctamente");
mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");