-- Row Level Security (RLS) — Clínica Veterinaria

-- Mecanismo de identificación:
--   El backend Node.js ejecuta SET LOCAL app.current_vet_id = '<id>'
--   antes de cada query cuando el usuario es veterinario.
--   Las políticas leen el valor con:
--     current_setting('app.current_vet_id', TRUE)::INT
--   El segundo argumento TRUE retorna NULL (no error) si la
--   variable no está seteada.
--
-- Orden de ejecución: ejecutar DESPUÉS de 04_roles_y_permisos.sql
-- Este script es re-ejecutable.



-- 1. HABILITAR RLS EN LAS TABLAS SENSIBLES
-- FORCE ROW LEVEL SECURITY se usa para que RLS aplique también
-- al dueño de la tabla cuando se conecta directamente, excepto
-- si tiene BYPASSRLS.

ALTER TABLE mascotas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas  ENABLE ROW LEVEL SECURITY;

ALTER TABLE mascotas           FORCE ROW LEVEL SECURITY;
ALTER TABLE citas              FORCE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas  FORCE ROW LEVEL SECURITY;


-- 2. POLÍTICAS EN mascotas

-- ─── policy_mascotas_vet ───
-- El veterinario solo ve mascotas asignadas a él en vet_atiende_mascota.
-- Esto evita que un vet acceda a datos clínicos de pacientes ajenos.
-- Solo SELECT porque el vet no tiene INSERT/UPDATE/DELETE en mascotas.
DROP POLICY IF EXISTS policy_mascotas_vet ON mascotas;
CREATE POLICY policy_mascotas_vet
    ON mascotas
    FOR SELECT
    TO rol_veterinario
    USING (
        EXISTS (
            SELECT 1
              FROM vet_atiende_mascota
             WHERE vet_atiende_mascota.mascota_id = mascotas.id
               AND vet_atiende_mascota.vet_id =
                   current_setting('app.current_vet_id', TRUE)::INT
        )
    );

-- ─── policy_mascotas_recepcion ───
-- La recepción necesita ver TODAS las mascotas para coordinar citas
-- y contactar a los dueños. No hay restricción por fila.
DROP POLICY IF EXISTS policy_mascotas_recepcion ON mascotas;
CREATE POLICY policy_mascotas_recepcion
    ON mascotas
    FOR SELECT
    TO rol_recepcion
    USING (TRUE);

-- ─── policy_mascotas_admin ───
-- El administrador ve todo. Aunque BYPASSRLS ya lo garantiza,
-- creamos la política explícitamente como red de seguridad.
DROP POLICY IF EXISTS policy_mascotas_admin ON mascotas;
CREATE POLICY policy_mascotas_admin
    ON mascotas
    FOR ALL
    TO rol_administrador
    USING (TRUE)
    WITH CHECK (TRUE);


-- 3. POLÍTICAS EN citas

-- ─── policy_citas_vet ───
-- El veterinario solo ve y crea citas donde él es el veterinario asignado.
-- USING filtra las citas que puede leer.
-- WITH CHECK valida que solo inserte citas a su nombre, previniendo que
-- un vet cree citas haciéndose pasar por otro.
DROP POLICY IF EXISTS policy_citas_vet ON citas;
CREATE POLICY policy_citas_vet
    ON citas
    FOR ALL
    TO rol_veterinario
    USING (
        veterinario_id = current_setting('app.current_vet_id', TRUE)::INT
    )
    WITH CHECK (
        veterinario_id = current_setting('app.current_vet_id', TRUE)::INT
    );

-- ─── policy_citas_recepcion ───
-- La recepción ve todas las citas y puede agendar para cualquier
-- veterinario. Sin restricción por fila.
DROP POLICY IF EXISTS policy_citas_recepcion ON citas;
CREATE POLICY policy_citas_recepcion
    ON citas
    FOR ALL
    TO rol_recepcion
    USING (TRUE)
    WITH CHECK (TRUE);

-- ─── policy_citas_admin ───
-- Acceso total para el administrador.
DROP POLICY IF EXISTS policy_citas_admin ON citas;
CREATE POLICY policy_citas_admin
    ON citas
    FOR ALL
    TO rol_administrador
    USING (TRUE)
    WITH CHECK (TRUE);


-- 4. POLÍTICAS EN vacunas_aplicadas

-- Nota: rol_recepcion no tiene GRANT sobre vacunas_aplicadas,
-- así que no necesita política aquí. El control de acceso opera
-- en dos capas: GRANT  + RLS.

-- ─── policy_vacunas_vet ───
-- El veterinario solo ve y registra vacunas de mascotas que atiende.
-- Reutiliza la misma subquery de vet_atiende_mascota que mascotas.
-- USING filtra lecturas; WITH CHECK valida inserciones.
DROP POLICY IF EXISTS policy_vacunas_vet ON vacunas_aplicadas;
CREATE POLICY policy_vacunas_vet
    ON vacunas_aplicadas
    FOR ALL
    TO rol_veterinario
    USING (
        EXISTS (
            SELECT 1
              FROM vet_atiende_mascota
             WHERE vet_atiende_mascota.mascota_id = vacunas_aplicadas.mascota_id
               AND vet_atiende_mascota.vet_id =
                   current_setting('app.current_vet_id', TRUE)::INT
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
              FROM vet_atiende_mascota
             WHERE vet_atiende_mascota.mascota_id = vacunas_aplicadas.mascota_id
               AND vet_atiende_mascota.vet_id =
                   current_setting('app.current_vet_id', TRUE)::INT
        )
    );

-- ─── policy_vacunas_admin ───
-- Acceso total para el administrador (redundante con BYPASSRLS).
DROP POLICY IF EXISTS policy_vacunas_admin ON vacunas_aplicadas;
CREATE POLICY policy_vacunas_admin
    ON vacunas_aplicadas
    FOR ALL
    TO rol_administrador
    USING (TRUE)
    WITH CHECK (TRUE);


-- 5. VERIFICACIÓN DE POLÍTICAS
DO $$
DECLARE
    v_pol_mascotas  INT;
    v_pol_citas     INT;
    v_pol_vacunas   INT;
BEGIN
    SELECT COUNT(*) INTO v_pol_mascotas
      FROM pg_policies WHERE tablename = 'mascotas';

    SELECT COUNT(*) INTO v_pol_citas
      FROM pg_policies WHERE tablename = 'citas';

    SELECT COUNT(*) INTO v_pol_vacunas
      FROM pg_policies WHERE tablename = 'vacunas_aplicadas';

    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Row Level Security aplicado correctamente.';
    RAISE NOTICE '  Políticas en mascotas:          %', v_pol_mascotas;
    RAISE NOTICE '  Políticas en citas:             %', v_pol_citas;
    RAISE NOTICE '  Políticas en vacunas_aplicadas: %', v_pol_vacunas;
    RAISE NOTICE '  Total de políticas RLS:         %', v_pol_mascotas + v_pol_citas + v_pol_vacunas;
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Para probar RLS como vet_lopez:';
    RAISE NOTICE '  SET ROLE vet_lopez;';
    RAISE NOTICE '  SET LOCAL app.current_vet_id = ''1'';';
    RAISE NOTICE '  SELECT * FROM mascotas;  -- debe ver solo 3';
    RAISE NOTICE '  RESET ROLE;';
    RAISE NOTICE '=================================================';
END $$;
