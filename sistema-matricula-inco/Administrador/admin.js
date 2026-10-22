import { mostrarFichaOficial } from "../ficha-oficial.js";
import { protegerRuta, cerrarSesionSupabase } from "../auth-guard.js";
import {
  actualizarMatricula,
  buscarMatriculaPorNie,
  crearDocente,
  eliminarMatricula as eliminarMatriculaSupabase,
  listarDocentes,
  listarMatriculas,
  obtenerPerfil,
} from "../supabase-data.js";
import { descargarTablaExcel } from "../excel-export.js";
import {
  activarEdicion,
  desactivarEdicion,
  etiquetaCampo,
  marcarErrorCampo,
  nieBusquedaValido,
  restringirBuscadorNie,
  validarMatricula,
} from "../validacion-matricula.js";

let ultimosResultadosReportes = [];
const accesoAdministrador = await protegerRuta("administrador");

if (accesoAdministrador) {
  const identificador = document.getElementById("identificadorAdministrador");
  const nombre = sessionStorage.getItem("nombreUsuario") || "Administrador";
  if (identificador) identificador.textContent = `Administrador responsable: ${nombre}`;
}

/* =========================================================
   INDICACIONES / DOCUMENTOS REQUERIDOS POR AÑO
   MISMO contenido que Docente/docente.js (el docente guarda el
   checklist por índice; aquí se traduce cada índice a su texto).
   Si se edita el listado en docente.js, editarlo igual aquí.
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
      "Certificado o boletas con firma y sello de notas de 9°, 1° y 2° año de bachillerato (Original y copia)",
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

// Indicaciones de presentación que aplican a todos los años
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

let matriculaActual = null;
let modoEdicion = false;
let guardando = false;

/* Deja todos los campos de la ficha en solo lectura y quita las restricciones de edición */
function bloquearCampos() {
  document.querySelectorAll("#resultadosBusqueda input.campo-lectura").forEach((el) => {
    el.readOnly = true;
    el.setAttribute("readonly", "");
    el.setAttribute("aria-readonly", "true");
    el.classList.remove("campo-editable");
  });
  desactivarEdicion(resultadosSection);
  modoEdicion = false;
  const botonModificar = document.querySelector(".btn-Modificar");
  if (botonModificar) botonModificar.textContent = "✏️ Modificar";
}

