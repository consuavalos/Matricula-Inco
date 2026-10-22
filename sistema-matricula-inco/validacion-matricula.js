/* =========================================================
   validacion-matricula.js
   Reglas del formulario de Nuevo Ingreso aplicadas al MODIFICAR
   una matrícula desde el panel de Administrador o Docente.

   Colocar en la misma carpeta que ficha-oficial.js / auth-guard.js
   (se importa como "../validacion-matricula.js").

   Uso:
     restringirBuscadorNie(input)        -> buscador: solo números, máx. 12
     activarEdicion(contenedor)          -> al pulsar "Modificar"
     desactivarEdicion(contenedor)       -> al guardar / cancelar
     validarMatricula(contenedor, claves)-> antes de guardar (devuelve {clave: mensaje})
========================================================= */

const LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const TEL = /^[0-9]{4}-?[0-9]{4}$/;
const DUI = /^[0-9]{8}-[0-9]$/;
const CORREO_EST = /^[0-9]+@clases\.edu\.sv$/;
const CORREO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TALLA = /^(XS|S|M|L|XL)$/;
const DOMINIO_EST = "@clases.edu.sv";
const SI_NO = ["Sí", "No"];

/* Campos que el formulario original deja de solo lectura / automáticos */
const CAMPOS_BLOQUEADOS = ["numeroFicha", "fechaMatricula", "edad"];

const letras = (max, req = false) => ({
  tipo: "letras", max, req, patron: LETRAS,
  msg: `Solo letras y espacios (máximo ${max} caracteres)`,
});
const telefono = (req = false) => ({
  tipo: "telefono", max: 9, req, patron: TEL, msg: "Formato: 0000-0000 (8 números)",
});
const dui = (req = false) => ({
  tipo: "dui", max: 10, req, patron: DUI, msg: "Formato: 00000000-0 (8 números, guion y 1 número)",
});
const lista = (opciones, req = true) => ({ lista: opciones, req });
const texto = (max = 100, req = false) => ({ tipo: "texto", max, req });
const talla = () => ({
  tipo: "talla", max: 2, patron: TALLA, msg: "Use XS, S, M, L o XL",
});

const REGLAS = {
  numeroFicha: texto(30, true),   // solo editable por el administrador
  fechaMatricula: texto(20, true), // solo editable por el administrador
  nie: { tipo: "digitos", max: 9, req: true, patron: /^[0-9]{1,9}$/, msg: "Solo números, máximo 9 dígitos" },
  primerApellido: letras(10, true),
  segundoApellido: letras(10, true),
  primerNombre: letras(10, true),
  segundoNombre: letras(10, true),
  fechaNacimiento: { tipo: "fecha", req: true },
  sexo: lista(["Femenino", "Masculino"]),
  telefonoEstudiante: telefono(true),
  correoEstudiantil: {
    tipo: "correoEst", req: true, patron: CORREO_EST,
    msg: "Solo números antes de @clases.edu.sv",
  },
  correoPersonal: { tipo: "correo", max: 100, req: true, patron: CORREO, msg: "Correo no válido, ej. ejemplo@correo.com" },

  grado: lista(["Primer Año", "Segundo Año", "Tercer Año"]),
  especialidad: lista(["Bachillerato General", "Administrativo Contable", "Servicios Turísticos", "Desarrollo de Software"]),
  ultimoAnioAprobado: lista(["Noveno Grado", "Primer Año", "Segundo Año"]),
  colegioAnterior: texto(100, true),
  hermanosCentroeducativo: lista(SI_NO),
  nombresHermanos: letras(50),
  nivelAcademico: texto(50),

  computadoraMineducyt: lista(SI_NO),
  internet: lista(SI_NO),
  tallaCamisa: talla(),
  tallaPantalon: talla(),
  tallaBlusa: talla(),
  tallaFalda: talla(),
  tallaZapatos: { tipo: "digitos", max: 2, patron: /^[0-9]{1,2}$/, msg: "Solo números (máximo 2 dígitos)" },

  enfermedad: lista(SI_NO),
  cualEnfermedad: texto(100),
  medicamento: texto(100),
  otros: texto(100),

  responsable: letras(50, true),
  parentesco: lista(["Mamá", "Papá", "Tío", "Tía", "Abuelo", "Abuela", "Madrina", "Padrino", "Otros"]),
  duiResponsable: dui(true),
  telefonoResponsable: telefono(true),
  whatsappResponsable: telefono(false),
  correoResponsable: { tipo: "correo", max: 100, req: false, patron: CORREO, msg: "Correo no válido" },

  madreNombre: letras(50),
  madreOcupacion: texto(100),
  madreLugarTrabajo: texto(100),
  madreDui: dui(),
  madreLugarNacimiento: texto(100),
  madreCelular: telefono(),
  padreNombre: letras(50),
  padreOcupacion: texto(100),
  padreLugarTrabajo: texto(100),
  padreDui: dui(),
  padreLugarNacimiento: texto(100),
  padreCelular: telefono(),
};

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaISOValida(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const fecha = new Date(y, mo - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() !== mo - 1 || fecha.getDate() !== d) return null;
  return fecha;
}

