// Pruebas locales con un servidor Supabase simulado: nunca escribe datos reales.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const runtime = process.env.CODEX_NODE_MODULES || 'C:/Users/28913/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = createRequire(path.join(runtime, 'playwright', 'package.json'))('playwright');

test('regresión de ambos formularios y guardado con Supabase simulado', async () => {
  const servidor = http.createServer((req, res) => {
    const nombre = decodeURIComponent(req.url.split('?')[0]);
    if (nombre === '/salida' || nombre === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end('<p>Inicio</p>'); }
    if (nombre === '/supabase-data.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(`export async function obtenerSiguienteFicha(){return 'FIC-2026-001';}
        export async function nieYaExiste(){await new Promise(r=>setTimeout(r,40));if(window.fallaNie)throw Error('offline');return !!window.duplicado;}
        export async function crearMatricula(p){window.envios=(window.envios||0)+1;window.datos=p;(window.fichasIntentadas||=[]).push(p.numeroFicha);await new Promise(r=>setTimeout(r,80));if(window.fallaGuardar)throw {code:'23514'};if(window.colisionFicha){window.colisionFicha=false;throw {code:'23505',message:'matricula_ficha_unica'};}return {id:'simulado'};}`);
    }
    const archivo = path.resolve(__dirname, '..', '.' + nombre);
    if (!archivo.startsWith(__dirname + path.sep) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', /\.(m?js)$/.test(archivo) ? 'text/javascript' : archivo.endsWith('.css') ? 'text/css' : 'text/html');
    let contenido = fs.readFileSync(archivo);
    if (archivo.endsWith('nuevo_ingreso.js')) contenido = contenido.toString() + '\nwindow.pruebas={validarCampo,validarPaso,mostrarPaso,mostrarComprobanteMatricula,verificarNieDuplicado};';
    res.end(contenido);
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    for (const html of ['nuevo_ingreso.html', 'FORMULARIO.html']) {
      const page = await browser.newPage();
      const errores = [];
      const alertas = [];
      page.on('pageerror', error => errores.push(error.message));
      page.on('dialog', dialog => { alertas.push(dialog.message()); return dialog.dismiss(); });
      await page.route('https://**/*', route => route.abort());
      await page.goto(`http://127.0.0.1:${servidor.address().port}/Nuevo_ingreso/${html}`);
      await page.waitForFunction(() => window.pruebas && document.getElementById('numeroFicha').value && document.getElementById('matriculaForm').dataset.borradorListo === 'true');
      assert.deepEqual(await page.locator('select').evaluateAll(selects => selects.map(el => el.value)), await page.locator('select').evaluateAll(selects => selects.map(() => '')), 'las preguntas deben seguir visibles inicialmente sin autoseleccionar respuestas');
      for (const oscuro of [false, true]) {
        if (await page.evaluate(() => document.body.classList.contains('tema-oscuro')) !== oscuro) await page.locator('#btnTema').click();
        const tema = await page.evaluate(() => {
          const p = window.pruebas;
          document.getElementById('grado').value = 'Segundo Año';
          document.getElementById('tipoIngreso').value = 'Nuevo ingreso';
          p.mostrarPaso(6);
          const luminancia = color => {
            const canales = color.match(/[\d.]+/g).slice(0,3).map(Number).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
            return canales[0]*.2126 + canales[1]*.7152 + canales[2]*.0722;
          };
          const contraste = el => {
            let fondo = el;
            while (fondo.parentElement && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(fondo).backgroundColor)) fondo = fondo.parentElement;
            const a = luminancia(getComputedStyle(el).color), b = luminancia(getComputedStyle(fondo).backgroundColor);
            return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          };
          const nombres = document.getElementById('primerNombre');
          nombres.value = 'Ewfwef';
          const nombreInvalido = !p.validarCampo(nombres, true);
          const nie = document.getElementById('nie');
          nie.value = '1234567890123';
          const nieInvalido = !p.validarCampo(nie, true);
          const correo = document.getElementById('correoPersonal');
          correo.value = 'correo-invalido';
          const correoInvalido = !p.validarCampo(correo, true);
          return {
            contraste: ['#bloqueDocumentacion li', '#bloqueDocumentacion h4', '.documentacion-etiqueta', '#primerNombre + .error-mensaje', '#estadoBorrador'].map(selector => [selector, contraste(document.querySelector(selector))]),
            nombreInvalido, nieInvalido, correoInvalido,
            limiteDireccion: document.getElementById('direccionResidencia').maxLength,
            preguntasBloqueadas: Array.from(document.querySelectorAll('select option[value=""]')).every(o => o.disabled)
          };
        });
        for (const [selector, contraste] of tema.contraste) assert.ok(contraste >= 4.5, `${html} ${oscuro ? 'oscuro' : 'claro'} ${selector}: contraste ${contraste}`);
        assert.ok(tema.nombreInvalido && tema.nieInvalido && tema.correoInvalido && tema.preguntasBloqueadas);
        assert.equal(tema.limiteDireccion, 50);
        await page.locator('#bloqueDocumentacion').screenshot({ path:require('node:os').tmpdir() + `/matricula-documentacion-${html}-${oscuro ? 'oscuro' : 'claro'}.png` });
      }
      // El resto del flujo se prueba completo en oscuro en una página y claro en la otra.
      if (html === 'FORMULARIO.html') await page.locator('#btnTema').click();
      await page.evaluate(() => window.pruebas.mostrarPaso(1));
      await page.locator('#telefonoEstudiante').pressSequentially('ab67324982!?');
      assert.equal(await page.locator('#telefonoEstudiante').inputValue(), '6732-4982', 'solo entran dígitos y el guion es automático');
      await page.locator('#telefonoEstudiante').evaluate(el => el.setSelectionRange(2, 3));
      await page.locator('#telefonoEstudiante').pressSequentially('9');
      assert.equal(await page.locator('#telefonoEstudiante').inputValue(), '6792-4982', 'se puede corregir una cifra intermedia');
      const telefonos = await page.evaluate(() => {
        return ['telefonoEstudiante','telefonoResponsable','whatsappResponsable','madreCelular','padreCelular'].map(id => {
          const el = document.getElementById(id);
          el.value = '';
          const bloqueaLetra = !el.dispatchEvent(new InputEvent('beforeinput', { inputType:'insertText', data:'a', cancelable:true, bubbles:true }));
          const pegar = texto => { const datos = new DataTransfer(); datos.setData('text/plain', texto); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData:datos, cancelable:true, bubbles:true })); };
          pegar('6732-4982');
          const formatoPegado = el.value;
          pegar('abc123');
          const conservaValor = el.value === formatoPegado;
          el.value = '67a32b49';
          el.dispatchEvent(new Event('input', { bubbles:true }));
          return { bloqueaLetra, formatoPegado, conservaValor, limpiaAutofill:el.value === '6732-49', teclado:el.inputMode };
        });
      });
      assert.deepEqual(telefonos, Array(5).fill({ bloqueaLetra:true, formatoPegado:'6732-4982', conservaValor:true, limpiaAutofill:true, teclado:'numeric' }));
      const direcciones = await page.evaluate(() => {
        window.pruebas.mostrarPaso(3);
        const el = document.getElementById('direccionResidencia');
        const resultado = ['dwekjndkwjendkjwendkewndnwekjd', 'ewfwef ewfwef', '123456789012', 'Cantón El Zapote, junto a la escuela', 'Col. Las Flores, calle 2, casa #15'].map(texto => { el.value = texto; return window.pruebas.validarCampo(el); });
        window.pruebas.mostrarPaso(5);
        const trabajo = document.getElementById('padreLugarTrabajo');
        trabajo.value = 'ewfwef';
        const basura = window.pruebas.validarCampo(trabajo);
        trabajo.value = 'ISSS';
        const sigla = window.pruebas.validarCampo(trabajo);
        window.pruebas.mostrarPaso(1);
        return { resultado, basura, sigla };
      });
      assert.deepEqual(direcciones, { resultado:[false,false,false,true,true], basura:false, sigla:true });
      assert.equal(await page.locator('#direccionResidencia').getAttribute('maxlength'), '50');
      assert.equal(await page.evaluate(() => {
        const campo = document.getElementById('direccionResidencia');
        campo.value = 'Calle Las Flores, casa 123, San Salvador, zona norte.';
        return window.pruebas.validarCampo(campo, true);
      }), false, 'rechaza direcciones de más de 50 caracteres incluso asignadas por código');
      // Regresión del bloqueo de la captura: primer paso válido con hermanos incompletos en otro paso.
      for (const [id, valor] of Object.entries({ nie:'632478263746', duiEstudiante:'45444533-3', primerApellido:'Avalos', segundoApellido:'Cordero', primerNombre:'Manuel', segundoNombre:'Antonio', lugarNacimiento:'San Salvador - San Salvador Centro', fechaNacimiento:'2009-11-14', telefonoEstudiante:'2387-2987', correoPersonal:'manuel@gmail.com' })) {
        await page.locator(`#${id}`).fill(valor);
      }
      await page.locator('#grado').selectOption('Primer Año');
      await page.locator('#sexo').selectOption('Masculino');
      await page.locator('#fotoEstudiante').setInputFiles({ name:'foto.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMukAAAAASUVORK5CYII=', 'base64') });
      await page.waitForFunction(() => document.getElementById('fotoEstudiante').dataset.estadoFoto === 'lista');
      await page.evaluate(() => { const hermanos = document.getElementById('hermanosCentroeducativo'); hermanos.value = 'Sí'; hermanos.dispatchEvent(new Event('change')); });
      const inicioAlertas = alertas.length;
      await page.locator('#btnSiguiente').click();
      await page.waitForFunction(() => document.querySelector('.form-step.activo').dataset.step === '2');
      assert.equal(alertas.length, inicioAlertas, 'el paso 1 no debe bloquearse por hermanos de otro paso');
      assert.equal(await page.evaluate(() => window.pruebas.validarPaso(2)), false, 'los hermanos incompletos sí se validan en estudios');
      await page.locator('#btnAnterior').click();
      await page.locator('#primerNombre').fill('');
      await page.locator('#btnSiguiente').click();
      assert.ok(alertas.at(-1).includes('Primer nombre:'), 'la alerta identifica el campo que impide avanzar');
      assert.equal(await page.locator('#nie').getAttribute('aria-invalid'), null, 'los campos ocultos no borran ni crean errores ajenos');
      await page.locator('#primerNombre').fill('Manuel');
      await page.evaluate(() => {
        window.pruebas.mostrarPaso(2);
        document.querySelector('.hermano-nombre').value = 'Carlos Avalos';
        document.querySelector('.hermano-nombre').dispatchEvent(new Event('input', { bubbles:true }));
        document.querySelector('.hermano-grado').value = 'Primer Año';
        document.querySelector('.hermano-grado').dispatchEvent(new Event('change', { bubbles:true }));
      });
      await page.reload();
      await page.waitForFunction(() => window.pruebas && document.getElementById('matriculaForm').dataset.borradorListo === 'true');
      assert.equal(await page.locator('#primerNombre').inputValue(), 'Manuel', 'recupera el texto al recargar');
      assert.equal(await page.locator('.form-step.activo').getAttribute('data-step'), '2', 'recupera el paso');
      assert.equal(await page.locator('.hermano-nombre').inputValue(), 'Carlos Avalos', 'recupera hermanos');
      assert.equal(await page.locator('#fotoEstudiante').getAttribute('data-estado-foto'), 'lista', 'recupera y vuelve a validar la foto');
      // Volver desde otra página conserva el mismo borrador, sin enviar al servidor.
      const retorno = page.url();
      await page.goto(`http://127.0.0.1:${servidor.address().port}/salida`);
      await page.goto(retorno);
      await page.waitForFunction(() => document.getElementById('matriculaForm').dataset.borradorListo === 'true');
      assert.equal(await page.locator('#nie').inputValue(), '632478263746');
      assert.equal(await page.locator('#fotoEstudiante').getAttribute('data-estado-foto'), 'lista');
      await page.evaluate(() => window.pruebas.mostrarPaso(1));
      await page.locator('#correoPersonal').fill('ANA.PEREZ@EXAMPLE.COM');
      assert.equal(await page.locator('#correoPersonal').inputValue(), 'ana.perez@example.com');
      await page.locator('#primerNombre').fill('josé');
      assert.equal(await page.locator('#primerNombre').inputValue(), 'José');
      const reglas = await page.evaluate(() => {
        const campos = ['primerNombre','segundoNombre','primerApellido','segundoApellido'].map(id => document.getElementById(id));
        const nie = document.getElementById('nie');
        const longitudes = [1,6,7,8,9,10,11,12,13].map(n => { nie.value = '1'.repeat(n); return window.pruebas.validarCampo(nie); });
        return {
          maximos: campos.map(el => el.maxLength),
          preguntasDeshabilitadas: Array.from(document.querySelectorAll('select option[value=""]')).every(el => el.disabled),
          longitudes,
          basuras: ['Ewfewf','Efwfwef','Ewfkjewkj','Ewfwef'].map(valor => { campos[0].value = valor; return window.pruebas.validarCampo(campos[0]); })
        };
      });
      assert.deepEqual(reglas, { maximos:[12,12,12,12], preguntasDeshabilitadas:true, longitudes:[true,true,true,true,true,true,true,true,false], basuras:[false,false,false,false] });
      assert.equal(await page.getByRole('button', { name:'Borrar borrador y empezar de nuevo' }).count(), 0);
      assert.equal(await page.locator('#madreOcupacion').getAttribute('list'), 'ocupacionesComunes');
      assert.equal(await page.locator('#padreOcupacion').getAttribute('list'), 'ocupacionesComunes');
      assert.ok(await page.locator('#ocupacionesComunes option[value="Cocinero"]').count());
      await page.evaluate(() => document.getElementById('matriculaForm').requestSubmit());
      assert.equal(await page.evaluate(() => window.envios || 0), 0, 'un formulario vacío no llega al servidor');
      const resultados = await page.evaluate(async () => {
        const p = window.pruebas;
        const campo = document.getElementById('primerNombre');
        campo.value = 'adadadkjks';
        const basura = p.validarCampo(campo);
        campo.value = 'José';
        const legitimo = p.validarCampo(campo);
        p.mostrarPaso(6);
        campo.value = '';
        const oculto = p.validarPaso(1, true);
        const inaplicable = document.getElementById('conQuienViveOtro');
        const condicional = p.validarCampo(inaplicable, true);
        p.mostrarComprobanteMatricula({ primerNombre: '<img src=x onerror=alert(1)>', numeroFicha: '<script>bad</script>' });
        const htmlSeguro = !document.querySelector('#datosComprobante img, #datosComprobante script');
        document.getElementById('nie').value = '123456789';
        window.fallaNie = true;
        const sinConexion = await p.verificarNieDuplicado();
        window.fallaNie = false;
        window.duplicado = true;
        const duplicado = await p.verificarNieDuplicado();
        window.duplicado = false;
        await p.verificarNieDuplicado();
        return { basura, legitimo, oculto, condicional, htmlSeguro, sinConexion, duplicado };
      });
      assert.deepEqual(resultados, { basura: false, legitimo: true, oculto: false, condicional: true, htmlSeguro: true, sinConexion: false, duplicado: false }, html);
      // Completar controles reales de todos los pasos, manteniendo las reglas académicas.
      await page.evaluate(() => {
        document.querySelectorAll('select').forEach(el => {
          const opcion = Array.from(el.options).find(o => o.value && !o.disabled);
          if (opcion) { el.value = opcion.value; el.dispatchEvent(new Event('change')); }
        });
        const valores = { nie: '123456789012', primerNombre: 'José', segundoNombre: 'Luis', primerApellido: 'Pérez', segundoApellido: 'Güell', fechaNacimiento: '2010-01-15', correoPersonal: 'JOSE@OUTLOOK.COM', correoResponsable: 'ANA@YAHOO.COM', responsable: 'Ana Pérez', madreNombre: 'Ana Pérez', padreNombre: 'Juan López', ultimoAnioAprobado: 'Noveno Grado', hermanosCentroeducativo: 'No', enfermedad: 'No', tipoIngreso: 'Nuevo ingreso' };
        document.querySelectorAll('input, textarea').forEach(el => {
          if (el.type === 'text' || el.tagName === 'TEXTAREA') el.value = 'Información válida';
          if (el.type === 'number' && !el.readOnly) el.value = '1';
          if (el.type === 'tel') el.value = el.id.toLowerCase().includes('dui') ? '01234567-8' : '7123-4589';
        });
        document.querySelectorAll('[id*="Dui"], #duiEstudiante, #duiResponsable').forEach(el => el.value = '01234567-8');
        Object.entries(valores).forEach(([id, value]) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change')); });
        document.getElementById('correoEstudiantil').value = '123456789012@clases.edu.sv';
        document.getElementById('distanciaKm').value = '1';
        document.getElementById('direccionResidencia').value = 'Cantón El Zapote, junto a la escuela';
        document.getElementById('madreOcupacion').value = 'Cocinero';
        document.getElementById('padreOcupacion').value = 'Técnico de refrigeración';
        for (const id of ['partidaNumero', 'folio', 'tomo', 'libro']) { const el = document.getElementById(id); if (el) el.value = '123'; }
        window.pruebas.mostrarPaso(1);
      });
      await page.locator('#lugarNacimiento').fill('San Salvador');
      await page.locator('#lugarNacimiento').dispatchEvent('input');
      // El buscador se prueba con una selección auténtica de su catálogo.
      const sugerencias = await page.locator('#lugarNacimiento').evaluate(el => el.parentElement.outerHTML);
      assert.ok(sugerencias.includes('San Salvador'));
      await page.evaluate(() => {
        const el = document.getElementById('lugarNacimiento');
        const opcion = el.parentElement.querySelector('.item-sugerencia');
        if (opcion) opcion.click();
      });
      await page.locator('#fotoEstudiante').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMukAAAAASUVORK5CYII=', 'base64') });
      await page.waitForFunction(() => document.getElementById('fotoEstudiante').dataset.estadoFoto === 'lista');
      const invalidos = await page.evaluate(() => {
        for(let i=1;i<=6;i++) window.pruebas.validarPaso(i,true);
        return Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(el => [el.id, el.value, el.closest('.campo')?.querySelector('.error-mensaje')?.textContent]);
      });
      assert.deepEqual(invalidos, [], JSON.stringify(invalidos));
      await page.evaluate(() => { window.fallaNie = true; document.getElementById('matriculaForm').requestSubmit(); });
      await page.waitForFunction(() => !document.getElementById('matriculaForm').hasAttribute('aria-busy'));
      assert.equal(await page.evaluate(() => window.envios || 0), 0, 'sin verificar el NIE no se envía');
      await page.evaluate(() => { window.fallaNie = false; window.fallaGuardar = true; document.getElementById('matriculaForm').requestSubmit(); });
      await page.waitForFunction(() => window.envios === 1 && !document.getElementById('matriculaForm').hasAttribute('aria-busy'));
      assert.equal(await page.locator('#btnGuardar').isEnabled(), true, 'el fallo permite corregir y reintentar');
      assert.ok(await page.evaluate(() => localStorage.getItem('matricula.borrador.v1')), 'un error de guardado conserva el borrador');
      await page.evaluate(() => { window.fallaGuardar = false; window.colisionFicha = true; });
      await page.evaluate(() => { document.getElementById('matriculaForm').requestSubmit(); document.getElementById('matriculaForm').requestSubmit(); });
      await page.waitForFunction(() => window.envios === 3 && document.getElementById('matriculaForm').hidden);
      assert.equal(await page.evaluate(() => window.fichasIntentadas[1] !== window.fichasIntentadas[2]), true, 'reintenta una colisión de ficha con otro número');
      assert.equal(await page.evaluate(() => window.datos.correoEstudiantil), '123456789012@clases.edu.sv');
      assert.equal(await page.evaluate(() => window.datos.nie), '123456789012');
      assert.match(await page.evaluate(() => window.datos.numeroFicha), /^FIC-\d{4}-\d{3}$/);
      assert.equal(await page.evaluate(() => window.datos.padreOcupacion), 'Técnico de refrigeración');
      assert.equal(await page.evaluate(() => window.datos.correoPersonal), 'jose@outlook.com');
      assert.equal(await page.evaluate(() => window.datos.correoResponsable), 'ana@yahoo.com');
      assert.equal(await page.evaluate(() => localStorage.getItem('matricula.borrador.v1')), null, 'el guardado confirmado elimina el borrador');
      assert.deepEqual(await page.evaluate(() => new Promise((resolve, reject) => {
        const peticion = indexedDB.open('matricula-borrador', 1);
        peticion.onerror = () => reject(peticion.error);
        peticion.onsuccess = () => { const db = peticion.result; const consulta = db.transaction('fotos').objectStore('fotos').getAllKeys(); consulta.onsuccess = () => { resolve(consulta.result); db.close(); }; };
      })), [], 'el guardado confirmado elimina también la fotografía local');
      assert.equal(await page.evaluate(() => window.datos.madreNombre), 'Ana Pérez');
      assert.deepEqual(errores, [], html);
      await page.getByRole('button', { name:/volver al inicio/i }).click();
      await page.waitForURL('**/index.html');
      assert.equal(await page.evaluate(() => localStorage.getItem('matricula.borrador.v1')), null, 'volver al inicio no conserva datos del formulario terminado');
      await page.close();
    }
  } finally { await browser?.close(); await new Promise(r => servidor.close(r)); }
});
