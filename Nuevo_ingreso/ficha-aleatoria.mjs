export function anioLectivoSiguiente(fecha = new Date()) {
  return Number(new Intl.DateTimeFormat('en', { timeZone:'America/El_Salvador', year:'numeric' }).format(fecha)) + 1;
}

export function crearFichaAleatoria(fecha = new Date()) {
  // Muestreo uniforme: 000–999, sin contador correlativo.
  const limite = Math.floor(2 ** 32 / 1000) * 1000;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limite);
  return `FIC-${anioLectivoSiguiente(fecha)}-${String(buffer[0] % 1000).padStart(3, '0')}`;
}

export function fichaDelAnioSiguiente(valor, fecha = new Date()) {
  return new RegExp(`^FIC-${anioLectivoSiguiente(fecha)}-[0-9]{3}$`).test(valor);
}
