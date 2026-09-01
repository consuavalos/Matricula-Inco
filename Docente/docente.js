import { protegerRuta } from "../auth-guard.js";
const accesoDocente = await protegerRuta("docente");

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================
   INDICACIONES / DOCUMENTOS REQUERIDOS POR AÑO
   -----------------------------------------------------------
   Transcritas de los volantes físicos del instituto.
   NOTA IMPORTANTE (léase antes de modificar):
   - El punto 1 de "tercer_antiguo" no se alcanzaba a leer
     completo en la foto (estaba cortado). Se completó siguiendo
     el mismo patrón de "segundo_antiguo" (certificado de los
     años previos). Verifique este punto contra el volante físico.
   - No existe en los datos actuales un campo "jornada" para
     distinguir Bachillerato General de "Modalidades Flexibles",
     así que para 2° año "nuevo ingreso" se usó la lista de
     Modalidades Flexibles (es la única lista disponible para
     ese caso). El docente puede corregir el tipo manualmente
     con el selector si no aplica.
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

// Indicaciones de presentación que aplican a todos los años (volante de recepción de documentos)
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

/* Llena el <select> de tipos de indicaciones una sola vez */
Object.keys(INDICACIONES).forEach((clave) => {
  const opt = document.createElement("option");
  opt.value = clave;
  opt.textContent = INDICACIONES[clave].etiqueta;
  tipoIndicacionesSelect.appendChild(opt);
});

/* =========================================================
   DETECTAR TIPO DE INDICACIONES SEGÚN GRADO / TIPO DE INGRESO
========================================================= */
function detectarTipoIndicaciones(grado, tipoIngreso) {
  const g = (grado || "").toLowerCase();
  const t = (tipoIngreso || "").toLowerCase();
  const esAntiguo = t.includes("antiguo");

  if (g.includes("tercer")) return "tercer_antiguo";
  if (g.includes("segundo")) return esAntiguo ? "segundo_antiguo" : "segundo_nuevo";
  return "primer_nuevo";
}

/* =========================================================
   FUNCIÓN PRINCIPAL DE BÚSQUEDA
========================================================= */
window.buscarMatricula = async function () {
  const valor = buscarInput.value.trim();

  if (!valor) {
    mostrarMensaje("⚠️ Escriba un NIE.", "warning");
    ocultarResultados();
    return;
  }

  try {
    mostrarMensaje("⏳ Buscando...", "loading");
    ocultarResultados();

    const matriculasRef = collection(db, "matriculas");
    const q1 = query(matriculasRef, where("nie", "==", valor));
    const snapshot1 = await getDocs(q1);

    let encontrado = null;
    snapshot1.forEach((docSnap) => {
      if (!encontrado) {
        encontrado = { id: docSnap.id, ...docSnap.data() };
      }
    });

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
   MOSTRAR RESULTADOS (FICHA DEL ESTUDIANTE)
========================================================= */
function mostrarResultados(data) {
  if (resultadosSection) {
    resultadosSection.style.display = "block";
    resultadosSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Al cambiar de estudiante, ocultar el bloque de documentos hasta que lo pidan
  seccionDocumentos.style.display = "none";
  document.getElementById("btnToggleDocumentos").textContent = "📄 Documentos";

  const campos = {
    r_numeroFicha: data.numeroFicha || "",
    r_fechaMatricula: data.fechaMatricula || "",
    r_nie: data.nie || "",
    r_primerApellido: data.primerApellido || "",
    r_segundoApellido: data.segundoApellido || "",
    r_primerNombre: data.primerNombre || "",
    r_segundoNombre: data.segundoNombre || "",
    r_fechaNacimiento: data.fechaNacimiento || "",
    r_edad: data.edad || "",
    r_sexo: data.sexo || "",
    r_telefonoEstudiante: data.telefonoEstudiante || "",
    r_correoEstudiantil: data.correoEstudiantil || "",
    r_grado: data.grado || "",
    r_tipoIngreso: data.tipoIngreso || "",
    r_especialidad: data.especialidad || "",
    r_colegioAnterior: data.colegioAnterior || "",
    r_responsable: data.responsable || "",
    r_parentesco: data.parentesco || "",
    r_duiResponsable: data.duiResponsable || "",
    r_telefonoResponsable: data.telefonoResponsable || "",
    r_correoResponsable: data.correoResponsable || "",
  };

  Object.keys(campos).forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = campos[id];
  });
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

/* =========================================================
   CAMBIAR TIPO DE INDICACIONES MANUALMENTE
========================================================= */
window.cambiarTipoIndicaciones = function () {
  const tipo = tipoIndicacionesSelect.value;
  const guardado = matriculaActual?.documentosChecklist || null;
  renderChecklist(tipo, guardado);
};

/* =========================================================
   MOSTRAR / OCULTAR BLOQUE DE DOCUMENTOS
========================================================= */
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

/* =========================================================
   GUARDAR CHECKLIST DE DOCUMENTOS EN FIRESTORE
========================================================= */
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
  };

  try {
    mensajeDocumentos.textContent = "⏳ Guardando...";
    mensajeDocumentos.style.color = "#1976d2";

    await updateDoc(doc(db, "matriculas", matriculaActual.id), {
      documentosChecklist: registro,
    });

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
   FUNCIONES DE MENSAJES
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
  if (resultadosSection) resultadosSection.style.display = "none";
  matriculaActual = null;
}

/* =========================================================
   BUSCAR CON ENTER
========================================================= */
if (buscarInput) {
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
