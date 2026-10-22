import { protegerRuta, cerrarSesionSupabase } from "../auth-guard.js";
import { buscarMatriculaPorNie } from "../supabase-data.js";
import { mostrarFichaConsulta } from "./ficha-consulta.js";

const accesoCoordinador = await protegerRuta("coordinador");

const $ = (id) => document.getElementById(id);
const inputNie = $("nieConsulta");
const botonConsulta = $("botonConsulta");

if (accesoCoordinador) {
  const identificador = $("identificadorCoordinador");
  const nombre = sessionStorage.getItem("nombreUsuario") || "Coordinador";
  if (identificador) identificador.textContent = `Coordinador responsable: ${nombre}`;
  botonConsulta.disabled = false;
}

/* ============================================================
   NIE: solo números, máximo 12 dígitos
   ============================================================ */
const NIE_MAX = 12;

function limpiarNie() {
  const limpio = inputNie.value.replace(/\D/g, "").slice(0, NIE_MAX);
  if (inputNie.value !== limpio) inputNie.value = limpio;
}

inputNie.addEventListener("input", limpiarNie);
inputNie.addEventListener("keydown", (e) => {
  const permitidas = ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"];
  if (e.ctrlKey || e.metaKey || permitidas.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
});
inputNie.addEventListener("paste", (e) => {
  e.preventDefault();
  const texto = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
  const ini = inputNie.selectionStart;
  const fin = inputNie.selectionEnd;
  inputNie.value = (inputNie.value.slice(0, ini) + texto + inputNie.value.slice(fin)).slice(0, NIE_MAX);
});

/* ============================================================
   MAPEO: ficha de matrícula -> acta
   Si tus columnas se llaman distinto, agrega los nombres a la lista
   que corresponda (se prueban en orden). Además hay una búsqueda
   "flexible" por palabras clave para el DUI y otros datos.
   ============================================================ */
const CAMPOS = {
  // Estudiante
  primerNombre:    ["primer_nombre", "nombre1", "primerNombre"],
  segundoNombre:   ["segundo_nombre", "nombre2", "segundoNombre"],
  primerApellido:  ["primer_apellido", "apellido1", "primerApellido"],
  segundoApellido: ["segundo_apellido", "apellido2", "segundoApellido"],
  nombres:         ["nombres", "nombre_estudiante", "estudiante_nombre"],
  apellidos:       ["apellidos", "apellido_estudiante", "estudiante_apellidos"],
  nombreCompleto:  ["nombre_completo", "nombre_alumno", "alumno", "estudiante"],
  duiEstudiante:   ["dui_estudiante", "dui_alumno", "estudiante_dui", "alumno_dui"],
  edad:            ["edad"],
  fechaNacimiento: ["fecha_nacimiento", "fecha_de_nacimiento", "nacimiento", "fechaNacimiento"],
  colegioAnterior: ["institucion_anterior", "centro_escolar_anterior", "centro_educativo_anterior",
                    "donde_estudio_anio_anterior", "donde_estudio", "estudio_anio_anterior"],

  // Bachillerato / año que estudiará
  bachillerato:    ["bachillerato", "bachillerato_estudiara", "bachillerato_que_estudiara", "opcion", "especialidad", "carrera"],
  anioBach:        ["anio_bachillerato", "año_bachillerato", "anio_estudiara", "año_estudiara", "grado_estudiara", "grado", "anio"],
  seccion:         ["seccion", "sección"],

  // Responsable (encargado)
  responsable:     ["responsable_nombre", "nombre_responsable", "encargado_nombre", "nombre_encargado", "responsable", "encargado"],
  duiResponsable:  ["responsable_dui", "dui_responsable", "encargado_dui", "dui_encargado", "duiResponsable"],
  parentesco:      ["responsable_parentesco", "parentesco_responsable", "parentesco_encargado", "parentesco", "relacion"],

  // Tipo de ingreso (si existen en tu base)
  tipoIngreso:     ["tipo_ingreso", "ingreso", "tipo_matricula"],
  nuevoIngreso:    ["nuevo_ingreso", "es_nuevo_ingreso"],
  repitencia:      ["repitencia", "repitente", "es_repitente"],
  sobreEdad:       ["sobre_edad", "sobreedad", "es_sobre_edad"]
};

function aplanar(obj, destino = {}, prefijo = "") {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      aplanar(v, destino, prefijo ? `${prefijo}_${k}` : k);
    } else {
      if (prefijo) destino[`${prefijo}_${k}`] = v;
      if (!(k in destino)) destino[k] = v;
    }
  }
  return destino;
}

