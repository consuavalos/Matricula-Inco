const CLAVE = 'matricula.borrador.v1';
const omitidos = new Set(['numeroFicha', 'correoEstudiantil', 'edad']);

// El texto se guarda inmediatamente; la foto se guarda como archivo en IndexedDB.
export async function iniciarBorrador({ form, foto, crearHermano, mostrarPaso, obtenerPaso, finalizado }) {
  let restaurando = true;
  let eliminado = false;
  let id = crypto.randomUUID();
  const aviso = document.createElement('p');
  aviso.id = 'estadoBorrador';
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  form.prepend(aviso);
  let db;
  const abrir = new Promise((resolve, reject) => {
    const peticion = indexedDB.open('matricula-borrador', 1);
    peticion.onupgradeneeded = () => peticion.result.createObjectStore('fotos');
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
    peticion.onblocked = () => reject(new Error('Almacenamiento ocupado'));
  }).then(resultado => { db = resultado; }).catch(() => {
    aviso.textContent = 'No se puede guardar la foto en este navegador. Los demás datos se conservarán si el almacenamiento está disponible.';
  });
  const operacionFoto = async (modo, archivo) => {
    await abrir;
    if (!db) throw new Error('Sin almacenamiento de fotografías');
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction('fotos', modo === 'leer' ? 'readonly' : 'readwrite');
      const almacen = transaccion.objectStore('fotos');
      const peticion = modo === 'leer' ? almacen.get(id) : modo === 'borrar' ? almacen.delete(id) : almacen.put(archivo, id);
      transaccion.oncomplete = () => resolve(peticion.result);
      transaccion.onerror = () => reject(transaccion.error);
      transaccion.onabort = () => reject(transaccion.error);
    });
  };
  const campos = () => Array.from(form.querySelectorAll('input,select,textarea')).filter(el => el.id && el.type !== 'file' && el.type !== 'hidden' && !omitidos.has(el.id) && !el.classList.contains('hermano-input'));
  const guardar = () => {
    if (restaurando || eliminado || finalizado()) return;
    try {
      const valores = Object.fromEntries(campos().map(el => [el.id, { valor:el.value, marcado:el.checked, auto:el.dataset.autollenadoResponsable === 'true' }]));
      const hermanos = Array.from(form.querySelectorAll('.fila-hermano')).map(fila => ({ nombre:fila.querySelector('.hermano-nombre').value, grado:fila.querySelector('.hermano-grado').value }));
      localStorage.setItem(CLAVE, JSON.stringify({ version:1, id, valores, hermanos, paso:obtenerPaso() }));
      aviso.textContent = db ? 'Borrador guardado en este navegador. Se recuperará al volver; se elimina al completar la matrícula.' : 'Texto guardado en este navegador. No se pudo guardar la fotografía.';
    } catch {
      aviso.textContent = 'No se pudo guardar el borrador. Mantenga esta página abierta para no perder los datos.';
    }
  };
  form.addEventListener('input', guardar);
  form.addEventListener('change', guardar);
  form.addEventListener('submit', guardar);
  form.addEventListener('click', () => queueMicrotask(guardar));
  form.addEventListener('cambiopaso', guardar);
  window.addEventListener('pagehide', guardar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardar(); });
  const guardarFoto = async () => {
    if (restaurando || eliminado || finalizado()) return;
    guardar();
    try {
      await operacionFoto(foto.dataset.estadoFoto === 'lista' ? 'guardar' : 'borrar', foto.files[0]);
      if (!eliminado) guardar();
    } catch { aviso.textContent = 'Los datos se guardaron, pero la foto no. Deberá seleccionarla al volver.'; }
  };
  form.addEventListener('fotoactualizada', guardarFoto);
  form.addEventListener('fotoinvalidada', guardarFoto);
  try {
    const raw = localStorage.getItem(CLAVE);
    const datos = raw ? JSON.parse(raw) : null;
    await abrir;
    if (datos?.version === 1 && typeof datos.id === 'string' && datos.valores && typeof datos.valores === 'object') {
      id = datos.id;
      const asignar = el => {
        const dato = datos.valores[el.id];
        if (!dato || typeof dato.valor !== 'string') return;
        el.value = dato.valor;
        if (['checkbox', 'radio'].includes(el.type)) el.checked = Boolean(dato.marcado);
        if (dato.auto) el.dataset.autollenadoResponsable = 'true';
        else delete el.dataset.autollenadoResponsable;
      };
      campos().forEach(asignar);
      // Reactivar primero campos dependientes; luego recuperar los valores que sus manejadores limpian.
      for (const campo of ['sexo','enfermedad','conQuienVive','hermanosCentroeducativo','parentesco','nie','fechaNacimiento','grado','tipoIngreso']) {
        const el = document.getElementById(campo);
        if (el) el.dispatchEvent(new Event(campo === 'nie' ? 'input' : 'change', { bubbles:true }));
      }
      campos().forEach(asignar);
      const lista = document.getElementById('listaHermanos');
      lista.replaceChildren();
      if (document.getElementById('hermanosCentroeducativo').value === 'Sí') {
        for (const hermano of (Array.isArray(datos.hermanos) ? datos.hermanos : []).slice(0, 3)) {
          const fila = crearHermano();
          fila.querySelector('.hermano-nombre').value = typeof hermano.nombre === 'string' ? hermano.nombre : '';
          fila.querySelector('.hermano-grado').value = typeof hermano.grado === 'string' ? hermano.grado : '';
          lista.append(fila);
        }
      }
      try {
        const archivo = await operacionFoto('leer');
        if (archivo instanceof File) {
          const transferencia = new DataTransfer();
          transferencia.items.add(archivo);
          foto.files = transferencia.files;
          await new Promise(resolve => {
            form.addEventListener('fotoactualizada', resolve, { once:true });
            foto.dispatchEvent(new Event('change', { bubbles:true }));
          });
        }
      } catch { /* La recuperación de texto sigue disponible sin la foto. */ }
      mostrarPaso(Number.isInteger(datos.paso) && datos.paso >= 1 && datos.paso <= 6 ? datos.paso : 1);
      aviso.textContent = 'Borrador recuperado. Revise los datos y continúe; se validarán antes de guardar.';
    } else {
      aviso.textContent = 'Sus datos se guardarán como borrador en este navegador mientras completa la matrícula.';
    }
  } catch {
    aviso.textContent = 'No se pudo recuperar el borrador. Si el navegador bloquea el almacenamiento, no podrá conservar los datos.';
  } finally {
    restaurando = false;
    form.dataset.borradorListo = 'true';
  }
  const eliminar = async () => {
      eliminado = true;
      try {
        if (JSON.parse(localStorage.getItem(CLAVE) || 'null')?.id === id) localStorage.removeItem(CLAVE);
      } catch { /* No impedir mostrar un guardado confirmado. */ }
      try { await operacionFoto('borrar'); } catch { /* Un archivo sin su borrador no se restaura. */ }
  };
  return { eliminar };
}
