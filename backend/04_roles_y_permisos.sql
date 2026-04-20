-- =============================================================
-- Roles y Permisos — Clínica Veterinaria
-- Corte 3 · Base de Datos Avanzadas
--
-- Ejecutar conectado a clinica_vet como superusuario o como
-- vetadmin (dueño de la BD).
--
-- Este script es re-ejecutable (idempotente):
--   usa DO $$ con verificación en pg_roles para roles/usuarios.
-- =============================================================


-- =============================================================
-- 1. CREAR ROLES DE APLICACIÓN
-- =============================================================
-- PostgreSQL 15 no tiene CREATE ROLE IF NOT EXISTS,
-- así que usamos DO $$ con consulta a pg_roles.

DO $$
BEGIN
    -- rol_veterinario
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_veterinario') THEN
        CREATE ROLE rol_veterinario NOLOGIN;
        RAISE NOTICE 'Rol rol_veterinario creado.';
    ELSE
        RAISE NOTICE 'Rol rol_veterinario ya existe, se omite creación.';
    END IF;

    -- rol_recepcion
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_recepcion') THEN
        CREATE ROLE rol_recepcion NOLOGIN;
        RAISE NOTICE 'Rol rol_recepcion creado.';
    ELSE
        RAISE NOTICE 'Rol rol_recepcion ya existe, se omite creación.';
    END IF;

    -- rol_administrador
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_administrador') THEN
        CREATE ROLE rol_administrador NOLOGIN;
        RAISE NOTICE 'Rol rol_administrador creado.';
    ELSE
        RAISE NOTICE 'Rol rol_administrador ya existe, se omite creación.';
    END IF;
END $$;


-- =============================================================
-- 2. CREAR USUARIOS DE EJEMPLO (uno por rol)
-- =============================================================

DO $$
BEGIN
    -- vet_lopez: veterinario de ejemplo (Dr. López, vet_id = 1)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vet_lopez') THEN
        CREATE USER vet_lopez WITH PASSWORD 'vet123';
        RAISE NOTICE 'Usuario vet_lopez creado.';
    ELSE
        RAISE NOTICE 'Usuario vet_lopez ya existe, se omite creación.';
    END IF;

    -- recepcion_ana: recepcionista de ejemplo
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recepcion_ana') THEN
        CREATE USER recepcion_ana WITH PASSWORD 'rec123';
        RAISE NOTICE 'Usuario recepcion_ana creado.';
    ELSE
        RAISE NOTICE 'Usuario recepcion_ana ya existe, se omite creación.';
    END IF;

    -- admin_isaac: administrador de ejemplo
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_isaac') THEN
        CREATE USER admin_isaac WITH PASSWORD 'adm123';
        RAISE NOTICE 'Usuario admin_isaac creado.';
    ELSE
        RAISE NOTICE 'Usuario admin_isaac ya existe, se omite creación.';
    END IF;
END $$;


-- =============================================================
-- 3. ASIGNAR CADA USUARIO A SU ROL
-- =============================================================

GRANT rol_veterinario   TO vet_lopez;
GRANT rol_recepcion     TO recepcion_ana;
GRANT rol_administrador TO admin_isaac;


-- =============================================================
-- 4. REVOCAR PRIVILEGIOS POR DEFECTO DEL ROL PUBLIC
-- =============================================================
-- Por seguridad, eliminamos todo acceso del pseudo-rol PUBLIC
-- a las tablas y secuencias. Así cada rol solo tiene lo que
-- explícitamente le otorguemos.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;


-- =============================================================
-- 5. OTORGAR ACCESO BÁSICO AL SCHEMA
-- =============================================================

GRANT CONNECT ON DATABASE clinica_vet TO rol_veterinario, rol_recepcion, rol_administrador;
GRANT USAGE   ON SCHEMA public        TO rol_veterinario, rol_recepcion, rol_administrador;


-- =============================================================
-- 6. PERMISOS TABLA POR TABLA — rol_veterinario
-- =============================================================
-- Principio: mínimo privilegio. Solo lo estrictamente necesario
-- para que el veterinario haga su trabajo.

-- Mascotas: solo lectura (RLS filtra a las suyas)
GRANT SELECT ON mascotas TO rol_veterinario;

-- Asignaciones vet ↔ mascota: lectura (requerido por las políticas RLS)
GRANT SELECT ON vet_atiende_mascota TO rol_veterinario;

-- Veterinarios: lectura (necesario para que sp_agendar_cita pueda
-- verificar existencia y estado activo del veterinario)
GRANT SELECT ON veterinarios TO rol_veterinario;

