-- Pendiente de ejecutar en Supabase después de revisar el esquema y respaldar.
-- No borra ni fusiona registros. Si ya hay duplicados, la transacción falla completa.
-- Complementa crear_matricula sin sustituir su función ni cambiar permisos/RLS.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS alumnos_nie_normalizado_unico
  ON public.alumnos ((btrim(nie::text)));
CREATE UNIQUE INDEX IF NOT EXISTS alumnos_dui_normalizado_unico
  ON public.alumnos ((regexp_replace(dui::text, '[^0-9]', '', 'g')))
  WHERE nullif(btrim(dui::text), '') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS matricula_alumno_anio_unico
  ON public.matriculas (alumno_id, anio_lectivo);
-- Una sola matrícula en toda la vida del alumno, según la regla solicitada.
-- También evita otra matrícula en otro año para el mismo NIE ya asociado a un alumno.
CREATE UNIQUE INDEX IF NOT EXISTS matricula_alumno_unico
  ON public.matriculas (alumno_id);
CREATE UNIQUE INDEX IF NOT EXISTS matricula_ficha_unica
  ON public.matriculas (numero_ficha);

CREATE OR REPLACE FUNCTION public.validar_calidad_ingreso()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  datos jsonb := to_jsonb(NEW);
  campo text;
  valor text;
  numero text;
  parte text;
BEGIN
  -- Columnas obtenidas del mapeo existente en supabase-data.js.
  FOR campo, valor IN SELECT key, value FROM jsonb_each_text(datos) LOOP
    IF valor IS NULL OR btrim(valor) = '' THEN CONTINUE; END IF;
    IF campo = ANY(ARRAY['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','nombre','madre_nombre','padre_nombre']) THEN
      valor := regexp_replace(btrim(valor), '[[:space:]]+', ' ', 'g');
      IF char_length(valor) NOT BETWEEN 2 AND 50
         OR valor !~ '^[[:alpha:]]+([ ''’\-][[:alpha:]]+)*$' THEN
        RAISE EXCEPTION 'Nombre o apellido inválido: %', campo USING ERRCODE = '23514';
      END IF;
      IF campo = ANY(ARRAY['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido']) AND char_length(valor) > 12 THEN
        RAISE EXCEPTION 'Máximo 12 caracteres: %', campo USING ERRCODE = '23514';
      END IF;
      IF left(valor, 1) <> upper(left(valor, 1)) THEN
        RAISE EXCEPTION 'El nombre debe comenzar con mayúscula: %', campo USING ERRCODE = '23514';
      END IF;
      FOREACH parte IN ARRAY regexp_split_to_array(lower(translate(valor, 'áéíóúü', 'aeiouu')), '[ ''’\-]+') LOOP
        IF parte ~ '(.)\1{3,}' OR parte ~ '^(.{1,3})\1{2,}$' OR parte ~ '[bcdfghjklmnpqrstvwxyz]{5,}' OR parte ~ 'fw|wf|wj|wk|kj|jk|fj|jf|qx|wq|qj|qk|kq|zx|xz|xq|vx|asdf|qwer|zxcv' THEN
          RAISE EXCEPTION 'Nombre sospechoso: %', campo USING ERRCODE = '23514';
        END IF;
      END LOOP;
    ELSIF campo = ANY(ARRAY['telefono','whatsapp','madre_celular','padre_celular']) THEN
      numero := replace(valor, '-', '');
      IF valor !~ '^[2567][0-9]{3}-?[0-9]{4}$'
        OR (campo <> 'telefono' AND numero !~ '^[567]')
        OR numero ~ '^(.)\1{7}$' OR numero ~ '^(.{2})\1{3}$'
        OR numero ~ '^(.{4})\1$' OR numero ~ '(.)\1{5,}'
        OR position(numero IN '0123456789') > 0 OR position(numero IN '9876543210') > 0 THEN
        RAISE EXCEPTION 'Teléfono inválido o sospechoso: %', campo USING ERRCODE = '23514';
      END IF;
    ELSIF campo = ANY(ARRAY['correo','correo_personal','correo_estudiantil']) THEN
      IF valor <> lower(valor) OR char_length(valor) > 254 OR valor !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$'
        OR valor LIKE '%..%' THEN
        RAISE EXCEPTION 'Correo inválido: %', campo USING ERRCODE = '23514';
      END IF;
    ELSIF campo = ANY(ARRAY['dui','madre_dui','padre_dui']) THEN
      IF valor !~ '^[0-9]{8}-[0-9]$' OR valor ~ '^(.)\1{7}-\1$' THEN
        RAISE EXCEPTION 'DUI inválido: %', campo USING ERRCODE = '23514';
      END IF;
    ELSIF campo = 'fecha_nacimiento' THEN
      IF valor::date > current_date OR valor::date < (current_date - interval '120 years')::date THEN
        RAISE EXCEPTION 'Fecha de nacimiento inválida' USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;
  IF TG_TABLE_NAME = 'alumnos' THEN
    IF coalesce(datos->>'nie', '') !~ '^[0-9]{1,12}$' OR datos->>'nie' ~ '^0+$' THEN
      RAISE EXCEPTION 'NIE inválido' USING ERRCODE = '23514';
    END IF;
    FOREACH campo IN ARRAY ARRAY['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','fecha_nacimiento','telefono','correo_personal','correo_estudiantil'] LOOP
      IF nullif(btrim(datos->>campo), '') IS NULL THEN
        RAISE EXCEPTION 'Campo obligatorio: %', campo USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF datos->>'correo_estudiantil' <> (datos->>'nie') || '@clases.edu.sv' THEN
      RAISE EXCEPTION 'Correo estudiantil no corresponde al NIE' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_calidad_ingreso ON public.alumnos;
CREATE TRIGGER validar_calidad_ingreso BEFORE INSERT OR UPDATE ON public.alumnos
  FOR EACH ROW EXECUTE FUNCTION public.validar_calidad_ingreso();
DROP TRIGGER IF EXISTS validar_calidad_ingreso ON public.padres;
CREATE TRIGGER validar_calidad_ingreso BEFORE INSERT OR UPDATE ON public.padres
  FOR EACH ROW EXECUTE FUNCTION public.validar_calidad_ingreso();
DROP TRIGGER IF EXISTS validar_calidad_ingreso ON public.responsables;
CREATE TRIGGER validar_calidad_ingreso BEFORE INSERT OR UPDATE ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.validar_calidad_ingreso();

COMMIT;