/* =========================================================
   FUNCIÓN PRINCIPAL DE BÚSQUEDA (SOLO POR NIE: números, máx. 12)
========================================================= */
window.buscarMatricula = async function () {
  if (guardando) return;
  const valor = buscarInput.value.trim();

  if (!valor) {
    mostrarMensaje("⚠️ Escriba el NIE del estudiante.", "warning");
    ocultarResultados();
    return;
  }

  if (!nieBusquedaValido(valor)) {
    mostrarMensaje("⚠️ El NIE solo debe contener números (máximo 12 dígitos).", "warning");
    ocultarResultados();
    return;
  }

  try {
    // Cada búsqueda inicia con la ficha bloqueada para no arrastrar un
    // modo de edición anterior a otro estudiante.
    bloquearCampos();
    mostrarMensaje("⏳ Buscando...", "loading");
    ocultarResultados();

    const encontrado = await buscarMatriculaPorNie(valor);

    if (!encontrado) {
      mostrarMensaje("❌ No se encontró ninguna matrícula con ese NIE.", "error");
      ocultarResultados();
      return;
    }

    matriculaActual = encontrado;
    mostrarMensaje("✅ Matrícula encontrada.", "success");
    mostrarResultados(encontrado);
    await generarFichaImprimir(encontrado, matriculaActual);

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

  const alertasAcademicas = document.getElementById("alertasAcademicas");
  if (alertasAcademicas) {
    const alerta = obtenerAlertaAcademica(data);
    alertasAcademicas.innerHTML = alerta.html === "—" ? "" : alerta.html;
    alertasAcademicas.hidden = alerta.html === "—";
  }

  const campos = {
    "r_numeroFicha": data.numeroFicha || "",
    "r_fechaMatricula": data.fechaMatricula || "",
    "r_nie": data.nie || "",
    "r_primerApellido": data.primerApellido || "",
    "r_segundoApellido": data.segundoApellido || "",
    "r_primerNombre": data.primerNombre || "",
    "r_segundoNombre": data.segundoNombre || "",
    "r_fechaNacimiento": data.fechaNacimiento || "",
    "r_edad": data.edad || "",
    "r_sexo": data.sexo || "",
    "r_telefonoEstudiante": data.telefonoEstudiante || "",
    "r_correoEstudiantil": data.correoEstudiantil || "",
    "r_correoPersonal": data.correoPersonal || "",

    "r_grado": data.grado || "",
    "r_especialidad": data.especialidad || "",
    "r_ultimoAnioAprobado": data.ultimoAnioAprobado || "",
    "r_colegioAnterior": data.colegioAnterior || "",
    "r_hermanosCentroeducativo": data.hermanosCentroeducativo || "",
    "r_nombresHermanos": data.nombresHermanos || "",
    "r_nivelAcademico": data.nivelAcademico || "",

    "r_computadoraMineducyt": data.computadoraMineducyt || "",
    "r_internet": data.internet || "",
    "r_tallaCamisa": data.tallaCamisa || "",
    "r_tallaPantalon": data.tallaPantalon || "",
    "r_tallaBlusa": data.tallaBlusa || "",
    "r_tallaFalda": data.tallaFalda || "",
    "r_tallaZapatos": data.tallaZapatos || "",

    "r_enfermedad": data.enfermedad || "",
    "r_cualEnfermedad": data.cualEnfermedad || "",
    "r_medicamento": data.medicamento || "",
    "r_otros": data.otros || "",

    "r_responsable": data.responsable || "",
    "r_parentesco": data.parentesco || "",
    "r_duiResponsable": data.duiResponsable || "",
    "r_telefonoResponsable": data.telefonoResponsable || "",
    "r_whatsappResponsable": data.whatsappResponsable || "",
    "r_correoResponsable": data.correoResponsable || "",

    "r_madreNombre": data.madreNombre || "",
    "r_madreOcupacion": data.madreOcupacion || "",
    "r_madreLugarTrabajo": data.madreLugarTrabajo || "",
    "r_madreDui": data.madreDui || "",
    "r_madreLugarNacimiento": data.madreLugarNacimiento || "",
    "r_madreFechaNacimiento": data.madreFechaNacimiento || "",
    "r_madreCelular": data.madreCelular || "",

    "r_padreNombre": data.padreNombre || "",
    "r_padreOcupacion": data.padreOcupacion || "",
    "r_padreLugarTrabajo": data.padreLugarTrabajo || "",
    "r_padreDui": data.padreDui || "",
    "r_padreLugarNacimiento": data.padreLugarNacimiento || "",
    "r_padreFechaNacimiento": data.padreFechaNacimiento || "",
    "r_padreCelular": data.padreCelular || ""
  };

  Object.keys(campos).forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.value = campos[id];
    }
  });

  // Vista previa de la foto del estudiante (si el registro tiene una URL guardada)
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

  console.log("📊 Datos mostrados:", data);
}

/* =========================================================
   GENERAR FICHA IMPRIMIBLE / PDF
   Arma el contenido de #contenidoImprimir con el formato oficial
   de la "Ficha de Matrícula Oficial del alumno/a" (una página oficio).
   - No se imprime la Partida de Nacimiento.
   - Los campos de opción única muestran solo el valor marcado.
   - Dosis, "en qué año", SELLO y firmas quedan en blanco.
========================================================= */
async function generarFichaImprimir(data, expediente) {
  const registro = expediente?.documentosChecklist;
  let nombreDocente = registro?.revisadoPorNombre || "";
  if (registro?.actualizadoPor) {
    try {
      const perfil = await obtenerPerfil(registro.actualizadoPor);
      nombreDocente = perfil?.nombre || nombreDocente;
    } catch (error) {
      console.error("No se pudo consultar al docente de la ficha:", error);
    }
  }
  if (matriculaActual !== data) return false;
  const contenedor = document.getElementById("contenidoImprimir");
  mostrarFichaOficial(contenedor, { ...data, vacunaCovid: "" });
  const nombresFirmas = [
    nombreDocente,
    data.responsable || "",
    [data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido]
      .filter(parte => parte && String(parte).trim())
      .map(parte => String(parte).trim())
      .join(" "),
  ];
  contenedor?.querySelectorAll(".fo-firma .fo-linea-firma").forEach((linea, indice) => {
    if (!nombresFirmas[indice]) return;
    const nombre = document.createElement("p");
    nombre.textContent = nombresFirmas[indice];
    linea.before(nombre);
  });
  return true;
}

