SET local check_function_bodies = off;

CREATE SEQUENCE "public"."chat_seguimiento_idmensaje_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."cita_idcita_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."cliente_idcliente_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."cotizacion_idcotizacion_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."empleado_idempleado_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."empresa_idempresa_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."horario_base_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."horas_disponibles_idhora_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."metodos_pagos_idmetodo_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."notificacion_idnotificacion_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."observaciones_idobserva_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."pago_idpago_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."politica_idpolitica_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."precio_tamano_idtamano_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."roles_idrol_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."seguimiento_idseguimiento_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."status_cita_idstatus_cita_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."status_cotizacion_idstatus_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."tatuador_idtatuador_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."tecnicas_idtecnica_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."tipo_cita_idtipo_cita_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE "public"."chat_seguimiento" (
  "idmensaje"     integer                     NOT NULL DEFAULT nextval('public.chat_seguimiento_idmensaje_seq'::regclass),
  "idtipo_emisor" integer,
  "idseguimiento" integer,
  "idemisor"      integer,
  "mensaje"       text,
  "fecha_envio"   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_seguimiento_pkey" PRIMARY KEY (idmensaje)
);

ALTER TABLE "public"."chat_seguimiento"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cita" (
  "idcita"               integer                NOT NULL DEFAULT nextval('public.cita_idcita_seq'::regclass),
  "idtipo_cita"          integer,
  "idstatus_cita"        integer,
  "idcliente"            integer,
  "idtatuador"           integer,
  "fecha"                date,
  "hora"                 time without time zone,
  "zonacuerpo"           character varying(100),
  "tamanio"              character varying(50),
  "foto_referecncia_url" text,
  "descripcion"          text,
  "foto_final_url"       text,
  "idtecnica"            integer,
  CONSTRAINT "cita_pkey" PRIMARY KEY (idcita)
);

ALTER TABLE "public"."cita"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cliente_en_empresa" (
  "idempresa" integer                     NOT NULL,
  "idcliente" integer                     NOT NULL,
  "fecha"     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cliente_en_empresa_pkey" PRIMARY KEY (idempresa, idcliente)
);

ALTER TABLE "public"."cliente_en_empresa"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cliente" (
  "idcliente"        integer                NOT NULL DEFAULT nextval('public.cliente_idcliente_seq'::regclass),
  "nombre"           character varying(100),
  "apellido_paterno" character varying(100),
  "apellido_materno" character varying(100),
  "correo"           character varying(100),
  "contrasenia"      character varying(255),
  "fecha_nacimiento" date,
  "telefono"         character varying(20),
  "user_id"          uuid,
  CONSTRAINT "cliente_correo_key" UNIQUE (correo),
  CONSTRAINT "cliente_pkey" PRIMARY KEY (idcliente)
);

ALTER TABLE "public"."cliente"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cotizacion" (
  "idcotizacion"         integer                  NOT NULL DEFAULT nextval('public.cotizacion_idcotizacion_seq'::regclass),
  "idstatus"             integer,
  "idcita"               integer,
  "montoestimado"        numeric(10,2),
  "preciofinal"          numeric(10,2),
  "justificacion_ajuste" text,
  "fecha_cotizacion"     timestamp with time zone,
  "stripe_session_id"    text,
  CONSTRAINT "cotizacion_pkey" PRIMARY KEY (idcotizacion)
);

ALTER TABLE "public"."cotizacion"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."empleado" (
  "idempleado"       integer                NOT NULL DEFAULT nextval('public.empleado_idempleado_seq'::regclass),
  "idempresa"        integer,
  "idrol"            integer,
  "nombre"           character varying(150),
  "correo"           character varying(100),
  "contrasenia"      character varying(255),
  "fecha_nacimiento" date,
  "foto_url"         text,
  "telefono"         character varying(20),
  "user_id"          text,
  CONSTRAINT "empleado_correo_key" UNIQUE (correo),
  CONSTRAINT "empleado_pkey" PRIMARY KEY (idempleado)
);

ALTER TABLE "public"."empleado"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."empresa" (
  "idempresa"    integer                NOT NULL DEFAULT nextval('public.empresa_idempresa_seq'::regclass),
  "nombre"       character varying(100),
  "telefono"     character varying(20),
  "direccion"    text,
  "ciudad"       text,
  "estado"       text,
  "pais"         text,
  "codigo_url"   text,
  "anticipo_pct" numeric(5,2)           DEFAULT 50,
  CONSTRAINT "empresa_codigo_url_key" UNIQUE (codigo_url),
  CONSTRAINT "empresa_pkey" PRIMARY KEY (idempresa)
);

