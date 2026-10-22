# Validaciones de nuevo ingreso

Cambios aplicados a `nuevo_ingreso.js` y a las dos páginas que lo cargan:

- Revisión completa al guardar, aunque los otros pasos estén ocultos. Los campos condicionales que no aplican se excluyen de la validación y del envío.
- Los cuatro campos de nombre/apellido del estudiante permiten hasta 12 caracteres cada uno, con inicial mayúscula automática. Los campos de nombre completo de familiares conservan 50 caracteres. Se admiten letras Unicode, acentos, apóstrofos y guiones. Se señalan repeticiones, secuencias de consonantes y combinaciones sospechosas incluso cortas, como `Ewfewf`, `Efwfwef`, `Ewfkjewkj` y `Ewfwef`. No se usa un diccionario de nombres: no se garantiza detectar todo nombre inventado y un patrón sospechoso puede requerir revisión humana.
- NIE exclusivamente numérico de 1 a 12 dígitos (sin mínimo de 9), tanto al avanzar como al guardar.
- Ocupación de madre y padre ofrece una lista de ocupaciones comunes y permite escribir una ocupación diferente en el mismo campo. Se conserva el nombre de cada campo para guardar y recuperar el borrador.
- Los correos se convierten a minúsculas al escribir, pegar, cambiar o guardar. La validación rechaza mayúsculas si se intenta omitir esa normalización.
- El correo personal y el del responsable permiten cualquier proveedor con formato válido, incluyendo Yahoo y Outlook. El correo estudiantil conserva el dominio institucional generado desde el NIE.
- Borrador automático en este navegador y origen: texto y paso en localStorage, fotografía en IndexedDB. Se recuperan los campos condicionales y hermanos; se vuelve a validar la foto. No se conserva una ficha provisional ni una comprobación anterior de NIE: la unicidad se consulta de nuevo al avanzar y al guardar. Un fallo al guardar conserva el borrador; un guardado confirmado elimina texto y foto. Se retiró el botón para descartar el borrador durante el llenado. El botón final Volver al inicio vuelve a limpiar el borrador antes de salir.
- El borrador no se sincroniza entre dispositivos. Borrar los datos del navegador, cambiar de navegador/dirección del sitio o salir de una sesión privada puede impedir recuperarlo. Si el almacenamiento falla se muestra un aviso explícito. No se debe interpretar el estado «borrador guardado» como una matrícula enviada a Supabase.
- Las preguntas y opciones iniciales sin valor de los selects quedan deshabilitadas, incluyendo las filas de hermanos agregadas dinámicamente. Las respuestas siguen seleccionándose normalmente.
- Las preguntas iniciales tienen `selected` para evitar que el navegador elija automáticamente la primera respuesta al deshabilitarlas. Los hermanos se validan en Estudios y al revisar todos los pasos para guardar; no bloquean Datos del Alumno. Las alertas muestran la etiqueta y el motivo del campo inválido. Los inputs ocultos internos no participan en la validación ni limpian errores de campos visibles.
- Teléfonos de ocho dígitos con prefijos de El Salvador; los campos de celular y WhatsApp requieren prefijo móvil. Se señalan repeticiones y secuencias evidentes. Se permite que familiares compartan teléfono, correo y datos del responsable: no son identificadores únicos de un estudiante.
- Los cinco campos de teléfono bloquean letras y símbolos al escribir y rechazan pegados que contienen letras. Admiten números pegados con espacios o guion, conservan ocho dígitos y agregan el guion automáticamente. La normalización en captura mantiene sincronizado el autollenado del responsable. Las ediciones de cifras intermedias y el autocompletado también se prueban.
- Dirección de 10 a 50 caracteres con al menos dos palabras, signos habituales y rechazo de secuencias sospechosas. Se ajustó el límite anterior a 50 caracteres para escribir referencias completas. Ocupación, lugar de trabajo y colegio anterior incorporan controles de texto descriptivo de hasta 150 caracteres. Se admiten siglas y respuestas como «Sin empleo» y «No aplica». Estos controles no prueban que una dirección o empresa exista.
- Correos completos, límites de longitud, fechas existentes y no futuras, opciones de listas y rangos numéricos. Los DUI se revisan por formato y repeticiones evidentes; no se certifican contra el registro nacional.
- Hermanos con nombres válidos, sin filas repetidas y máximo tres.
- Alertas al avanzar/guardar con errores y mensajes junto al campo, con `aria-invalid`.
- Si la consulta de NIE falla, se bloquea el avance y el guardado. Se ignoran respuestas de consultas cuando el NIE ya cambió.
- Bloqueo inmediato de envíos simultáneos y recuperación de controles tras un error. El formulario queda inerte durante las consultas de guardado para evitar cambios mientras se envía.
- Fotografía JPG/PNG de hasta 2 MB: extensión, MIME, firma binaria y decodificación; hasta 20 megapíxeles. Se descarta la foto anterior al cambiarla y se impide guardar antes de terminar de leerla.
- Comprobante construido con `textContent` para evitar inyección HTML. Se retiró el registro de los datos personales completos en consola.
- El correo estudiantil y la edad se recalculan. La ficha usa FIC-año siguiente-tres dígitos aleatorios (000–999), con aleatoriedad criptográfica y año calculado en horario de El Salvador. En 2026 el año de ficha es 2027. Una colisión confirmada por el índice único de ficha se reintenta hasta cuatro veces con otro número; otros errores no se reintentan automáticamente.