/* =========================================================
   MODAL: VER DOCUMENTOS REGISTRADOS POR EL DOCENTE
   Lee matriculaActual.documentosChecklist (guardado por el docente).
========================================================= */
function crearDocItem(texto, entrada) {
  const marcado = !!entrada?.marcado;
  const nota = entrada?.nota || "";
  const div = document.createElement("div");
  div.className = "doc-item";
  div.innerHTML = `
    <span>
      ${texto}
      ${nota ? `<br><small style="color:#666;">📝 ${nota}</small>` : ""}
    </span>
    <span class="doc-estado ${marcado ? "entregado" : "pendiente"}">
      ${marcado ? "✅ Entregado" : "❌ No entregado"}
    </span>
  `;
  return div;
}

function formatearFechaHora(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-SV", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

window.verExpediente = async function () {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  const modal = document.getElementById("modalExpediente");
  const nombreLabel = document.getElementById("modalExpedienteEstudiante");
  const vacio = document.getElementById("expedienteVacio");
  const contenido = document.getElementById("expedienteContenido");

  if (nombreLabel) {
    const nombreCompleto = `${matriculaActual.primerNombre || ""} ${matriculaActual.segundoNombre || ""} ${matriculaActual.primerApellido || ""} ${matriculaActual.segundoApellido || ""}`.trim();
    nombreLabel.textContent = `Estudiante: ${nombreCompleto || "-"}  •  NIE: ${matriculaActual.nie || "-"}`;
  }

  const registro = matriculaActual.documentosChecklist || null;

  if (!registro) {
    if (vacio) vacio.style.display = "block";
    if (contenido) contenido.style.display = "none";
  } else {
    if (vacio) vacio.style.display = "none";
    if (contenido) contenido.style.display = "block";

    const config = INDICACIONES[registro.tipo];

    const tipoEtiquetaEl = document.getElementById("exp_tipoEtiqueta");
    if (tipoEtiquetaEl) {
      tipoEtiquetaEl.textContent = config ? config.etiqueta : (registro.tipo || "-");
    }

    const fechaEl = document.getElementById("exp_fechaActualizacion");
    if (fechaEl) fechaEl.textContent = formatearFechaHora(registro.actualizado);

    const docenteEl = document.getElementById("exp_docenteResponsable");
    if (docenteEl) {
      docenteEl.textContent = "Cargando...";
      try {
        const perfil = await obtenerPerfil(registro.actualizadoPor);
        docenteEl.textContent = perfil
          ? `${perfil.nombre || "Docente"}${perfil.correo ? ` (${perfil.correo})` : ""}`
          : (registro.revisadoPorNombre
            ? `${registro.revisadoPorNombre}${registro.revisadoPorCorreo ? ` (${registro.revisadoPorCorreo})` : ""}`
            : "No identificado");
      } catch (error) {
        console.error("Error al consultar al docente responsable:", error);
        docenteEl.textContent = "No disponible";
      }
    }

    const listaPrincipalEl = document.getElementById("exp_listaPrincipal");
    if (listaPrincipalEl) {
      listaPrincipalEl.innerHTML = "";
      if (config) {
        config.items.forEach((texto, i) => {
          listaPrincipalEl.appendChild(crearDocItem(texto, registro.principal?.[i]));
        });
      }
    }

    const listaGeneralEl = document.getElementById("exp_listaGeneral");
    if (listaGeneralEl) {
      listaGeneralEl.innerHTML = "";
      INDICACIONES_GENERALES.forEach((texto, i) => {
        listaGeneralEl.appendChild(crearDocItem(texto, registro.general?.[i]));
      });
    }

    const obsEl = document.getElementById("exp_observaciones");
    if (obsEl) obsEl.value = registro.observaciones || "";
  }

  if (modal) {
    modal.classList.add("activo");
  }
};

window.cerrarExpediente = function () {
  const modal = document.getElementById("modalExpediente");
  if (modal) {
    modal.classList.remove("activo");
  }
};

// Cerrar el modal con la tecla Escape
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    window.cerrarExpediente();
  }
});

/* =========================================================
   CERRAR SESIÓN
========================================================= */
window.cerrarSesion = async function () {
  await cerrarSesionSupabase();
};

