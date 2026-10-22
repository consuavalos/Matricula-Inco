import test from 'node:test';
import assert from 'node:assert/strict';
import { crearFichaAleatoria, anioLectivoSiguiente, fichaDelAnioSiguiente } from './ficha-aleatoria.mjs';

test('la ficha corresponde al año siguiente, desde 2027 en 2026', () => {
  const ahora = new Date('2026-10-22T12:00:00Z');
  const ficha = crearFichaAleatoria(ahora);
  assert.match(ficha, /^FIC-2027-\d{3}$/);
  assert.ok(fichaDelAnioSiguiente(ficha, ahora));
  assert.equal(fichaDelAnioSiguiente('FIC-2026-026', ahora), false);
  assert.equal(anioLectivoSiguiente(new Date('2027-01-01T05:59:59Z')), 2027);
  assert.equal(anioLectivoSiguiente(new Date('2027-01-01T06:00:00Z')), 2028);
});