function edadDesde(fecha) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < fecha.getMonth() ||
    (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

function sanear(regla, valor) {
  const max = regla.max;
  switch (regla.tipo) {
    case "digitos":
      return valor.replace(/\D/g, "").slice(0, max);
    case "letras":
      return valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, max);
    case "telefono": {
      const d = valor.replace(/\D/g, "").slice(0, 8);
      return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
    }
    case "dui": {
      const d = valor.replace(/\D/g, "").slice(0, 9);
      return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
    }
    case "correoEst": {
      const local = valor.split("@")[0].replace(/\D/g, "");
      return local ? local + DOMINIO_EST : "";
    }
    case "correo":
      return valor.replace(/\s/g, "").slice(0, max);
    case "talla":
      return valor.toUpperCase().replace(/[^XSML]/g, "").slice(0, max);
    case "texto":
      return valor.replace(/^\s+/, "").slice(0, max);
    default:
      return valor;
  }
}

function mensajeError(regla, v) {
  if (!v) return regla.req ? "Este campo es obligatorio" : "";
  if (regla.tipo === "fecha") {
    const f = fechaISOValida(v);
    if (!f) return "Fecha no válida (use el selector de fecha)";
    if (f > new Date()) return "La fecha no puede ser futura";
    return "";
  }
  if (regla.lista && !regla.lista.includes(v)) return "Elija una de las opciones disponibles";
  if (regla.max && v.length > regla.max && regla.tipo !== "correoEst") return `Máximo ${regla.max} caracteres`;
  if (regla.patron && !regla.patron.test(v)) return regla.msg || "Formato no válido";
  return "";
}

const q = (cont, clave) => cont.querySelector("#r_" + clave);

/* ---------------------------------------------------------
   Buscador de NIE: solo números, máximo 12
--------------------------------------------------------- */
export function restringirBuscadorNie(input, max = 12) {
  if (!input) return;
  input.maxLength = max;
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.placeholder = "Ej. 123456789";
  input.addEventListener("input", () => {
    const limpio = input.value.replace(/\D/g, "").slice(0, max);
    if (limpio !== input.value) input.value = limpio;
  });
}

export function nieBusquedaValido(valor, max = 12) {
  return new RegExp(`^[0-9]{1,${max}}$`).test(valor);
}

/* ---------------------------------------------------------
   Estilos (se inyectan una sola vez)
--------------------------------------------------------- */
function inyectarEstilos() {
  if (document.getElementById("estilos-validacion-matricula")) return;
  const s = document.createElement("style");
  s.id = "estilos-validacion-matricula";
  s.textContent = `
    .campo-invalido { border:1.5px solid #c62828 !important; background:#ffebee !important; }
    .error-campo { display:block; color:#c62828; font-size:12px; margin-top:4px; font-weight:600; }
    select.select-edicion { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px;
      background-color:#fffde7; border:1.5px solid #f9a825; color:#1a1a1a; font:inherit; }
    input.campo-bloqueado { background:#eceff1 !important; border:1px solid #cfd8dc !important; cursor:not-allowed; }
  `;
  document.head.appendChild(s);
}

