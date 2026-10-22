// Reglas compartidas sin dependencias. Son controles de calidad, no prueba de identidad.
export const normalizarTexto = valor => String(valor).normalize('NFC').trim().replace(/\s+/gu, ' ');

function palabraSospechosa(parte) {
  return /(.)\1{3,}/u.test(parte) || /^(.{1,3})\1{2,}$/u.test(parte) || /[bcdfghjklmnpqrstvwxyz]{5,}/u.test(parte) || /fw|wf|wj|wk|kj|jk|fj|jf|qx|wq|qj|qk|kq|zx|xz|xq|vx|asdf|qwer|zxcv/u.test(parte);
}

export function errorTextoDescriptivo(valor, { direccion = false, maximo = 150 } = {}) {
  const texto = normalizarTexto(valor);
  if (texto.length < (direccion ? 10 : 2) || texto.length > maximo) return direccion
    ? `Escriba una dirección de entre 10 y ${maximo} caracteres con localidad y referencias.`
    : `Escriba entre 2 y ${maximo} caracteres.`;
  if (!/^[\p{L}\p{N}\s.,;:#°ºª'’()\/-]+$/u.test(texto)) return 'Use texto, números y signos habituales, sin etiquetas HTML ni símbolos extraños.';
  const palabras = texto.match(/\p{L}+/gu) || [];
  const marca = !direccion && /^\d+\p{Lu}{1,5}$/u.test(texto);
  if (!marca && palabras.filter(p => p.length >= 2).length < (direccion ? 2 : 1)) return direccion
    ? 'Complete la dirección con localidad, calle, cantón, caserío o referencias; no escriba solo números o una palabra.'
    : 'Escriba una descripción con palabras, no solo números o signos.';
  for (const palabra of palabras) {
    const simple = palabra.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    // Las siglas de organizaciones son válidas; no se aplica a direcciones.
    const sigla = !direccion && /^\p{Lu}{2,6}$/u.test(palabra);
    if (!sigla && palabraSospechosa(simple)) return 'Revise el texto: contiene repeticiones o una secuencia de letras sospechosa.';
  }
  return '';
}

export function errorNombre(valor, maximo = 50) {
  const texto = normalizarTexto(valor);
  if (texto.length < 2 || texto.length > maximo) return `Use entre 2 y ${maximo} caracteres.`;
  if (!/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(texto)) return 'Use letras, espacios, apóstrofos o guiones entre letras.';
  if (!/^\p{Lu}/u.test(texto)) return 'El nombre o apellido debe comenzar con mayúscula.';
  // Evitar diccionarios de nombres: excluirían apellidos y nombres poco comunes.
  const simple = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  for (const parte of simple.split(/[ '\u2019-]+/u)) {
    if (palabraSospechosa(parte)) {
      return 'Revise el nombre: contiene repeticiones o una secuencia de letras sospechosa.';
    }
  }
  return '';
}

export function errorTelefono(valor, celular = false) {
  if (!/^\d{4}-?\d{4}$/.test(valor)) return 'Ingrese 8 dígitos, con o sin guion (0000-0000).';
  const numero = valor.replace('-', '');
  // SIGET, Plan de Numeración 2025: fijos 2; móviles 5, 6 y 7.
  if (!(celular ? /^[567]/ : /^[2567]/).test(numero)) return celular
    ? 'El celular debe comenzar con 5, 6 o 7.' : 'El teléfono debe comenzar con 2, 5, 6 o 7.';
  if (/^(\d)\1{7}$/.test(numero) || /^(\d{2})\1{3}$/.test(numero) || /^(\d{4})\1$/.test(numero) || /(\d)\1{5,}/.test(numero) || '0123456789'.includes(numero) || '9876543210'.includes(numero)) {
    return 'El teléfono contiene una repetición o secuencia sospechosa. Revíselo.';
  }
  return '';
}

export function errorCorreo(valor) {
  if (valor !== valor.toLowerCase()) return 'El correo debe escribirse en minúsculas.';
  if (valor.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(valor)) return 'Ingrese un correo electrónico válido.';
  const [usuario, dominio] = valor.split('@');
  if (usuario.length > 64 || usuario.startsWith('.') || usuario.endsWith('.') || usuario.includes('..') || dominio.split('.').some(p => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(p))) return 'Revise el formato del correo electrónico.';
  return '';
}

export function errorFecha(valor, hoy = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Ingrese una fecha válida.';
  const fecha = new Date(`${valor}T00:00:00`);
  const [anio, mes, dia] = valor.split('-').map(Number);
  if (!Number.isFinite(fecha.getTime()) || fecha.getFullYear() !== anio || fecha.getMonth() + 1 !== mes || fecha.getDate() !== dia) return 'La fecha no existe.';
  if (fecha > hoy || anio < hoy.getFullYear() - 120) return 'La fecha debe estar en los últimos 120 años y no puede ser futura.';
  return '';
}

export function errorFoto(archivo) {
  if (!archivo) return 'La fotografía es obligatoria.';
  if (!['image/jpeg', 'image/png'].includes(archivo.type) || !/\.(jpe?g|png)$/i.test(archivo.name)) return 'Seleccione una fotografía JPG o PNG.';
  if (!archivo.size || archivo.size > 2 * 1024 * 1024) return 'La fotografía debe pesar entre 1 byte y 2 MB.';
  return '';
}