ALTER TABLE "public"."empresa"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."horario_base" (
  "id"          integer                NOT NULL DEFAULT nextval('public.horario_base_id_seq'::regclass),
  "idtatuador"  integer,
  "dia_semana"  integer                NOT NULL,
  "hora_inicio" time without time zone NOT NULL,
  "hora_fin"    time without time zone NOT NULL,
  "activo"      boolean                DEFAULT true,
  CONSTRAINT "horario_base_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."horario_base"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."horas_disponibles" (
  "idhora"               integer                NOT NULL DEFAULT nextval('public.horas_disponibles_idhora_seq'::regclass),
  "idtatuador"           integer,
  "horainicio"           time without time zone,
  "horafin"              time without time zone,
  "fecha"                date,
  "estadodisponibilidad" boolean                DEFAULT true,
  "dia_semana"           integer,
  "motivo"               text,
  CONSTRAINT "horas_disponibles_pkey" PRIMARY KEY (idhora)
);

ALTER TABLE "public"."horas_disponibles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."metodos_pagos" (
  "idmetodo" integer               NOT NULL DEFAULT nextval('public.metodos_pagos_idmetodo_seq'::regclass),
  "nombre"   character varying(50) NOT NULL,
  CONSTRAINT "metodos_pagos_pkey" PRIMARY KEY (idmetodo)
);

ALTER TABLE "public"."metodos_pagos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notificacion" (
  "idnotificacion" integer                     NOT NULL DEFAULT nextval('public.notificacion_idnotificacion_seq'::regclass),
  "idtipousuario"  integer                     NOT NULL,
  "idusuario"      integer                     NOT NULL,
  "titulo"         character varying(200)      NOT NULL,
  "cuerpo"         text,
  "url_destino"    text,
  "leida"          boolean                     DEFAULT false,
  "fecha_creacion" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notificacion_pkey" PRIMARY KEY (idnotificacion)
);

ALTER TABLE "public"."notificacion"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."observaciones" (
  "idobserva"     integer                  NOT NULL DEFAULT nextval('public.observaciones_idobserva_seq'::regclass),
  "idseguimiento" integer,
  "idcita"        integer,
  "observaciones" text,
  "timestamp"     timestamp with time zone,
  CONSTRAINT "observaciones_pkey" PRIMARY KEY (idobserva)
);

ALTER TABLE "public"."observaciones"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pago" (
  "idpago"                   integer       NOT NULL DEFAULT nextval('public.pago_idpago_seq'::regclass),
  "idmetodo"                 integer,
  "idtipo_pagos"             integer,
  "idcotizacion"             integer,
  "idcita"                   integer,
  "monto"                    numeric(10,2),
  "fecha"                    date          DEFAULT CURRENT_DATE,
  "stripe_payment_intent_id" text,
  CONSTRAINT "pago_pkey" PRIMARY KEY (idpago)
);

ALTER TABLE "public"."pago"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."politica" (
  "idpolitica"     integer                     NOT NULL DEFAULT nextval('public.politica_idpolitica_seq'::regclass),
  "idempresa"      integer,
  "titulo"         character varying(100)      NOT NULL,
  "contenido"      text                        NOT NULL,
  "es_activa"      boolean                     DEFAULT true,
  "fecha_creacion" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "politica_pkey" PRIMARY KEY (idpolitica)
);

ALTER TABLE "public"."politica"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."precio_tamano" (
  "idtamano"  integer               NOT NULL DEFAULT nextval('public.precio_tamano_idtamano_seq'::regclass),
  "idempresa" integer,
  "tamanio"   character varying(50),
  "altomin"   numeric(5,2),
  "altomax"   numeric(5,2),
  "anchomin"  numeric(5,2),
  "anchomax"  numeric(5,2),
  "precio"    numeric(10,2),
  CONSTRAINT "precio_tamano_pkey" PRIMARY KEY (idtamano),
  CONSTRAINT "precio_tamano_tamanio_key" UNIQUE (tamanio)
);

ALTER TABLE "public"."precio_tamano"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."roles" (
  "idrol" integer               NOT NULL DEFAULT nextval('public.roles_idrol_seq'::regclass),
  "rol"   character varying(50) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY (idrol)
);