-- Citas: leer sus citas y agendar nuevas
GRANT SELECT, INSERT ON citas TO rol_veterinario;
GRANT USAGE, SELECT  ON SEQUENCE citas_id_seq TO rol_veterinario;

-- Vacunas aplicadas: leer las de sus mascotas y registrar nuevas
GRANT SELECT, INSERT ON vacunas_aplicadas TO rol_veterinario;
GRANT USAGE, SELECT  ON SEQUENCE vacunas_aplicadas_id_seq TO rol_veterinario;

-- Inventario de vacunas: solo lectura
-- (necesita saber qué vacunas existen y su stock para poder aplicarlas)
GRANT SELECT ON inventario_vacunas TO rol_veterinario;

-- Historial de movimientos: solo INSERT (requerido por el trigger
-- trg_historial_cita que se dispara al insertar citas. Sin este
-- permiso, toda creación de citas fallaría).
-- NO tiene SELECT: no puede leer el log de auditoría.
GRANT INSERT ON historial_movimientos TO rol_veterinario;
GRANT USAGE, SELECT ON SEQUENCE historial_movimientos_id_seq TO rol_veterinario;

-- Tablas explícitamente denegadas
REVOKE ALL ON duenos  FROM rol_veterinario;
REVOKE ALL ON alertas FROM rol_veterinario;


-- =============================================================
-- 7. PERMISOS TABLA POR TABLA — rol_recepcion
-- =============================================================
-- La recepción gestiona citas y contacto con dueños.
-- NO accede a información médica (vacunas) ni a auditoría.

-- Mascotas: lectura completa (sin RLS, ve todas)
GRANT SELECT ON mascotas TO rol_recepcion;

-- Dueños: lectura (datos de contacto para coordinar citas)
GRANT SELECT ON duenos TO rol_recepcion;

-- Veterinarios: lectura (necesario para sp_agendar_cita y para
-- saber qué veterinarios están disponibles)
GRANT SELECT ON veterinarios TO rol_recepcion;

-- Citas: leer todas y agendar nuevas
GRANT SELECT, INSERT ON citas TO rol_recepcion;
GRANT USAGE, SELECT  ON SEQUENCE citas_id_seq TO rol_recepcion;

-- Historial de movimientos: solo INSERT (mismo motivo que veterinario:
-- el trigger trg_historial_cita necesita insertar al crear citas)
GRANT INSERT ON historial_movimientos TO rol_recepcion;
GRANT USAGE, SELECT ON SEQUENCE historial_movimientos_id_seq TO rol_recepcion;

-- Tablas explícitamente denegadas
REVOKE ALL ON vacunas_aplicadas  FROM rol_recepcion;
REVOKE ALL ON inventario_vacunas FROM rol_recepcion;
REVOKE ALL ON alertas            FROM rol_recepcion;


-- =============================================================
-- 8. PERMISOS — rol_administrador
-- =============================================================
-- Acceso total. Sin restricciones de RLS.

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO rol_administrador;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rol_administrador;

-- BYPASSRLS: las políticas de seguridad por fila no le aplican
ALTER ROLE rol_administrador BYPASSRLS;


-- =============================================================
-- 9. PERMISOS SOBRE PROCEDURES, FUNCIONES Y VISTAS
-- =============================================================

-- sp_agendar_cita: veterinarios y recepción pueden agendar citas
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT)
    TO rol_veterinario, rol_recepcion;

-- fn_total_facturado: solo el administrador consulta facturación
GRANT EXECUTE ON FUNCTION fn_total_facturado(INT, INT)
    TO rol_administrador;

-- v_mascotas_vacunacion_pendiente: todos los roles pueden consultarla
-- (el veterinario la usa para ver pendientes de sus mascotas,
--  la recepción para contactar dueños, el admin para supervisar)
GRANT SELECT ON v_mascotas_vacunacion_pendiente
    TO rol_veterinario, rol_recepcion, rol_administrador;


-- =============================================================
-- VERIFICACIÓN
-- =============================================================
DO $$
DECLARE
    v_roles   INT;
    v_users   INT;
BEGIN
    SELECT COUNT(*) INTO v_roles
      FROM pg_roles
     WHERE rolname IN ('rol_veterinario', 'rol_recepcion', 'rol_administrador');

    SELECT COUNT(*) INTO v_users
      FROM pg_roles
     WHERE rolname IN ('vet_lopez', 'recepcion_ana', 'admin_isaac')
       AND rolcanlogin = TRUE;

    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Roles y permisos aplicados correctamente.';
    RAISE NOTICE '  Roles de aplicación creados: %/3', v_roles;
    RAISE NOTICE '  Usuarios de ejemplo creados: %/3', v_users;
    RAISE NOTICE '=================================================';
END $$;