const hayValor = (v) => v !== undefined && v !== null && String(v).trim() !== "";

function tomar(plano, claves) {
  for (const c of claves) if (hayValor(plano[c])) return plano[c];
  return "";
}

// Busca una clave que cumpla TODAS las expresiones (ej. /dui/ y /respons|encarg/)
function buscarClave(plano, ...regex) {
  for (const [k, v] of Object.entries(plano)) {
    if (hayValor(v) && regex.every((r) => r.test(k))) return v;
  }
  return "";
}

const esVerdadero = (v) => v === true || ["true", "si", "sí", "1", "x"].includes(String(v).trim().toLowerCase());

function numeroDeAnio(texto) {
  const t = String(texto).toLowerCase();
  if (/primer|1/.test(t)) return 1;
  if (/segund|2/.test(t)) return 2;
  if (/tercer|3/.test(t)) return 3;
  return 0;
}

function calcularEdad(p) {
  const directa = parseInt(tomar(p, CAMPOS.edad) || buscarClave(p, /edad/i), 10);
  if (Number.isFinite(directa)) return directa;
  const f = new Date(tomar(p, CAMPOS.fechaNacimiento));
  if (isNaN(f)) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - f.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), f.getMonth(), f.getDate())) e--;
  return e;
}

function extraerDatosActa(datos) {
  const p = aplanar(datos);

  // Nombre: primer nombre + segundo nombre + primer apellido + segundo apellido
  let alumno = [
    tomar(p, CAMPOS.primerNombre), tomar(p, CAMPOS.segundoNombre),
    tomar(p, CAMPOS.primerApellido), tomar(p, CAMPOS.segundoApellido)
  ].filter(Boolean).join(" ");
  if (!alumno) alumno = [tomar(p, CAMPOS.nombres), tomar(p, CAMPOS.apellidos)].filter(Boolean).join(" ");
  if (!alumno) alumno = tomar(p, CAMPOS.nombreCompleto);

  // "Bachillerato General" + "Segundo Año" -> "General, Segundo Año"
  const bach = String(tomar(p, CAMPOS.bachillerato)).replace(/^bachillerato\s+/i, "").trim();
  const anio = String(tomar(p, CAMPOS.anioBach)).trim();

  // DUI del responsable: nombres conocidos -> búsqueda flexible -> último recurso "dui"
  const duiEstudiante = tomar(p, CAMPOS.duiEstudiante) || buscarClave(p, /dui/i, /(estud|alumn)/i);
  const duiEncargado =
    tomar(p, CAMPOS.duiResponsable) ||
    buscarClave(p, /dui/i, /(respons|encarg|tutor)/i) ||
    (hayValor(p.dui) && !duiEstudiante ? p.dui : "");

  // Motivos
  const tipo = String(tomar(p, CAMPOS.tipoIngreso)).toLowerCase();
  const hayDatoIngreso = hayValor(tomar(p, CAMPOS.nuevoIngreso)) || tipo || hayValor(tomar(p, CAMPOS.repitencia));
  let nuevoIngreso = esVerdadero(tomar(p, CAMPOS.nuevoIngreso)) || tipo.includes("nuevo");
  const repitencia = esVerdadero(tomar(p, CAMPOS.repitencia)) || tipo.includes("repit");
  if (!hayDatoIngreso) {
    // Si el año anterior estudió en otra institución distinto al INCO -> nuevo ingreso
    const anterior = String(tomar(p, CAMPOS.colegioAnterior) || buscarClave(p, /anterior/i, /(centro|instit|escuela|colegio|donde)/i));
    nuevoIngreso = anterior !== "" && !/comercio|\binco\b/i.test(anterior);
  }

  // Sobre edad: 2 o más años por encima de la edad típica (1.º=16, 2.º=17, 3.º=18)
  let sobreEdad = esVerdadero(tomar(p, CAMPOS.sobreEdad));
  if (!hayValor(tomar(p, CAMPOS.sobreEdad))) {
    const edad = calcularEdad(p);
    const n = numeroDeAnio(anio);
    sobreEdad = edad !== null && n > 0 && edad >= 15 + n + 2;
  }

  return {
    alumno: String(alumno).trim(),
    duiEstudiante: String(duiEstudiante),
    bachillerato: [bach, anio].filter(Boolean).join(", "),
    seccion: String(tomar(p, CAMPOS.seccion)),
    encargado: String(tomar(p, CAMPOS.responsable)).trim(),
    duiEncargado: String(duiEncargado),
    parentesco: String(tomar(p, CAMPOS.parentesco)).trim(),
    nuevoIngreso, repitencia, sobreEdad
  };
}