ALTER TABLE "public"."roles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."seguimiento_fotos" (
  "idseguimiento_foto"   integer                     NOT NULL DEFAULT nextval('public.seguimiento_fotos_idseguimiento_foto_seq'::regclass),
  "idseguimiento"        integer,
  "foto_seguimiento_url" text,
  "fecha_subida"         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seguimiento_fotos_pkey" PRIMARY KEY (idseguimiento_foto)
);

ALTER TABLE "public"."seguimiento_fotos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."seguimiento" (
  "idseguimiento"       integer                NOT NULL DEFAULT nextval('public.seguimiento_idseguimiento_seq'::regclass),
  "idcliente"           integer,
  "idcita"              integer,
  "idtatuador"          integer,
  "estadocicatrizacion" character varying(100),
  "estadoseguimiento"   character varying(100),
  "fechainicio"         date                   DEFAULT CURRENT_DATE,
  "fechafin"            date,
  CONSTRAINT "seguimiento_pkey" PRIMARY KEY (idseguimiento)
);

ALTER TABLE "public"."seguimiento"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."status_cita" (
  "idstatus_cita" integer               NOT NULL DEFAULT nextval('public.status_cita_idstatus_cita_seq'::regclass),
  "nombre"        character varying(50) NOT NULL,
  CONSTRAINT "status_cita_pkey" PRIMARY KEY (idstatus_cita)
);

ALTER TABLE "public"."status_cita"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."status_cotizacion" (
  "idstatus" integer               NOT NULL DEFAULT nextval('public.status_cotizacion_idstatus_seq'::regclass),
  "nombre"   character varying(50) NOT NULL,
  CONSTRAINT "status_cotizacion_pkey" PRIMARY KEY (idstatus)
);

ALTER TABLE "public"."status_cotizacion"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tatuador_tiene_tecnica" (
  "idtecnica"  integer NOT NULL,
  "idtatuador" integer NOT NULL,
  CONSTRAINT "tatuador_tiene_tecnica_pkey" PRIMARY KEY (idtecnica, idtatuador)
);

ALTER TABLE "public"."tatuador_tiene_tecnica"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tatuador" (
  "idtatuador"         integer      NOT NULL DEFAULT nextval('public.tatuador_idtatuador_seq'::regclass),
  "porcentajecomision" numeric(5,2),
  "idempleado"         integer,
  CONSTRAINT "tatuador_pkey" PRIMARY KEY (idtatuador)
);

ALTER TABLE "public"."tatuador"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tecnicas" (
  "idtecnica"     integer                NOT NULL DEFAULT nextval('public.tecnicas_idtecnica_seq'::regclass),
  "idempresa"     integer,
  "nombretecnica" character varying(100),
  "dificultad"    numeric(10,2),
  CONSTRAINT "tecnicas_nombretecnica_key" UNIQUE (nombretecnica),
  CONSTRAINT "tecnicas_pkey" PRIMARY KEY (idtecnica)
);

ALTER TABLE "public"."tecnicas"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tipo_cita" (
  "idtipo_cita" integer               NOT NULL DEFAULT nextval('public.tipo_cita_idtipo_cita_seq'::regclass),
  "nombre"      character varying(50) NOT NULL,
  CONSTRAINT "tipo_cita_pkey" PRIMARY KEY (idtipo_cita)
);

ALTER TABLE "public"."tipo_cita"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tipo_emisor" (
  "idtipo_emisor" integer               NOT NULL DEFAULT nextval('public.tipo_emisor_idtipo_emisor_seq'::regclass),
  "nombre"        character varying(50) NOT NULL,
  CONSTRAINT "tipo_emisor_pkey" PRIMARY KEY (idtipo_emisor)
);

ALTER TABLE "public"."tipo_emisor"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tipo_pagos" (
  "idtipo_pagos" integer               NOT NULL DEFAULT nextval('public.tipo_pagos_idtipo_pagos_seq'::regclass),
  "nombre"       character varying(50) NOT NULL,
  CONSTRAINT "tipo_pagos_pkey" PRIMARY KEY (idtipo_pagos)
);

ALTER TABLE "public"."tipo_pagos"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."chat_seguimiento_idmensaje_seq" OWNED BY "public"."chat_seguimiento"."idmensaje";

ALTER SEQUENCE "public"."cita_idcita_seq" OWNED BY "public"."cita"."idcita";

ALTER SEQUENCE "public"."cliente_idcliente_seq" OWNED BY "public"."cliente"."idcliente";

ALTER SEQUENCE "public"."cotizacion_idcotizacion_seq" OWNED BY "public"."cotizacion"."idcotizacion";

ALTER SEQUENCE "public"."empleado_idempleado_seq" OWNED BY "public"."empleado"."idempleado";