/* =========================================================
   FUNCIONES DE MENSAJES
========================================================= */
function mostrarMensaje(texto, tipo = "info") {
  if (!mensajeBusqueda) return;

  mensajeBusqueda.textContent = texto;
  mensajeBusqueda.className = "mensaje-admin";

  const estilos = {
    error: { color: "#d32f2f", bg: "#ffebee", border: "#d32f2f" },
    warning: { color: "#f57c00", bg: "#fff3e0", border: "#f57c00" },
    loading: { color: "#1976d2", bg: "#e3f2fd", border: "#1976d2" },
    success: { color: "#2e7d32", bg: "#e8f5e9", border: "#2e7d32" },
    info: { color: "#1a3a2b", bg: "#e8f0fe", border: "#1a3a2b" }
  };

  const estilo = estilos[tipo] || estilos.info;
  mensajeBusqueda.style.color = estilo.color;
  mensajeBusqueda.style.backgroundColor = estilo.bg;
  mensajeBusqueda.style.padding = "10px";
  mensajeBusqueda.style.borderRadius = "8px";
  mensajeBusqueda.style.border = `2px solid ${estilo.border}`;
}

function ocultarResultados() {
  if (resultadosSection) {
    resultadosSection.style.display = "none";
  }
}

/* =========================================================
   LIMPIAR BÚSQUEDA
========================================================= */
window.limpiarBusqueda = function() {
  if (buscarInput) buscarInput.value = "";
  bloquearCampos();
  ocultarResultados();
  matriculaActual = null;
  mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");
};

/* =========================================================
   IMPRIMIR DOCUMENTO
========================================================= */
window.imprimirDocumento = async function() {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  if (await generarFichaImprimir(matriculaActual, matriculaActual)) window.print();
};

