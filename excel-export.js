/* Exportación .xlsx estándar mediante la librería cargada en admin.html. */
export function descargarTablaExcel({ nombreArchivo, titulo, encabezados, filas }) {
  const XLSX = window.XLSX;
  if (!XLSX) {
    throw new Error("No se pudo preparar el archivo Excel. Recargue la página e inténtelo nuevamente.");
  }

  const datos = [[titulo], encabezados, ...filas];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  const ultimaColumna = XLSX.utils.encode_col(encabezados.length - 1);
  hoja["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } }];
  hoja["!autofilter"] = { ref: `A2:${ultimaColumna}${filas.length + 2}` };
  hoja["!cols"] = encabezados.map((encabezado, indice) => ({
    wch: Math.min(Math.max(
      encabezado.length + 3,
      ...filas.map((fila) => String(fila[indice] ?? "").length + 2),
    ), 38),
  }));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reportes");
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`, { compression: true });
}
