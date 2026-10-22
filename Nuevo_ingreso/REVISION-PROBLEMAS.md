# Revisión de problemas y mejoras posibles

## Corregido en esta revisión

- La dirección solo exigía texto y tenía un máximo de 30 caracteres. Ahora exige de 10 a 50 caracteres, dos palabras con contenido alfabético y texto sin etiquetas ni secuencias sospechosas. Acepta direcciones rurales sin exigir número de casa.
- Los teléfonos mostraban error al escribir letras, pero las dejaban dentro del campo. Ahora se bloquean al escribir, se rechaza pegar texto con letras y se normaliza la entrada. Se conserva el formato automático `0000-0000`, el límite de ocho dígitos y las reglas de prefijos.
- Ocupación, lugar de trabajo y colegio anterior solo exigían contenido: se añadieron controles de texto descriptivo y de secuencias sospechosas.

## Hallazgos pendientes

1. **Una especialidad guarda un valor incorrecto.** En `nuevo_ingreso.html`, la opción «Administrativo Contable (Segundos y Terceros)» tiene `value="Servicios Turísticos"`. Seleccionarla envía el mismo valor que Turismo y pierde la distinción. Conviene confirmar el catálogo institucional y corregir ese valor, incluyendo cómo se identificarán los registros ya afectados. No se modificó el catálogo en esta revisión.

2. **Las ediciones administrativas pueden guardarse parcialmente.** `../supabase-data.js`, función `actualizarMatricula`, envía actualizaciones independientes a varias tablas mediante `Promise.all`. Detectar un error al final no revierte las tablas que ya guardaron. Conviene mover esa operación a una función PostgreSQL transaccional. No se modificó esa operación compartida en esta revisión.

3. **La protección de base de datos sigue pendiente de verificación.** No están disponibles el esquema, las políticas RLS ni la definición de `crear_matricula`. Falta aplicar y probar los índices únicos y reglas del SQL preparado previamente, revisar permisos y ampliar la validación del servidor a dirección, ocupación, trabajo y colegio. El navegador puede eludirse mediante solicitudes directas. También hay que confirmar que la columna de dirección admita 50 caracteres y los nombres de estudiante 12. No se afirma que exista acceso no autorizado: los archivos no permiten comprobar las políticas reales.

4. **Las consultas pueden dejar el formulario esperando.** La consulta de NIE, la obtención de ficha y el guardado no tienen un tiempo máximo en este flujo. Si una petición no termina, el usuario puede quedarse esperando, y durante el guardado el formulario permanece inerte. Conviene agregar tiempos máximos y un mecanismo de consulta del resultado antes de reintentar un guardado: una respuesta perdida no significa necesariamente que no se haya guardado.

5. **Detectar texto sospechoso tiene límites.** Las reglas pueden rechazar nombres poco comunes o aceptar texto inventado que parezca normal. Una dirección no se verifica con solo un patrón; tampoco se confirma la propiedad de teléfonos, correos o documentos. Conviene incorporar revisión administrativa y, si se necesita comprobar contacto, verificación por SMS/correo. Los teléfonos compartidos entre familiares no deben convertirse en una restricción única.

## Verificación

Pruebas unitarias y navegador local con Supabase simulado. Cubren direcciones urbanas y rurales, las secuencias de las capturas, escritura, pegado y edición de los cinco teléfonos, y conservan las pruebas previas de avance entre pasos, alertas, guardado y doble envío. No se escribieron datos en Supabase real ni se probaron cambios en políticas o funciones de PostgreSQL.