/* ---------------------------------------------------------
   Errores en pantalla
--------------------------------------------------------- */
function limpiarError(el) {
  const objetivo = el.classList?.contains("select-edicion") ? el : el;
  objetivo.classList.remove("campo-invalido");
  const sel = el.id ? el.parentElement?.querySelector(`select[data-para-input="${el.id}"]`) : null;
  sel?.classList.remove("campo-invalido");
  el.parentElement?.querySelectorAll(`.error-campo[data-error-de="${el.id}"]`).forEach((n) => n.remove());
}

export function limpiarErrores(cont) {
  cont.querySelectorAll(".campo-invalido").forEach((n) => n.classList.remove("campo-invalido"));
  cont.querySelectorAll(".error-campo").forEach((n) => n.remove());
}

export function marcarErrorCampo(cont, clave, mensaje) {
  const input = q(cont, clave);
  if (!input) return;
  const sel = input.parentElement.querySelector(`select[data-para-input="${input.id}"]`);
  const destino = sel || input;
  destino.classList.add("campo-invalido");
  limpiarMensaje(input);
  const aviso = document.createElement("small");
  aviso.className = "error-campo";
  aviso.dataset.errorDe = input.id;
  aviso.textContent = mensaje;
  destino.after(aviso);
}

function limpiarMensaje(input) {
  input.parentElement?.querySelectorAll(`.error-campo[data-error-de="${input.id}"]`).forEach((n) => n.remove());
}

/* ---------------------------------------------------------
   Dependencias entre campos
--------------------------------------------------------- */
function aplicarDependencias(cont) {
  const valor = (k) => (q(cont, k)?.value || "").trim();
  const bloquear = (claves, bloquear) =>
    claves.forEach((k) => {
      const el = q(cont, k);
      if (!el) return;
      if (bloquear) {
        el.value = "";
        el.readOnly = true;
        el.classList.remove("campo-editable", "campo-invalido");
        el.classList.add("campo-bloqueado");
        limpiarMensaje(el);
      } else {
        el.readOnly = false;
        el.classList.add("campo-editable");
        el.classList.remove("campo-bloqueado");
      }
    });
  bloquear(["nombresHermanos", "nivelAcademico"], valor("hermanosCentroeducativo") === "No");
  bloquear(["cualEnfermedad", "medicamento", "otros"], valor("enfermedad") === "No");

  // Uniforme según el sexo: Masculino -> camisa y pantalón; Femenino -> blusa y falda
  const sexo = valor("sexo");
  bloquear(["tallaBlusa", "tallaFalda"], sexo === "Masculino");
  bloquear(["tallaCamisa", "tallaPantalon"], sexo === "Femenino");
}

function recalcularEdad(cont) {
  const f = fechaISOValida(q(cont, "fechaNacimiento")?.value || "");
  const edad = q(cont, "edad");
  if (!f || !edad || f > new Date()) return;
  edad.value = String(edadDesde(f));
}

/* ---------------------------------------------------------
   Escritura en vivo (delegación de eventos)
--------------------------------------------------------- */
function alEscribir(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement) || !el.id.startsWith("r_")) return;
  const cont = e.currentTarget;
  if (cont.dataset.edicion !== "1") return;
  const clave = el.id.slice(2);
  const regla = REGLAS[clave];
  if (!regla) return;

  if (regla.tipo && regla.tipo !== "fecha") {
    const nuevo = sanear(regla, el.value);
    if (nuevo !== el.value) {
      const antes = el.value;
      el.value = nuevo;
      let pos = Math.max(0, (el.selectionStart ?? nuevo.length) - (antes.length - nuevo.length));
      if (regla.tipo === "correoEst") pos = nuevo.indexOf("@") >= 0 ? nuevo.indexOf("@") : nuevo.length;
      try { el.setSelectionRange(pos, pos); } catch { /* tipo sin selección */ }
    }
  }

  limpiarError(el);
  if (clave === "fechaNacimiento") recalcularEdad(cont);
  if (["hermanosCentroeducativo", "enfermedad", "sexo"].includes(clave)) aplicarDependencias(cont);
}