ALTER SEQUENCE "public"."empresa_idempresa_seq" OWNED BY "public"."empresa"."idempresa";

ALTER SEQUENCE "public"."horario_base_id_seq" OWNED BY "public"."horario_base"."id";

ALTER SEQUENCE "public"."horas_disponibles_idhora_seq" OWNED BY "public"."horas_disponibles"."idhora";

ALTER SEQUENCE "public"."metodos_pagos_idmetodo_seq" OWNED BY "public"."metodos_pagos"."idmetodo";

ALTER SEQUENCE "public"."notificacion_idnotificacion_seq" OWNED BY "public"."notificacion"."idnotificacion";

ALTER SEQUENCE "public"."observaciones_idobserva_seq" OWNED BY "public"."observaciones"."idobserva";

ALTER SEQUENCE "public"."pago_idpago_seq" OWNED BY "public"."pago"."idpago";

ALTER SEQUENCE "public"."politica_idpolitica_seq" OWNED BY "public"."politica"."idpolitica";

ALTER SEQUENCE "public"."precio_tamano_idtamano_seq" OWNED BY "public"."precio_tamano"."idtamano";

ALTER SEQUENCE "public"."roles_idrol_seq" OWNED BY "public"."roles"."idrol";

ALTER SEQUENCE "public"."seguimiento_idseguimiento_seq" OWNED BY "public"."seguimiento"."idseguimiento";

ALTER SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" OWNED BY "public"."seguimiento_fotos"."idseguimiento_foto";

ALTER SEQUENCE "public"."status_cita_idstatus_cita_seq" OWNED BY "public"."status_cita"."idstatus_cita";

ALTER SEQUENCE "public"."status_cotizacion_idstatus_seq" OWNED BY "public"."status_cotizacion"."idstatus";

ALTER SEQUENCE "public"."tatuador_idtatuador_seq" OWNED BY "public"."tatuador"."idtatuador";

ALTER SEQUENCE "public"."tecnicas_idtecnica_seq" OWNED BY "public"."tecnicas"."idtecnica";

ALTER SEQUENCE "public"."tipo_cita_idtipo_cita_seq" OWNED BY "public"."tipo_cita"."idtipo_cita";

ALTER SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" OWNED BY "public"."tipo_emisor"."idtipo_emisor";

ALTER SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" OWNED BY "public"."tipo_pagos"."idtipo_pagos";

CREATE TYPE "public"."tipo_bloqueo" AS ENUM (
  'unico',
  'diario',
  'semanal'
);

ALTER TABLE "public"."horas_disponibles"
  ADD COLUMN "tipo_bloqueo" public.tipo_bloqueo NOT NULL DEFAULT 'unico'::public.tipo_bloqueo;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW()
  OR reset_token_expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_password_reset_tokens_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."cita"
  ADD CONSTRAINT "cita_idcliente_fkey" FOREIGN KEY (idcliente) REFERENCES public.cliente(idcliente);

ALTER TABLE "public"."cliente"
  ADD CONSTRAINT "fk_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."cliente_en_empresa"
  ADD CONSTRAINT "cliente_en_empresa_idcliente_fkey" FOREIGN KEY (idcliente) REFERENCES public.cliente(idcliente);

ALTER TABLE "public"."cotizacion"
  ADD CONSTRAINT "cotizacion_idcita_fkey" FOREIGN KEY (idcita) REFERENCES public.cita(idcita);

ALTER TABLE "public"."cliente_en_empresa"
  ADD CONSTRAINT "cliente_en_empresa_idempresa_fkey" FOREIGN KEY (idempresa) REFERENCES public.empresa(idempresa);

ALTER TABLE "public"."empleado"
  ADD CONSTRAINT "empleado_idempresa_fkey" FOREIGN KEY (idempresa) REFERENCES public.empresa(idempresa);

ALTER TABLE "public"."observaciones"
  ADD CONSTRAINT "observaciones_idcita_fkey" FOREIGN KEY (idcita) REFERENCES public.cita(idcita);

ALTER TABLE "public"."pago"
  ADD CONSTRAINT "pago_idcita_fkey" FOREIGN KEY (idcita) REFERENCES public.cita(idcita);

ALTER TABLE "public"."pago"
  ADD CONSTRAINT "pago_idcotizacion_fkey" FOREIGN KEY (idcotizacion) REFERENCES public.cotizacion(idcotizacion);

