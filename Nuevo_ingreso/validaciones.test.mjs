import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto, errorNombre, errorTelefono, errorCorreo, errorFecha, errorFoto, errorTextoDescriptivo } from './validaciones.mjs';

test('direcciones con referencias urbanas o rurales y texto descriptivo legítimo', () => {
  for (const direccion of ['Col. Las Flores, calle 2, casa #15', 'Cantón El Zapote, junto a la escuela', 'San Salvador, 5ª avenida norte #12', 'Caserío La Paz, frente al parque']) assert.equal(errorTextoDescriptivo(direccion, { direccion: true, maximo: 50 }), '', direccion);
  for (const direccion of ['dwekjndkwjendkjwendkewndnwekjd', 'ewfwef ewfwef', '123456789012', 'Calle', '<script>alert(1)</script>', 'Calle ' + 'a'.repeat(50)]) assert.ok(errorTextoDescriptivo(direccion, { direccion: true, maximo: 50 }), direccion);
  for (const texto of ['Docente', 'Ama de casa', 'ISSS', '3M', 'Sin empleo', 'No aplica', 'Centro Escolar El Zapote']) assert.equal(errorTextoDescriptivo(texto), '', texto);
  for (const texto of ['ewfwef', 'aaaaaaaa', '123456', '<img>']) assert.ok(errorTextoDescriptivo(texto), texto);
});

test('nombres legítimos con acentos, apóstrofos, guiones y apellidos compuestos', () => {
  for (const nombre of ['José', 'María', 'Ávalos', 'Muñoz', 'Güell', 'De la Cruz', "O’Neill", 'Jean-Pierre', 'Ng', 'Llanos']) assert.equal(errorNombre(nombre), '', nombre);
  assert.equal(normalizarTexto('  Jose\u0301   Luis '), 'José Luis');
});
test('rechaza nombres sospechosos, HTML y números sin alterar silenciosamente el dato', () => {
  for (const nombre of ['Adadadkjks', 'Aaaa', 'Abcabcabc', 'José123', '<script>', 'A', 'Ana--María', 'Ewfewf', 'Efwfwef', 'Ewfkjewkj', 'Ewfwef']) assert.ok(errorNombre(nombre), nombre);
  assert.ok(errorNombre('josé'));
  assert.equal(errorNombre('Buenaventura', 12), '');
  assert.ok(errorNombre('Buenaventuraa', 12));
});
test('teléfonos: formato, prefijos actuales, móviles y patrones sospechosos', () => {
  for (const numero of ['2345-6781', '6123-4589', '72345681', '5123-4589']) assert.equal(errorTelefono(numero), '', numero);
  for (const numero of ['12345678', '9999-9999', '7777-7777', '6767-6767', '7123-7123', '7000-0000', '7654-3210', '6123abcd', '612345678']) assert.ok(errorTelefono(numero), numero);
  assert.ok(errorTelefono('2345-6781', true));
  assert.equal(errorTelefono('5123-4589', true), '');
});
test('correos completos y dominios válidos', () => {
  for (const correo of ['ana@gmail.com', 'ana.perez+uno@colegio.edu.sv']) assert.equal(errorCorreo(correo), '');
  for (const correo of ['ANA@gmail.com', 'ana@GMAIL.COM', 'ana@', 'ana@@gmail.com', 'a..b@gmail.com', 'a@-gmail.com', 'a@gmail..com', 'a b@gmail.com']) assert.ok(errorCorreo(correo), correo);
});
test('fechas reales, años bisiestos y límites', () => {
  const hoy = new Date('2026-10-22T12:00:00');
  assert.equal(errorFecha('2012-02-29', hoy), '');
  for (const fecha of ['2011-02-29', '2026-10-23', '1800-01-01', '2020-13-01']) assert.ok(errorFecha(fecha, hoy), fecha);
});
test('fotografías: formato, extensión, tamaño y ausencia', () => {
  assert.equal(errorFoto({ type: 'image/png', name: 'foto.png', size: 100 }), '');
  for (const foto of [null, { type: 'image/svg+xml', name: 'x.svg', size: 20 }, { type: 'image/png', name: 'foto.exe', size: 100 }, { type: 'image/jpeg', name: 'foto.jpg', size: 3000000 }]) assert.ok(errorFoto(foto));
});