/* =========================================================
   DESCARGAR PDF (requiere html2pdf)
========================================================= */
window.descargarPDF = async function() {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  if (typeof html2pdf === 'undefined') {
    alert("⚠️ La librería para PDF no está cargada. Por favor, recarga la página.");
    return;
  }

  if (!await generarFichaImprimir(matriculaActual, matriculaActual)) return;
  const elemento = document.getElementById("contenidoImprimir");
  const nombre = `${matriculaActual.primerNombre || 'Estudiante'}_${matriculaActual.primerApellido || 'Apellido'}`;

  mostrarMensaje("⏳ Generando PDF...", "loading");

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `Ficha_Matricula_${nombre}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: {
      unit: 'mm',
      format: [216, 330], // Tamaño oficio
      orientation: 'portrait'
    },
    pagebreak: { mode: ['avoid-all'] }
  };

  html2pdf().set(opt).from(elemento).save().then(() => {
    mostrarMensaje("✅ PDF descargado exitosamente.", "success");
  }).catch((error) => {
    console.error("Error:", error);
    mostrarMensaje("❌ Error al generar PDF: " + error.message, "error");
  });
};

/* =========================================================
   MODIFICAR CAMPOS (editar y guardar)
   Aplica las mismas reglas del formulario de Nuevo Ingreso
   (validacion-matricula.js). El administrador puede corregir
   también el número de ficha y la fecha de matrícula; la edad
   se recalcula sola a partir de la fecha de nacimiento.
========================================================= */
const CAMPOS_EDITABLES = [
  "r_numeroFicha", "r_fechaMatricula", "r_nie",
  "r_primerApellido", "r_segundoApellido", "r_primerNombre", "r_segundoNombre",
  "r_fechaNacimiento", "r_edad", "r_sexo", "r_telefonoEstudiante", "r_correoEstudiantil", "r_correoPersonal",

  "r_grado", "r_especialidad", "r_ultimoAnioAprobado", "r_colegioAnterior",
  "r_hermanosCentroeducativo", "r_nombresHermanos", "r_nivelAcademico",

  "r_computadoraMineducyt", "r_internet",
  "r_tallaCamisa", "r_tallaPantalon", "r_tallaBlusa", "r_tallaFalda", "r_tallaZapatos",

  "r_enfermedad", "r_cualEnfermedad", "r_medicamento", "r_otros",

  "r_responsable", "r_parentesco", "r_duiResponsable", "r_telefonoResponsable",
  "r_whatsappResponsable", "r_correoResponsable",

  "r_madreNombre", "r_madreOcupacion", "r_madreLugarTrabajo", "r_madreDui",
  "r_madreLugarNacimiento", "r_madreFechaNacimiento", "r_madreCelular",

  "r_padreNombre", "r_padreOcupacion", "r_padreLugarTrabajo", "r_padreDui",
  "r_padreLugarNacimiento", "r_padreFechaNacimiento", "r_padreCelular"
];

window.modificarcampos = async function () {
  if (guardando) return;
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  const btnModificar = document.querySelector(".btn-Modificar");

  // --- Si NO está en modo edición: activar edición ---
  if (!modoEdicion) {
    document.querySelectorAll("#resultadosBusqueda input.campo-lectura").forEach((el) => {
      el.readOnly = false;
      el.removeAttribute("readonly");
      el.disabled = false;
      el.setAttribute("aria-readonly", "false");
      el.classList.add("campo-editable");
    });
    // Restricciones del formulario; la edad queda automática
    activarEdicion(resultadosSection, { bloqueados: ["edad"] });

    modoEdicion = true;
    if (btnModificar) btnModificar.textContent = "💾 Guardar cambios";
    mostrarMensaje("✏️ Modo edición activado. Corrija los campos y presione «Guardar cambios».", "info");
    return;
  }

  // --- Si YA está en modo edición: validar y guardar cambios ---
  const cambios = {};
  CAMPOS_EDITABLES.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const clave = id.replace("r_", "");
    const valor = el.value.trim();
    if (valor !== String(matriculaActual[clave] ?? "")) cambios[clave] = valor;
  });

  if (!Object.keys(cambios).length) {
    bloquearCampos();
    mostrarMensaje("No hay cambios para guardar.", "info");
    return;
  }

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
    mostrarMensaje(`⚠️ Corrija los campos marcados en rojo: ${lista}.`, "warning");
    return;
  }

  guardando = true;
  try {
    mostrarMensaje("⏳ Guardando cambios...", "loading");

    await actualizarMatricula(matriculaActual, cambios);

    // Actualizar copia local con los nuevos valores
    matriculaActual = { ...matriculaActual, ...cambios };

    bloquearCampos();

    // Refrescar alertas y la ficha imprimible/PDF con los datos ya actualizados
    mostrarResultados(matriculaActual);
    await generarFichaImprimir(matriculaActual, matriculaActual);

    mostrarMensaje("✅ Cambios guardados correctamente.", "success");

  } catch (error) {
    console.error("❌ Error al guardar cambios:", error);
    mostrarMensaje("❌ Error al guardar: " + error.message, "error");
  } finally {
    guardando = false;
  }
};

/* =========================================================
   ELIMINAR MATRÍCULA
========================================================= */
window.eliminarMatricula = async function() {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  const nombre = `${matriculaActual.primerNombre || ''} ${matriculaActual.primerApellido || ''}`;
  if (!confirm(`⚠️ ¿Eliminar esta matrícula?\n\nEstudiante: ${nombre}\nNIE: ${matriculaActual.nie || ''}\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await eliminarMatriculaSupabase(matriculaActual);
    alert("✅ Matrícula eliminada correctamente.");
    limpiarBusqueda();
  } catch (error) {
    console.error("❌ Error:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
};

/* =========================================================
   BUSCAR CON ENTER + RESTRICCIÓN DEL NIE (solo números, máx. 12)
========================================================= */
restringirBuscadorNie(document.getElementById("filtroNie"), 12);

if (buscarInput) {
  restringirBuscadorNie(buscarInput, 12);

  buscarInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      window.buscarMatricula();
    }
  });

  buscarInput.addEventListener("focus", function() {
    if (!matriculaActual) {
      mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");
    }
  });
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
console.log("✅ Administrador INCO cargado correctamente");
mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");

// ===============================
// CAMBIAR ENTRE MENÚS
// ===============================

window.mostrarMatriculas = function () {
  document.getElementById("seccionMatricula").style.display = "block";
  document.getElementById("seccionReportes").style.display = "none";
  document.getElementById("seccionDocentes").style.display = "none";
}

window.mostrarReportes = function () {
  document.getElementById("seccionMatricula").style.display = "none";
  document.getElementById("resultadosBusqueda").style.display = "none";
  document.getElementById("seccionReportes").style.display = "block";
  document.getElementById("seccionDocentes").style.display = "none";
}