/* ============================================================
   Acta: valores en azul (auto) y negro (escritos a mano), centrados
   ============================================================ */
/* ============================================================
   FIRMAS DE LA FICHA: Docente que recibió, Responsable y Estudiante
   (se completan sobre la ficha que dibuja mostrarFichaConsulta)
   Si la columna del docente se llama distinto, agrégala aquí.
   ============================================================ */
const CLAVES_DOCENTE = [
  "docente_nombre", "nombre_docente", "docente_receptor", "docente_responsable",
  "docente_matricula", "docente_encargado", "recibido_por", "docente"
];

function completarFirmasFicha(contenedor, datos) {
  const p = aplanar(datos);
  const a = extraerDatosActa(datos);
  const docente = String(
    tomar(p, CLAVES_DOCENTE) || buscarClave(p, /(docente|receptor|recibi)/i)
  ).trim();

  const firmas = [
    { rotulo: /^docente$/i, nombre: docente },
    { rotulo: /^padre,?\s*madre\s*y\/o\s*responsable$/i, nombre: a.encargado },
    { rotulo: /^estudiante$/i, nombre: a.alumno }
  ];

  const estiloNombre = (el) => {
    el.style.textAlign = "center";
    el.style.fontSize = "inherit";
    el.style.minHeight = "1.3em";
  };

  const hojas = [...contenedor.querySelectorAll("*")].filter((el) => el.children.length === 0);
  let encontrados = 0;

  for (const f of firmas) {
    const rotulo = hojas.filter((el) => f.rotulo.test(el.textContent.trim())).pop();
    if (!rotulo) continue;
    encontrados++;
    const previo = rotulo.previousElementSibling;
    if (previo && previo.textContent.trim() === "") {
      // Ya existe la línea de firma vacía: se escribe el nombre sobre ella
      previo.textContent = f.nombre;
      estiloNombre(previo);
    } else {
      const nombre = document.createElement("div");
      nombre.className = "firma-nombre";
      nombre.textContent = f.nombre;
      estiloNombre(nombre);
      nombre.style.borderBottom = "1px solid #000";
      nombre.style.margin = "0 auto 2px";
      rotulo.parentNode.insertBefore(nombre, rotulo);
    }
  }

  // Si la ficha no trae bloque de firmas, se agrega uno al final
  if (encontrados === 0) {
    const bloque = document.createElement("div");
    bloque.style.cssText = "display:flex;justify-content:space-around;gap:24px;margin-top:28px;text-align:center;font-size:12px;";
    [["Docente", docente], ["Padre, madre y/o responsable", a.encargado], ["Estudiante", a.alumno]]
      .forEach(([rotulo, nombre]) => {
        const col = document.createElement("div");
        col.style.flex = "1";
        const n = document.createElement("div");
        n.textContent = nombre;
        n.style.cssText = "border-bottom:1px solid #000;min-height:1.3em;margin-bottom:2px;";
        const r = document.createElement("div");
        r.textContent = rotulo;
        col.append(n, r);
        bloque.appendChild(col);
      });
    contenedor.appendChild(bloque);
  }
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const medidor = document.createElement("canvas").getContext("2d");

// Los campos "linea-*" se agrandan si el texto no cabe
function ajustarAncho(input) {
  if (![...input.classList].some((c) => c.startsWith("linea-"))) return;
  if (!input.dataset.min) input.dataset.min = input.offsetWidth || 0;
  const minimo = Number(input.dataset.min);
  if (!minimo) return;
  medidor.font = getComputedStyle(input).font;
  const ancho = Math.ceil(medidor.measureText(input.value).width) + 16;
  input.style.width = `${Math.max(minimo, ancho)}px`;
}

function setVal(id, valor, auto) {
  const el = $(id);
  el.value = valor;
  el.classList.toggle("auto-llenado", Boolean(auto && valor !== ""));
  ajustarAncho(el);
}

const marca = (id, activo) => setVal(id, activo ? "X" : "", true);

function formatearDui(valor) {
  const d = String(valor).replace(/\D/g, "").slice(0, 9);
  return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
}

function ponerFecha() {
  const hoy = new Date();
  setVal("actaDia", String(hoy.getDate()), true);
  setVal("actaMes", MESES[hoy.getMonth()], true);
  setVal("actaAnio", String(hoy.getFullYear()), true);
  setVal("actaAnioTitulo", String(hoy.getFullYear()).slice(-1), true); // "202" + dígito
}

function rellenarActa(datos) {
  const a = extraerDatosActa(datos);
  const duiEnc = formatearDui(a.duiEncargado);

  // Cuerpo del acta
  setVal("actaAlumno", a.alumno, true);
  setVal("actaBachillerato", a.bachillerato, true);
  setVal("actaSeccion", a.seccion, true);
  setVal("actaEncargado", a.encargado, true);
  setVal("actaDui", duiEnc, true);

  // Parentesco: Padre / Madre -> "X"; cualquier otro (Abuela, Tío...) -> Encargado/a + texto
  const par = a.parentesco.toLowerCase();
  const otro = par !== "" && par !== "padre" && par !== "madre";
  marca("actaPadre", par === "padre");
  marca("actaMadre", par === "madre");
  marca("actaEncargadoMarca", otro);
  setVal("actaParentesco", otro ? a.parentesco : "", true);

  // Motivos
  marca("actaNuevoIngreso", a.nuevoIngreso);
  marca("actaRepitencia", a.repitencia);
  marca("actaSobreEdad", a.sobreEdad);
  marca("actaRendimiento", false); // se marcan a mano
  marca("actaConducta", false);

  // Firmas: Encargado y Estudiante
  setVal("actaFirmaEncargado", a.encargado, true);
  setVal("actaDuiFirmaEncargado", duiEnc, true);
  setVal("actaFirmaEstudiante", a.alumno, true);
  setVal("actaDuiFirmaEstudiante", formatearDui(a.duiEstudiante), true);

  ponerFecha();
}

// Todo campo del acta sigue siendo editable: si lo escribe una persona, pasa a negro
document.querySelectorAll("#actaCondicionamiento input").forEach((input) => {
  input.addEventListener("input", (e) => {
    if (e.isTrusted) input.classList.remove("auto-llenado");
    ajustarAncho(input);
  });
});

// Formato del DUI al editar a mano
["actaDui", "actaDuiFirmaEncargado", "actaDuiFirmaEstudiante"].forEach((id) => {
  $(id).addEventListener("input", (e) => { e.target.value = formatearDui(e.target.value); });
});
// Si se corrige un dato arriba, las firmas se mantienen al día
$("actaDui").addEventListener("input", (e) => { if (e.isTrusted) setVal("actaDuiFirmaEncargado", $("actaDui").value, false); });
$("actaEncargado").addEventListener("input", (e) => { if (e.isTrusted) setVal("actaFirmaEncargado", $("actaEncargado").value, false); });
$("actaAlumno").addEventListener("input", (e) => { if (e.isTrusted) setVal("actaFirmaEstudiante", $("actaAlumno").value, false); });
$("actaAnio").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
  if (e.isTrusted) setVal("actaAnioTitulo", e.target.value.slice(-1), false);
});

