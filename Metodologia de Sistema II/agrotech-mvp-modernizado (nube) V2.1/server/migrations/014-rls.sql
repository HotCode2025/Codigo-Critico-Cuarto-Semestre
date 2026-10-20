-- Cierra la API pública de Supabase (PostgREST) sobre las tablas de AgroTech.
--
-- Supabase expone cada tabla del esquema public por su API REST a los roles `anon` y `authenticated`.
-- Sin Row Level Security (RLS), cualquiera con la URL del proyecto y la clave anon podía leer,
-- modificar y borrar todos los datos (aviso de Supabase "rls_disabled_in_public", 17/10/2026).
--
-- AgroTech no usa esa API: el backend se conecta directo a Postgres con el usuario `postgres`, que
-- tiene BYPASSRLS, así que activar RLS sin políticas no le cambia nada. Para la API pública, una tabla
-- con RLS y sin políticas no devuelve ni acepta filas. Además se quitan los permisos de anon y
-- authenticated, también para las tablas que se creen después.
--
-- Correr UNA vez en Supabase (SQL Editor), después de la 013. No toca datos.
-- En un Postgres local (docker compose, tests) no existen anon ni authenticated: esa parte se saltea.
-- Toda tabla nueva lleva su "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" en su migración.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    -- Las tablas, secuencias y funciones que cree postgres de ahora en más tampoco se les dan.
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
