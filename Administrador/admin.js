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
const accesoAdministrador = await protegerRuta("administrador");

/* =========================================================
   INDICACIONES / DOCUMENTOS REQUERIDOS POR AÑO
   -----------------------------------------------------------
   MISMO contenido que Docente/docente.js. Se necesita aquí
   porque el docente guarda el checklist marcado por índice
   (marcado/nota), no el texto de cada punto — así que para
   mostrarlo legible en el modal de Administrador hace falta
   esta misma lista para "traducir" cada índice a su texto.
   Si se edita el listado en docente.js, debe editarse igual
   aquí para que ambos paneles muestren lo mismo.
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

/* =========================================================
   FUNCIÓN PRINCIPAL DE BÚSQUEDA (SOLO POR NIE)
========================================================= */
window.buscarMatricula = async function () {
  const valor = buscarInput.value.trim();

  if (!valor) {
    mostrarMensaje("⚠️ Escriba el NIE del estudiante.", "warning");
    ocultarResultados();
    return;
  }

  try {
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
    generarFichaImprimir(encontrado, matriculaActual);

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

    "r_partidaNumero": data.partidaNumero || "",
    "r_folio": data.folio || "",
    "r_tomo": data.tomo || "",
    "r_libro": data.libro || "",

    "r_computadoraMineducyt": data.computadoraMineducyt || "",
    "r_internet": data.internet || "",
    "r_tallaCamisa": data.tallaCamisa || "",
    "r_tallaPantalon": data.tallaPantalon || "",
    "r_tallaBlusa": data.tallaBlusa || "",
    "r_tallaFalda": data.tallaFalda || "",
    "r_tallaZapatos": data.tallaZapatos || "",

    "r_vacunaCovid": data.vacunaCovid || "",
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
   AYUDANTE: descomponer una fecha (ISO "YYYY-MM-DD" o con
   separador "/" o "-") en día, mes, mes en texto y año.
========================================================= */
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function descomponerFecha(fechaStr) {
  if (!fechaStr) return { dia: "", mes: "", mesNombre: "", anio: "" };

  let partes = null;
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(fechaStr);
  const otroMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(fechaStr);

  if (isoMatch) {
    partes = { anio: isoMatch[1], mes: isoMatch[2], dia: isoMatch[3] };
  } else if (otroMatch) {
    partes = { dia: otroMatch[1], mes: otroMatch[2], anio: otroMatch[3] };
  }

  if (!partes) return { dia: "", mes: "", mesNombre: "", anio: "" };

  const mesIndex = parseInt(partes.mes, 10) - 1;
  const mesNombre = MESES_ES[mesIndex] || "";

  return {
    dia: partes.dia.padStart(2, "0"),
    mes: partes.mes.padStart(2, "0"),
    mesNombre,
    anio: partes.anio
  };
}

/* =========================================================
   GENERAR FICHA IMPRIMIBLE / PDF
   Arma el contenido de #contenidoImprimir replicando el
   formato oficial de "Ficha de Matrícula Oficial del
   alumno/a" del Ministerio de Educación, en una sola página
   tamaño oficio, con los espacios llenados con los datos ya
   registrados en el formulario de Nuevo Ingreso.

   REGLAS DE IMPRESIÓN (actualizado):
   - NO se imprime la sección de Partida de Nacimiento
     (número, folio, tomo, libro): esa información queda
     únicamente en la vista en pantalla / edición del
     administrador, no en el documento impreso ni en el PDF.
   - Cualquier campo de opción única (sexo, tipo de ingreso,
     enfermedad, vacuna, computadora MINEDUCYT, internet,
     zona de residencia, con quién vive, transporte, hermanos
     en el centro, bachillerato) se imprime mostrando SOLO el
     valor real que el estudiante marcó/seleccionó. Ya no se
     listan las opciones no marcadas ni casillas vacías: si el
     dato no existe, la línea completa se omite del impreso.
   - Los campos que ningún formulario del sistema captura
     todavía (dosis del medicamento, "en qué año" del último
     grado aprobado, SELLO y las firmas) se dejan en blanco
     para completarse a mano, igual que en el papel.
========================================================= */
function generarFichaImprimir(data, expediente) {
  const contenedor = document.getElementById("contenidoImprimir");
  if (!contenedor) return;

  const fNac = descomponerFecha(data.fechaNacimiento);
  const fMat = descomponerFecha(data.fechaMatricula);
  const anioCorto = fMat.anio ? fMat.anio.slice(-1) : "";

  contenedor.innerHTML = `
    <div class="ficha-oficial">

      <div class="fo-header">
        <img src="../img/escudo-inc.png" alt="Escudo INC" class="fo-logo">
        <div class="fo-titulo">
          <p class="fo-titulo-min">Ministerio de Educación</p>
          <p class="fo-titulo-min">Gerencia de Gestión Institucional</p>
          <h1>Ficha de Matrícula Oficial del alumno/a</h1>
          <p class="fo-titulo-min">Instituto Nacional de Comercio</p>
        </div>
        <div class="fo-foto">
          ${data.fotoURL
            ? `<img src="${data.fotoURL}" alt="Foto del estudiante" style="width:100%;height:100%;object-fit:cover;">`
            : `Foto de<br>3.5 X 2.5`}
        </div>
      </div>

      <p class="fo-texto-legal">
        Lea el formulario, antes de llenarlo, para evitar tachaduras y enmendaduras que lo invalidan y obligan
        a su reposición. Utilice tinta azul, letra de molde legible e información real. Los datos proporcionados
        son de uso estrictamente académico y de absoluta confidencialidad.
      </p>

      <p class="fo-anio"><strong>Año de Bachillerato que estudiará:</strong> <span class="fo-linea">${data.grado || ""}</span></p>

      <div class="fo-fila-top">
        <div class="fo-nie-dui">
          <p><strong>NIE:</strong> <span class="fo-linea">${data.nie || ""}</span></p>
          <p><strong>DUI:</strong> <span class="fo-linea">${data.duiEstudiante || ""}</span></p>
        </div>

        <div class="fo-sello">SELLO</div>

        <div class="fo-numero">
          <span>N°</span>
          <span class="fo-numero-valor">${data.numeroFicha || ""}</span>
        </div>
      </div>

      <p class="fo-fecha">
        San Salvador,
        <span class="fo-linea-corta">${fMat.dia || ""}</span> de
        <span class="fo-linea-corta">${fMat.mesNombre || ""}</span> de 202<span class="fo-linea-mini">${anioCorto}</span>
      </p>

      <h3 class="fo-subtitulo">Datos Generales del Estudiante según Partida de Nacimiento</h3>
      <table class="fo-tabla-nombre">
        <tr>
          <td>${data.primerApellido || ""}</td>
          <td>${data.segundoApellido || ""}</td>
          <td>${data.primerNombre || ""}</td>
          <td>${data.segundoNombre || ""}</td>
        </tr>
        <tr class="fo-tabla-labels">
          <td>Primer Apellido</td>
          <td>Segundo Apellido</td>
          <td>Primer Nombre</td>
          <td>Segundo Nombre</td>
        </tr>
      </table>

      <p>
        Lugar y fecha de nacimiento: <span class="fo-linea"></span>
        Día: <span class="fo-linea-mini">${fNac.dia || ""}</span>
        Mes: <span class="fo-linea-mini">${fNac.mesNombre || ""}</span>
        Año: <span class="fo-linea-mini">${fNac.anio || ""}</span>
      </p>

      <p>
        Edad: <span class="fo-linea-mini">${data.edad || ""}</span>
        ${data.sexo ? `&nbsp;&nbsp;Sexo: <strong>${data.sexo}</strong>` : ""}
        &nbsp;&nbsp;N° de celular del estudiante <span class="fo-linea">${data.telefonoEstudiante || ""}</span>
        &nbsp;&nbsp;Grado que estudiará <span class="fo-linea">${data.grado || ""}</span>
      </p>

      <p>
        Último año aprobado <span class="fo-linea">${data.ultimoAnioAprobado || ""}</span>
        ${data.tipoIngreso ? `&nbsp;&nbsp;<strong>${data.tipoIngreso}</strong>` : ""}
        &nbsp;&nbsp;¿Dónde estudió el año anterior? <span class="fo-linea">${data.colegioAnterior || ""}</span>
      </p>

      ${(data.tipoTransporte || data.distanciaKm) ? `
      <p>
        ${data.tipoTransporte ? `Tipo de transporte que utiliza: <strong>${data.tipoTransporte}</strong>` : ""}
        ${data.distanciaKm ? `&nbsp;&nbsp;Distancia en KM <span class="fo-linea-mini">${data.distanciaKm}</span>` : ""}
      </p>` : ""}

      ${data.conQuienVive ? `
      <p>¿Con quién vive? <strong>${data.conQuienVive}</strong></p>` : ""}

      ${data.enfermedad ? `
      <p>
        ¿Padece de alguna enfermedad? <strong>${data.enfermedad}</strong>
        ${data.cualEnfermedad ? ` &nbsp;&nbsp;¿Cuál? <span class="fo-linea">${data.cualEnfermedad}</span>` : ""}
      </p>` : ""}
      ${data.medicamento ? `<p>Nombre del medicamento que utiliza: <span class="fo-linea">${data.medicamento}</span> ¿En qué dosis? <span class="fo-linea"></span></p>` : ""}
      ${data.otros ? `<p>Otros: <span class="fo-linea-larga">${data.otros}</span></p>` : ""}

      ${(data.vacunaCovid || data.zonaResidencia) ? `
      <p>
        ${data.vacunaCovid ? `Vacuna COVID-19: <strong>${data.vacunaCovid}</strong>` : ""}
        ${data.zonaResidencia ? `&nbsp;&nbsp;Zona de residencia: <strong>${data.zonaResidencia}</strong>` : ""}
      </p>` : ""}
      ${data.direccionResidencia ? `<p>Dirección de Residencia: <span class="fo-linea-larga">${data.direccionResidencia}</span></p>` : ""}

      ${(data.correoEstudiantil || data.computadoraMineducyt) ? `
      <p>
        ${data.correoEstudiantil ? `Correo electrónico MINEDUCYT <span class="fo-linea">${data.correoEstudiantil}</span>` : ""}
        ${data.computadoraMineducyt ? `&nbsp;&nbsp;Posee computadora del MINEDUCYT: <strong>${data.computadoraMineducyt}</strong>` : ""}
      </p>` : ""}
      ${(data.correoPersonal || data.internet) ? `
      <p>
        ${data.correoPersonal ? `Correo personal <span class="fo-linea">${data.correoPersonal}</span>` : ""}
        ${data.internet ? `&nbsp;&nbsp;Posee acceso a internet: <strong>${data.internet}</strong>` : ""}
      </p>` : ""}

      <p>
        Talla de camisa <span class="fo-linea-mini">${data.tallaCamisa || ""}</span>
        Pantalón <span class="fo-linea-mini">${data.tallaPantalon || ""}</span>
        Blusa <span class="fo-linea-mini">${data.tallaBlusa || ""}</span>
        Falda <span class="fo-linea-mini">${data.tallaFalda || ""}</span>
        Zapatos <span class="fo-linea-mini">${data.tallaZapatos || ""}</span>
      </p>

      ${data.hermanosCentroeducativo ? `
      <p>
        Tiene hermano/a en el Centro Escolar: <strong>${data.hermanosCentroeducativo}</strong>
        ${data.nombresHermanos ? ` &nbsp;&nbsp;Nombre: <span class="fo-linea">${data.nombresHermanos}</span>` : ""}
        ${data.nivelAcademico ? ` Nivel/Secc: <span class="fo-linea-mini">${data.nivelAcademico}</span>` : ""}
      </p>` : ""}

      <h3 class="fo-subtitulo">Bachillerato que estudiará</h3>
      <p><strong>${data.especialidad || "—"}</strong></p>

      <h3 class="fo-subtitulo">Datos del Responsable</h3>
      <p>Responsable: <span class="fo-linea-larga">${data.responsable || ""}</span></p>
      <p>
        Parentesco <span class="fo-linea">${data.parentesco || ""}</span>
        DUI <span class="fo-linea">${data.duiResponsable || ""}</span>
        TEL. <span class="fo-linea">${data.telefonoResponsable || ""}</span>
        Whatsapp <span class="fo-linea">${data.whatsappResponsable || ""}</span>
      </p>
      <p>Correo Electrónico <span class="fo-linea-larga">${data.correoResponsable || ""}</span></p>

      <table class="fo-tabla-madre-padre">
        <tr><th colspan="2">Datos de Madre - Padre</th></tr>
        <tr>
          <td>Madre: <span class="fo-linea-larga">${data.madreNombre || ""}</span></td>
          <td>Padre: <span class="fo-linea-larga">${data.padreNombre || ""}</span></td>
        </tr>
        <tr>
          <td>Ocupación: <span class="fo-linea">${data.madreOcupacion || ""}</span></td>
          <td>Ocupación: <span class="fo-linea">${data.padreOcupacion || ""}</span></td>
        </tr>
        <tr>
          <td>Lugar de trabajo: <span class="fo-linea">${data.madreLugarTrabajo || ""}</span></td>
          <td>Lugar de trabajo: <span class="fo-linea">${data.padreLugarTrabajo || ""}</span></td>
        </tr>
        <tr>
          <td>Número de DUI: <span class="fo-linea">${data.madreDui || ""}</span></td>
          <td>Número de DUI: <span class="fo-linea">${data.padreDui || ""}</span></td>
        </tr>
        <tr>
          <td>Lugar y fecha de nacimiento: <span class="fo-linea">${[data.madreLugarNacimiento, descomponerFecha(data.madreFechaNacimiento).dia && `${descomponerFecha(data.madreFechaNacimiento).dia}/${descomponerFecha(data.madreFechaNacimiento).mes}/${descomponerFecha(data.madreFechaNacimiento).anio}`].filter(Boolean).join(" — ")}</span></td>
          <td>Lugar y fecha de nacimiento: <span class="fo-linea">${[data.padreLugarNacimiento, descomponerFecha(data.padreFechaNacimiento).dia && `${descomponerFecha(data.padreFechaNacimiento).dia}/${descomponerFecha(data.padreFechaNacimiento).mes}/${descomponerFecha(data.padreFechaNacimiento).anio}`].filter(Boolean).join(" — ")}</span></td>
        </tr>
        <tr>
          <td>Número de Celular: <span class="fo-linea">${data.madreCelular || ""}</span></td>
          <td>Número de Celular: <span class="fo-linea">${data.padreCelular || ""}</span></td>
        </tr>
      </table>

      <h3 class="fo-subtitulo">Compromisos</h3>
      <ol class="fo-compromisos">
        <li>Asistir puntualmente a las convocatorias hechas por la Institución.</li>
        <li>Leer y dar cumplimiento a lo que establece el Manual de Convivencia.</li>
        <li>Cumplir con los compromisos pactados en Asamblea General de padres, madres y/o responsables.</li>
        <li>Asistir a cualquier llamado por el/la maestro/a, coordinación, subdirección o dirección de la institución.</li>
        <li>Responder por daños materiales que ocasione mi hijo/a en la Institución.</li>
        <li>Velar porque el alumno/a no pueda retirarse de la institución en horas de clase, sin la presencia de su responsable.</li>
        <li>No permitir que el alumno/a pueda traer a la institución objetos de valor que no sea material didáctico utilizado en clases.</li>
      </ol>

      <div class="fo-firmas">
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Docente</p>
        </div>
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Padre, madre y/o responsable</p>
        </div>
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Estudiante</p>
        </div>
      </div>

    </div>
  `;
}

/* =========================================================
   MODAL: VER DOCUMENTOS REGISTRADOS POR EL DOCENTE
   -----------------------------------------------------------
   Lee matriculaActual.documentosChecklist, que es el mismo
   campo que guarda Docente/docente.js con updateDoc() sobre
   el documento en la colección "matriculas". No existe una
   colección "expedientes" separada.
   Estructura real guardada por el docente:
   {
     tipo: "primer_nuevo" | "segundo_nuevo" | "segundo_antiguo" | "tercer_antiguo",
     principal: [{ marcado: bool, nota: string }, ...],
     general:   [{ marcado: bool, nota: string }, ...],
     observaciones: string,
     actualizado: "2026-08-17T10:00:00.000Z" (ISO string)
   }
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
          : "No identificado";
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
  ocultarResultados();
  matriculaActual = null;
  mostrarMensaje("💡 Ingrese el NIE del estudiante para buscar.", "info");
};

/* =========================================================
   IMPRIMIR DOCUMENTO
========================================================= */
window.imprimirDocumento = function() {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  window.print();
};

/* =========================================================
   DESCARGAR PDF (requiere html2pdf)
========================================================= */
window.descargarPDF = function() {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  if (typeof html2pdf === 'undefined') {
    alert("⚠️ La librería para PDF no está cargada. Por favor, recarga la página.");
    return;
  }

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
   MODIFICAR CAMPOS (editar y guardar en Firestore)
========================================================= */
let modoEdicion = false;

const CAMPOS_EDITABLES = [
  "r_numeroFicha", "r_fechaMatricula",
  "r_primerApellido", "r_segundoApellido", "r_primerNombre", "r_segundoNombre",
  "r_fechaNacimiento", "r_edad", "r_sexo", "r_telefonoEstudiante", "r_correoEstudiantil", "r_correoPersonal",

  "r_grado", "r_especialidad", "r_ultimoAnioAprobado", "r_colegioAnterior",
  "r_hermanosCentroeducativo", "r_nombresHermanos", "r_nivelAcademico",

  "r_partidaNumero", "r_folio", "r_tomo", "r_libro",

  "r_computadoraMineducyt", "r_internet",
  "r_tallaCamisa", "r_tallaPantalon", "r_tallaBlusa", "r_tallaFalda", "r_tallaZapatos",

  "r_vacunaCovid", "r_enfermedad", "r_cualEnfermedad", "r_medicamento", "r_otros",

  "r_responsable", "r_parentesco", "r_duiResponsable", "r_telefonoResponsable",
  "r_whatsappResponsable", "r_correoResponsable",

  "r_madreNombre", "r_madreOcupacion", "r_madreLugarTrabajo", "r_madreDui",
  "r_madreLugarNacimiento", "r_madreFechaNacimiento", "r_madreCelular",

  "r_padreNombre", "r_padreOcupacion", "r_padreLugarTrabajo", "r_padreDui",
  "r_padreLugarNacimiento", "r_padreFechaNacimiento", "r_padreCelular"
];

window.modificarcampos = async function () {
  if (!matriculaActual) {
    alert("⚠️ Primero busque una matrícula.");
    return;
  }

  const btnModificar = document.querySelector(".btn-Modificar");

  // --- Si NO está en modo edición: activar edición ---
  if (!modoEdicion) {
    CAMPOS_EDITABLES.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = false;
        el.classList.add("campo-editable");
      }
    });

    modoEdicion = true;
    if (btnModificar) btnModificar.textContent = "💾 Guardar cambios";
    mostrarMensaje("✏️ Modo edición activado. Corrija los campos y presione «Guardar cambios».", "info");
    return;
  }

  // --- Si YA está en modo edición: guardar cambios ---
  try {
    mostrarMensaje("⏳ Guardando cambios...", "loading");

    const datosActualizados = {};
    CAMPOS_EDITABLES.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const clave = id.replace("r_", "");
        datosActualizados[clave] = el.value.trim();
      }
    });

    await actualizarMatricula(matriculaActual, datosActualizados);

    // Actualizar copia local con los nuevos valores
    matriculaActual = { ...matriculaActual, ...datosActualizados };

    CAMPOS_EDITABLES.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = true;
        el.classList.remove("campo-editable");
      }
    });

    modoEdicion = false;
    if (btnModificar) btnModificar.textContent = " Modificar";

    // Refrescar la ficha imprimible/PDF con los datos ya actualizados
    generarFichaImprimir(matriculaActual, matriculaActual);

    mostrarMensaje("✅ Cambios guardados correctamente.", "success");

  } catch (error) {
    console.error("❌ Error al guardar cambios:", error);
    mostrarMensaje("❌ Error al guardar: " + error.message, "error");
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
   BUSCAR CON ENTER
========================================================= */
if (buscarInput) {
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
// CAMBIAR ENTRE MENÚS (solo Matrícula y Reportes)
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
   (Se corrigió: ya no se referencia "filtroTipo", que no
   existe en el HTML. Ese era el motivo por el que el botón
   "Buscar" de Reportes no hacía nada: la función tronaba en
   la primera línea al intentar leer .value de null.)
========================================================= */
window.buscarReportes = async function () {
  const mensajeReportes = document.getElementById("mensajeReportes");
  const tablaContenedor = document.getElementById("tablaReportesContenedor");
  const cuerpoTabla = document.getElementById("cuerpoTablaReportes");

  const nie = document.getElementById("filtroNie").value.trim();
  const grado = document.getElementById("filtroGrado").value.trim();
  const especialidad = document.getElementById("filtroEspecialidad").value.trim();

  mensajeReportes.textContent = "⏳ Buscando...";
  mensajeReportes.style.color = "#1976d2";
  tablaContenedor.style.display = "none";
  cuerpoTabla.innerHTML = "";

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

    if (resultados.length === 0) {
      mensajeReportes.textContent = "❌ No se encontraron matrículas con esos filtros.";
      mensajeReportes.style.color = "#d32f2f";
      return;
    }

    mensajeReportes.textContent = `✅ ${resultados.length} resultado(s) encontrado(s).`;
    mensajeReportes.style.color = "#2e7d32";

    resultados.forEach((r) => {
      const nombreCompleto = `${r.primerNombre || ""} ${r.segundoNombre || ""} ${r.primerApellido || ""} ${r.segundoApellido || ""}`.trim();
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${r.numeroFicha || "-"}</td>
        <td>${r.nie || "-"}</td>
        <td>${nombreCompleto || "-"}</td>
        <td><span class="badge-grado">${r.grado || "-"}</span></td>
        <td><span class="badge-especialidad">${r.especialidad || "-"}</span></td>
        <td><button class="btn-ver-fila" onclick="verDesdeReporte('${r.nie || ""}')">Ver</button></td>
      `;
      cuerpoTabla.appendChild(fila);
    });

    tablaContenedor.style.display = "block";

  } catch (error) {
    console.error("❌ Error en reportes:", error);
    mensajeReportes.textContent = "❌ Error al buscar: " + error.message;
    mensajeReportes.style.color = "#d32f2f";
  }
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
  document.getElementById("mensajeReportes").textContent = "";
  document.getElementById("tablaReportesContenedor").style.display = "none";
};