ponerFecha();

/* ============================================================
   Búsqueda
   ============================================================ */
$("buscarMatriculaCoordinador").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!accesoCoordinador) return;
  limpiarNie();
  const nie = inputNie.value.trim();
  const estado = $("estadoConsulta");
  const ficha = $("fichaConsulta");
  if (botonConsulta.disabled) return;
  ficha.hidden = true;
  ficha.replaceChildren();
  if (!nie) {
    estado.textContent = "Escriba el NIE del estudiante.";
    return;
  }
  if (!/^\d{1,12}$/.test(nie)) {
    estado.textContent = "El NIE solo puede contener números (máximo 12 dígitos).";
    return;
  }
  botonConsulta.disabled = true;
  estado.textContent = "Buscando matrícula…";
  try {
    const datos = await buscarMatriculaPorNie(nie);
    if (!datos) {
      estado.textContent = "No se encontró ninguna matrícula con ese NIE.";
      return;
    }
    mostrarFichaConsulta(ficha, datos);
    completarFirmasFicha(ficha, datos);
    ficha.hidden = false;
    rellenarActa(datos);
    estado.textContent = "Matrícula encontrada. El acta se llenó con sus datos (en azul) y puede editarla.";
  } catch (error) {
    estado.textContent = `No se pudo consultar la matrícula. ${error.message || "Intente nuevamente."}`;
  } finally {
    botonConsulta.disabled = false;
  }
});

window.imprimirActa = function () {
  if (accesoCoordinador) window.print();
};

window.cerrarSesion = cerrarSesionSupabase;