## Verificación realizada

Los temas claro y oscuro comparten las mismas reglas y bloqueos. Los colores del bloque de documentación, recomendaciones, errores y sugerencias se adaptan al tema. La prueba de navegador mide un contraste mínimo de 4.5:1 en el texto de documentación, etiquetas, errores y estado del borrador en ambas páginas y ambos temas; también verifica los rechazos de datos inválidos y el flujo completo de guardado simulado.

Ejecutar `node --test validaciones.test.mjs ficha-aleatoria.test.mjs formulario.browser.test.cjs`.

La prueba de navegador utiliza Edge instalado y Playwright del runtime de Codex. Se puede indicar otra instalación con `TEST_BROWSER` y `CODEX_NODE_MODULES`. Usa un servidor local efímero y un módulo Supabase simulado: no modifica registros reales. Comprueba las dos páginas, los pasos ocultos, los campos condicionales, errores de conexión y duplicados, HTML en comprobantes, carga de foto, envío completo y bloqueo de doble envío.

También reproduce los datos del primer paso de la captura reportada (Manuel Antonio Avalos Cordero, NIE de 12 dígitos y teléfono fijo), avanza con el botón Siguiente aun cuando hay hermanos incompletos en Estudios, verifica que los hermanos sí bloqueen su propio paso y comprueba que una alerta identifique Primer nombre al vaciarlo.

## Base de datos: pendiente de aplicación

`seguridad-base-datos.sql` prepara índices únicos de NIE, DUI del alumno, ficha y alumno/año; también agrega validaciones de nombres, teléfonos, correos, DUI y nacimiento mediante triggers. Se basa en los nombres de tablas y columnas que usa el archivo existente `../supabase-data.js`. No se ejecutó ni se verificó contra PostgreSQL: no hay sesión administrativa de Supabase disponible en esta tarea.

Antes de aplicarlo, revisar el esquema real y la definición de `crear_matricula`, probar en una copia y respaldar. Si existen duplicados, los índices abortan la transacción; el archivo no elimina ni fusiona registros. Los triggers pueden rechazar ediciones de registros antiguos con datos inválidos. El índice único de alumno impide una segunda matrícula incluso en años distintos; el formulario rechaza cualquier NIE existente. No imponer unicidad por nombre y nacimiento: hay homónimos.

La revisión del navegador se puede evadir. La garantía frente a solicitudes simultáneas desde equipos distintos depende de aplicar las restricciones de la base de datos y de que `crear_matricula` sea transaccional. La RPC debe respetar el campo `numeroFicha` enviado y propagar las violaciones del índice único para permitir el reintento. No se dispone de su definición para verificar ese comportamiento real.

El sufijo de tres dígitos solicitado permite 1.000 fichas distintas por año (000–999). Al acercarse a esa capacidad aumentarán las colisiones; para más de 1.000 matrículas al año será necesario ampliar el sufijo. El año de la ficha es el año actual de El Salvador más uno; esta regla no modifica por sí sola el año lectivo que calcule la RPC en Supabase.

Los archivos locales no incluyen las políticas RLS, los permisos ni la definición de la función RPC. Queda pendiente auditarlos con acceso a Supabase; este cambio no modifica esos permisos. No se puede afirmar que toda la aplicación esté asegurada solo con estos cambios.

Un número con formato válido puede estar inventado o pertenecer a otra persona. Confirmar titularidad requiere un servicio de códigos SMS/llamada; aquí no existe ese servicio. Tampoco se verifica la propiedad del correo ni la identidad legal de los nombres.

Fuente de prefijos telefónicos: [SIGET, Plan de Numeración 2025](https://www.siget.gob.sv/wp-content/uploads/2025/09/PLAN-DE-NUMERACION-2025.pdf). Se incluyen móviles que comienzan con 5, además de 6 y 7.