window.mostrarDocentes = async function () {
  document.getElementById("seccionMatricula").style.display = "none";
  document.getElementById("seccionReportes").style.display = "none";
  document.getElementById("resultadosBusqueda").style.display = "none";
  document.getElementById("seccionDocentes").style.display = "block";

  const mensaje = document.getElementById("mensajeDocentes");
  const contenedor = document.getElementById("tablaDocentesContenedor");
  const cuerpo = document.getElementById("cuerpoTablaDocentes");
  mensaje.textContent = "Cargando docentes...";
  contenedor.style.display = "none";
  cuerpo.innerHTML = "";

  try {
    const docentes = await listarDocentes();
    if (!docentes.length) {
      mensaje.textContent = "No hay docentes registrados.";
      return;
    }

    docentes.forEach((docente) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${docente.nombre || "-"}</td>
        <td>${docente.correo || "-"}</td>
        <td><span class="badge-grado">Docente</span></td>
        <td>${formatearFechaHora(docente.creado_en)}</td>
      `;
      cuerpo.appendChild(fila);
    });

    mensaje.textContent = `${docentes.length} docente(s) registrado(s).`;
    contenedor.style.display = "block";
  } catch (error) {
    console.error("Error al listar docentes:", error);
    mensaje.textContent = "No se pudieron cargar los docentes: " + error.message;
  }
}

window.abrirNuevoUsuario = function () {
  const modal = document.getElementById("modalNuevoUsuario");
  const form = document.getElementById("formNuevoUsuario");
  const mensaje = document.getElementById("mensajeNuevoUsuario");
  form?.reset();
  if (mensaje) mensaje.textContent = "";
  modal?.classList.add("activo");
  document.getElementById("nuevoUsuarioNombre")?.focus();
}

window.cerrarNuevoUsuario = function () {
  document.getElementById("modalNuevoUsuario")?.classList.remove("activo");
}

const formNuevoUsuario = document.getElementById("formNuevoUsuario");
formNuevoUsuario?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!formNuevoUsuario.checkValidity()) {
    formNuevoUsuario.reportValidity();
    return;
  }

  const boton = document.getElementById("btnCrearDocente");
  const mensaje = document.getElementById("mensajeNuevoUsuario");
  const datos = new FormData(formNuevoUsuario);
  boton.disabled = true;
  mensaje.textContent = "Creando cuenta docente...";

  try {
    await crearDocente({
      nombre: String(datos.get("nombre") || "").trim(),
      correo: String(datos.get("correo") || "").trim().toLowerCase(),
      contrasena: String(datos.get("contrasena") || ""),
    });
    mensaje.textContent = "Docente creado correctamente.";
    formNuevoUsuario.reset();
    setTimeout(async () => {
      window.cerrarNuevoUsuario();
      await window.mostrarDocentes();
    }, 900);
  } catch (error) {
    console.error("Error al crear docente:", error);
    mensaje.textContent = "No se pudo crear: " + error.message;
  } finally {
    boton.disabled = false;
  }
});

/* =========================================================
   REPORTES: BUSCAR CON FILTROS
========================================================= */
window.buscarReportes = async function () {
  const mensajeReportes = document.getElementById("mensajeReportes");
  const tablaContenedor = document.getElementById("tablaReportesContenedor");
  const cuerpoTabla = document.getElementById("cuerpoTablaReportes");
  const botonExcel = document.getElementById("btnDescargarReporteExcel");
  const botonImprimir = document.getElementById("btnImprimirReporte");

  const nie = document.getElementById("filtroNie").value.trim();
  const grado = document.getElementById("filtroGrado").value.trim();
  const especialidad = document.getElementById("filtroEspecialidad").value.trim();
  const situacionAcademica = document.getElementById("filtroSituacionAcademica").value;

  mensajeReportes.textContent = "⏳ Buscando...";
  mensajeReportes.style.color = "#1976d2";
  tablaContenedor.style.display = "none";
  cuerpoTabla.innerHTML = "";
  ultimosResultadosReportes = [];
  if (botonExcel) botonExcel.disabled = true;
  if (botonImprimir) botonImprimir.disabled = true;

  try {
    let resultados = await listarMatriculas();

    if (nie) {
      resultados = resultados.filter(r => (r.nie || "").includes(nie));
    }
    if (grado) {
      resultados = resultados.filter(r => r.grado === grado);
    }
    if (especialidad) {
      resultados = resultados.filter(r => r.especialidad === especialidad);
    }
    if (situacionAcademica) {
      resultados = resultados.filter((r) => {
        const alerta = obtenerAlertaAcademica(r);
        return situacionAcademica === "repitiente"
          ? alerta.esRepitiente
          : alerta.esSobreedad;
      });
    }

    if (resultados.length === 0) {
      mensajeReportes.textContent = "❌ No se encontraron matrículas con esos filtros.";
      mensajeReportes.style.color = "#d32f2f";
      return;
    }

    mensajeReportes.textContent = `✅ ${resultados.length} resultado(s) encontrado(s).`;
    mensajeReportes.style.color = "#2e7d32";

    resultados.forEach((r) => {
      const nombreCompleto = `${r.primerNombre || ""} ${r.segundoNombre || ""} ${r.primerApellido || ""} ${r.segundoApellido || ""}`.trim();
      const alerta = obtenerAlertaAcademica(r);
      const fila = document.createElement("tr");
      if (alerta.claseFila) fila.classList.add(alerta.claseFila);
      fila.innerHTML = `
        <td>${r.numeroFicha || "-"}</td>
        <td>${r.nie || "-"}</td>
        <td>${nombreCompleto || "-"}</td>
        <td><span class="badge-grado">${r.grado || "-"}</span></td>
        <td><span class="badge-especialidad">${r.especialidad || "-"}</span></td>
        <td>${alerta.html}</td>
        <td><button class="btn-ver-fila" onclick="verDesdeReporte('${r.nie || ""}')">Ver</button></td>
      `;
      cuerpoTabla.appendChild(fila);
    });

    ultimosResultadosReportes = resultados;
    tablaContenedor.style.display = "block";
    if (botonExcel) botonExcel.disabled = false;
    if (botonImprimir) botonImprimir.disabled = false;

  } catch (error) {
    console.error("❌ Error en reportes:", error);
    mensajeReportes.textContent = "❌ Error al buscar: " + error.message;
    mensajeReportes.style.color = "#d32f2f";
  }
};

/* Descarga exactamente las filas que quedaron visibles tras aplicar los filtros. */
window.descargarReporteExcel = function () {
  if (!ultimosResultadosReportes.length) {
    alert("Primero realice una búsqueda con resultados.");
    return;
  }

  const filas = ultimosResultadosReportes.map((matricula) => {
    const nombre = [
      matricula.primerNombre,
      matricula.segundoNombre,
      matricula.primerApellido,
      matricula.segundoApellido,
    ].filter(Boolean).join(" ");
    const alerta = obtenerAlertaAcademica(matricula);
    const etiquetas = [];
    if (alerta.esRepitiente) etiquetas.push("Repitiendo año");
    if (alerta.esSobreedad) etiquetas.push("Sobreedad");
    return [
      matricula.numeroFicha || "-",
      matricula.nie || "-",
      nombre || "-",
      matricula.grado || "-",
      matricula.especialidad || "-",
      etiquetas.join(", ") || "—",
    ];
  });

  const fecha = new Date().toISOString().slice(0, 10);
  descargarTablaExcel({
    nombreArchivo: `reporte-matriculas-${fecha}`,
    titulo: "Reporte de Matrículas - Instituto Nacional de Comercio",
    encabezados: ["Ficha", "NIE", "Nombre completo", "Grado", "Especialidad", "Alerta"],
    filas,
  });
};

function escaparTextoReporte(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Abre una hoja carta con el mismo diseño del reporte web. */
window.imprimirReporte = function () {
  if (!ultimosResultadosReportes.length) {
    alert("Primero realice una búsqueda con resultados.");
    return;
  }

  const filas = ultimosResultadosReportes.map((matricula) => {
    const nombre = [matricula.primerNombre, matricula.segundoNombre, matricula.primerApellido, matricula.segundoApellido]
      .filter(Boolean)
      .join(" ");
    const alerta = obtenerAlertaAcademica(matricula);
    const distintivos = [
      alerta.esRepitiente ? '<span class="alerta repitiente">Repitiendo año</span>' : "",
      alerta.esSobreedad ? '<span class="alerta sobreedad">Sobreedad</span>' : "",
    ].filter(Boolean).join(" ") || "—";
    const claseFila = alerta.esSobreedad ? "fila-sobreedad" : (alerta.esRepitiente ? "fila-repitiente" : "");
    return `<tr class="${claseFila}">
      <td>${escaparTextoReporte(matricula.numeroFicha || "-")}</td>
      <td>${escaparTextoReporte(matricula.nie || "-")}</td>
      <td>${escaparTextoReporte(nombre || "-")}</td>
      <td><span class="grado">${escaparTextoReporte(matricula.grado || "-")}</span></td>
      <td><span class="especialidad">${escaparTextoReporte(matricula.especialidad || "-")}</span></td>
      <td>${distintivos}</td>
    </tr>`;
  }).join("");

  const ventana = window.open("", "_blank", "width=1100,height=800");
  if (!ventana) {
    alert("El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes e inténtelo nuevamente.");
    return;
  }

  ventana.document.write(`<!DOCTYPE html>
    <html lang="es"><head><meta charset="UTF-8"><title>Reporte de Matrículas</title>
    <style>
      @page { size: letter landscape; margin: .42in; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #173227; background: #fff; }
      .encabezado { text-align: center; margin-bottom: 18px; }
      h1 { margin: 0; color: #075e54; font-size: 22px; }
      p { margin: 5px 0 0; font-size: 13px; color: #476055; }
      table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
      th { padding: 12px 10px; background: linear-gradient(90deg, #075e54, #35a86d); color: #fff; text-align: left; font-size: 11px; text-transform: uppercase; }
      td { padding: 11px 10px; border-bottom: 1px solid #e7eee7; font-size: 11px; }
      tr:last-child td { border-bottom: 0; }
      .fila-repitiente td { background: #fff8cf; }
      .fila-sobreedad td { background: #ffe5c2; }
      .grado, .especialidad, .alerta { display: inline-block; padding: 4px 7px; border-radius: 999px; font-size: 10px; font-weight: bold; }
      .grado { background: #e1f0ff; color: #2770a5; }
      .especialidad { background: #fff0df; color: #d45100; }
      .repitiente { background: #f5d547; color: #4a3900; }
      .sobreedad { background: #f6bd82; color: #683300; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <div class="encabezado"><h1>Reporte de Matrículas</h1><p>Instituto Nacional de Comercio · ${ultimosResultadosReportes.length} resultado(s)</p></div>
      <table><thead><tr><th>Ficha</th><th>NIE</th><th>Nombre completo</th><th>Grado</th><th>Especialidad</th><th>Alerta</th></tr></thead><tbody>${filas}</tbody></table>
    </body></html>`);
  ventana.document.close();
  ventana.focus();
  ventana.setTimeout(() => ventana.print(), 300);
};

/* =========================================================
   VER FICHA COMPLETA DESDE UN RESULTADO DE REPORTE (por NIE)
========================================================= */
window.verDesdeReporte = function (nie) {
  if (!nie) {
    alert("⚠️ Este registro no tiene NIE asociado.");
    return;
  }
  window.mostrarMatriculas();
  buscarInput.value = nie;
  window.buscarMatricula();
};

/* =========================================================
   LIMPIAR FILTROS DE REPORTES
========================================================= */
window.limpiarReportes = function () {
  document.getElementById("filtroNie").value = "";
  document.getElementById("filtroGrado").value = "";
  document.getElementById("filtroEspecialidad").value = "";
  document.getElementById("filtroSituacionAcademica").value = "";
  document.getElementById("mensajeReportes").textContent = "";
  document.getElementById("tablaReportesContenedor").style.display = "none";
  document.getElementById("btnDescargarReporteExcel").disabled = true;
  document.getElementById("btnImprimirReporte").disabled = true;
  ultimosResultadosReportes = [];
};

/* Usa las mismas reglas del formulario de nuevo ingreso para avisar al administrador. */
function obtenerAlertaAcademica(matricula) {
  const grado = matricula.grado || "";
  const ultimoAnio = matricula.ultimoAnioAprobado || "";
  const edad = Number.parseInt(matricula.edad, 10);
  const maximaPorGrado = { "Primer Año": 18, "Segundo Año": 20, "Tercer Año": 20 };
  const esSobreedad = Number.isFinite(edad) && (
    (grado === "Primer Año" && edad >= maximaPorGrado[grado]) ||
    (grado !== "Primer Año" && edad > maximaPorGrado[grado])
  );

  const esRepitiente = grado && ultimoAnio === grado;
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