ALTER TABLE "public"."pago"
  ADD CONSTRAINT "pago_idmetodo_fkey" FOREIGN KEY (idmetodo) REFERENCES public.metodos_pagos(idmetodo);

ALTER TABLE "public"."politica"
  ADD CONSTRAINT "politica_idempresa_fkey" FOREIGN KEY (idempresa) REFERENCES public.empresa(idempresa);

ALTER TABLE "public"."precio_tamano"
  ADD CONSTRAINT "precio_tamano_idempresa_fkey" FOREIGN KEY (idempresa) REFERENCES public.empresa(idempresa);

ALTER TABLE "public"."empleado"
  ADD CONSTRAINT "empleado_idrol_fkey" FOREIGN KEY (idrol) REFERENCES public.roles(idrol);

ALTER TABLE "public"."seguimiento"
  ADD CONSTRAINT "seguimiento_idcita_fkey" FOREIGN KEY (idcita) REFERENCES public.cita(idcita);

ALTER TABLE "public"."seguimiento"
  ADD CONSTRAINT "seguimiento_idcliente_fkey" FOREIGN KEY (idcliente) REFERENCES public.cliente(idcliente);

ALTER TABLE "public"."chat_seguimiento"
  ADD CONSTRAINT "chat_seguimiento_idseguimiento_fkey" FOREIGN KEY (idseguimiento) REFERENCES public.seguimiento(idseguimiento);

ALTER TABLE "public"."observaciones"
  ADD CONSTRAINT "observaciones_idseguimiento_fkey" FOREIGN KEY (idseguimiento) REFERENCES public.seguimiento(idseguimiento);

ALTER TABLE "public"."seguimiento_fotos"
  ADD CONSTRAINT "seguimiento_fotos_idseguimiento_fkey" FOREIGN KEY (idseguimiento) REFERENCES public.seguimiento(idseguimiento);

ALTER TABLE "public"."cita"
  ADD CONSTRAINT "cita_idstatus_cita_fkey" FOREIGN KEY (idstatus_cita) REFERENCES public.status_cita(idstatus_cita);

ALTER TABLE "public"."cotizacion"
  ADD CONSTRAINT "cotizacion_idstatus_fkey" FOREIGN KEY (idstatus) REFERENCES public.status_cotizacion(idstatus);

ALTER TABLE "public"."tatuador"
  ADD CONSTRAINT "tatuador_idempleado_fkey" FOREIGN KEY (idempleado) REFERENCES public.empleado(idempleado);

ALTER TABLE "public"."cita"
  ADD CONSTRAINT "fk_tatuador_cita" FOREIGN KEY (idtatuador) REFERENCES public.tatuador(idtatuador);

ALTER TABLE "public"."horario_base"
  ADD CONSTRAINT "horario_base_idtatuador_fkey" FOREIGN KEY (idtatuador) REFERENCES public.tatuador(idtatuador);

ALTER TABLE "public"."horas_disponibles"
  ADD CONSTRAINT "fk_tatuador_horario_disponible" FOREIGN KEY (idtatuador) REFERENCES public.tatuador(idtatuador);

ALTER TABLE "public"."tecnicas"
  ADD CONSTRAINT "tecnicas_idempresa_fkey" FOREIGN KEY (idempresa) REFERENCES public.empresa(idempresa);

ALTER TABLE "public"."tatuador_tiene_tecnica"
  ADD CONSTRAINT "tatuador_tiene_tecnica_idtecnica_fkey" FOREIGN KEY (idtecnica) REFERENCES public.tecnicas(idtecnica);

ALTER TABLE "public"."cita"
  ADD CONSTRAINT "cita_idtipo_cita_fkey" FOREIGN KEY (idtipo_cita) REFERENCES public.tipo_cita(idtipo_cita);

ALTER TABLE "public"."chat_seguimiento"
  ADD CONSTRAINT "chat_seguimiento_idtipo_emisor_fkey" FOREIGN KEY (idtipo_emisor) REFERENCES public.tipo_emisor(idtipo_emisor);

ALTER TABLE "public"."pago"
  ADD CONSTRAINT "pago_idtipo_pagos_fkey" FOREIGN KEY (idtipo_pagos) REFERENCES public.tipo_pagos(idtipo_pagos);

CREATE INDEX idx_notif_usuario ON public.notificacion USING btree (idtipousuario, idusuario, leida);

COMMENT ON COLUMN "public"."cliente"."user_id" IS 'id del cliente en los usuarios autenticados de supdatabase';

COMMENT ON TYPE "public"."tipo_bloqueo" IS 'tipos de bloqueo';

GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."cleanup_expired_reset_tokens"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_password_reset_tokens_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_password_reset_tokens_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_password_reset_tokens_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_password_reset_tokens_updated_at"() TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."chat_seguimiento_idmensaje_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."chat_seguimiento_idmensaje_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."chat_seguimiento_idmensaje_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."chat_seguimiento_idmensaje_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cita_idcita_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."cita_idcita_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cita_idcita_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cita_idcita_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cliente_idcliente_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."cliente_idcliente_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cliente_idcliente_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cliente_idcliente_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cotizacion_idcotizacion_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."cotizacion_idcotizacion_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cotizacion_idcotizacion_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."cotizacion_idcotizacion_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empleado_idempleado_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."empleado_idempleado_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empleado_idempleado_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empleado_idempleado_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empresa_idempresa_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."empresa_idempresa_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empresa_idempresa_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."empresa_idempresa_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horario_base_id_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."horario_base_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horario_base_id_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horario_base_id_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horas_disponibles_idhora_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."horas_disponibles_idhora_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horas_disponibles_idhora_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."horas_disponibles_idhora_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."metodos_pagos_idmetodo_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."metodos_pagos_idmetodo_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."metodos_pagos_idmetodo_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."metodos_pagos_idmetodo_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notificacion_idnotificacion_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."notificacion_idnotificacion_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notificacion_idnotificacion_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notificacion_idnotificacion_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."observaciones_idobserva_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."observaciones_idobserva_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."observaciones_idobserva_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."observaciones_idobserva_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pago_idpago_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."pago_idpago_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pago_idpago_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pago_idpago_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."politica_idpolitica_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."politica_idpolitica_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."politica_idpolitica_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."politica_idpolitica_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."precio_tamano_idtamano_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."precio_tamano_idtamano_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."precio_tamano_idtamano_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."precio_tamano_idtamano_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."roles_idrol_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."roles_idrol_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."roles_idrol_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."roles_idrol_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_fotos_idseguimiento_foto_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_idseguimiento_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."seguimiento_idseguimiento_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_idseguimiento_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seguimiento_idseguimiento_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cita_idstatus_cita_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."status_cita_idstatus_cita_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cita_idstatus_cita_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cita_idstatus_cita_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cotizacion_idstatus_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."status_cotizacion_idstatus_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cotizacion_idstatus_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_cotizacion_idstatus_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tatuador_idtatuador_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."tatuador_idtatuador_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tatuador_idtatuador_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tatuador_idtatuador_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tecnicas_idtecnica_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."tecnicas_idtecnica_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tecnicas_idtecnica_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tecnicas_idtecnica_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_cita_idtipo_cita_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."tipo_cita_idtipo_cita_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_cita_idtipo_cita_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_cita_idtipo_cita_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_emisor_idtipo_emisor_seq" TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."tipo_pagos_idtipo_pagos_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_seguimiento" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."chat_seguimiento" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_seguimiento" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_seguimiento" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cita" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cita" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cita" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cita" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cliente" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente_en_empresa" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cliente_en_empresa" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente_en_empresa" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cliente_en_empresa" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cotizacion" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cotizacion" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cotizacion" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cotizacion" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empleado" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."empleado" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empleado" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empleado" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empresa" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."empresa" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empresa" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."empresa" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horario_base" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."horario_base" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horario_base" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horario_base" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horas_disponibles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."horas_disponibles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horas_disponibles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."horas_disponibles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."metodos_pagos" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."metodos_pagos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."metodos_pagos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."metodos_pagos" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."notificacion" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."observaciones" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."observaciones" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."observaciones" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."observaciones" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pago" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."pago" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pago" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pago" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."politica" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."politica" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."politica" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."politica" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."precio_tamano" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."precio_tamano" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."precio_tamano" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."precio_tamano" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."roles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."seguimiento" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento_fotos" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."seguimiento_fotos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento_fotos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seguimiento_fotos" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cita" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."status_cita" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cita" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cita" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cotizacion" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."status_cotizacion" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cotizacion" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."status_cotizacion" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tatuador" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador_tiene_tecnica" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tatuador_tiene_tecnica" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador_tiene_tecnica" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tatuador_tiene_tecnica" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tecnicas" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tecnicas" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tecnicas" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tecnicas" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_cita" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tipo_cita" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_cita" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_cita" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_emisor" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tipo_emisor" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_emisor" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_emisor" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_pagos" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tipo_pagos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_pagos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipo_pagos" TO "service_role";

