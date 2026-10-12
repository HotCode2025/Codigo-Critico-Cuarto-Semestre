-- Verificación de email al registrarse.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa.
-- Es compatible con el backend viejo: solo agrega columnas con valor por defecto.
--
-- Las cuentas que ya existen se dan por verificadas (el UPDATE de abajo); si no, quedarían
-- sin avisos por email ni WhatsApp hasta confirmar un email que nunca se les pidió.
-- Correr este UPDATE antes de que se registre alguien con el backend nuevo: después de eso
-- marcaría como verificada una cuenta que todavía no confirmó.

ALTER TABLE productores ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE productores ADD COLUMN IF NOT EXISTS verificacion_token_hash VARCHAR(64);
ALTER TABLE productores ADD COLUMN IF NOT EXISTS verificacion_token_expira TIMESTAMPTZ;

UPDATE productores SET email_verificado = true WHERE email_verificado = false;