/* ---------------------------------------------------------
   Activar / desactivar el modo edición
--------------------------------------------------------- */
function montarSelect(input, opciones) {
  const sel = document.createElement("select");
  sel.className = "select-edicion";
  sel.dataset.paraInput = input.id;
  sel.add(new Option("Seleccione…", ""));
  opciones.forEach((o) => sel.add(new Option(o, o)));
  const actual = input.value.trim();
  if (actual && !opciones.includes(actual)) sel.add(new Option(`${actual} (valor actual no válido)`, actual), 1);
  sel.value = actual;
  sel.addEventListener("change", () => {
    input.value = sel.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  input.style.display = "none";
  input.after(sel);
}

/* opciones.bloqueados: campos que quedan de solo lectura (por defecto ficha, fecha de
   matrícula y edad). El administrador puede pasar solo ["edad"] para poder corregir los otros dos. */
export function activarEdicion(cont, opciones = {}) {
  if (!cont) return;
  const bloqueados = opciones.bloqueados ?? CAMPOS_BLOQUEADOS;
  desactivarEdicion(cont);
  inyectarEstilos();
  cont.dataset.edicion = "1";
  if (!cont._validacionActiva) {
    cont.addEventListener("input", alEscribir);
    cont._validacionActiva = true;
  }

  cont.querySelectorAll('input[id^="r_"]').forEach((el) => {
    const clave = el.id.slice(2);

    if (bloqueados.includes(clave)) {
      el.readOnly = true;
      el.classList.remove("campo-editable");
      el.classList.add("campo-bloqueado");
      return;
    }

    const regla = REGLAS[clave];
    if (!regla) return;
    if (regla.max && regla.tipo !== "correoEst") el.maxLength = regla.max;
    if (["digitos", "telefono", "dui"].includes(regla.tipo)) el.inputMode = "numeric";
    if (regla.lista) montarSelect(el, regla.lista);
    if (regla.tipo === "fecha" && fechaISOValida(el.value.trim())) {
      el.type = "date";
      el.max = hoyISO();
    }
  });

  aplicarDependencias(cont);
}

export function desactivarEdicion(cont) {
  if (!cont) return;
  delete cont.dataset.edicion;
  cont.querySelectorAll("select[data-para-input]").forEach((s) => s.remove());
  cont.querySelectorAll('input[id^="r_"]').forEach((el) => {
    el.style.display = "";
    el.removeAttribute("maxlength");
    el.removeAttribute("inputmode");
    el.classList.remove("campo-bloqueado");
    if (el.type === "date") el.type = "text";
  });
  limpiarErrores(cont);
}

/* ---------------------------------------------------------
   Validación antes de guardar
   claves: lista de campos a validar (por ejemplo, solo los modificados).
   Devuelve un objeto {clave: mensaje}; vacío = todo correcto.
--------------------------------------------------------- */
export function validarMatricula(cont, claves) {
  limpiarErrores(cont);
  const errores = {};
  (claves || Object.keys(REGLAS)).forEach((clave) => {
    const regla = REGLAS[clave];
    const input = q(cont, clave);
    if (!regla || !input) return;
    const msg = mensajeError(regla, input.value.trim());
    if (msg) errores[clave] = msg;
  });

  Object.entries(errores).forEach(([clave, msg]) => marcarErrorCampo(cont, clave, msg));

  const primera = Object.keys(errores)[0];
  if (primera) {
    const input = q(cont, primera);
    const destino = input.parentElement.querySelector(`select[data-para-input="${input.id}"]`) || input;
    destino.scrollIntoView({ behavior: "smooth", block: "center" });
    destino.focus?.({ preventScroll: true });
  }
  return errores;
}

/* Etiqueta legible de un campo, para mensajes de resumen */
export function etiquetaCampo(cont, clave) {
  return q(cont, clave)?.closest(".campo")?.querySelector("label")?.textContent?.trim() || clave;
}