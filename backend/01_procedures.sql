-- =============================================================
-- Stored Procedures — Clínica Veterinaria
-- Corte 3 · Base de Datos Avanzadas
-- =============================================================

-- sp_agendar_cita
-- Agenda una nueva cita validando:
--   1. Que el veterinario exista y esté activo
--   2. Que no sea un día de descanso del veterinario
--   3. Que la mascota exista
-- Retorna el ID de la cita creada en el parámetro OUT p_cita_id.
-- =============================================================
CREATE OR REPLACE PROCEDURE sp_agendar_cita(
    p_mascota_id     INT,
    p_veterinario_id INT,
    p_fecha_hora     TIMESTAMP,
    p_motivo         TEXT,
    OUT p_cita_id    INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_dias_descanso VARCHAR(50);
    v_activo        BOOLEAN;
    v_dia_semana    TEXT;
    v_mascota_ok    BOOLEAN;
BEGIN
    -- ───── 1. Verificar que el veterinario existe y está activo ─────
    SELECT activo, COALESCE(dias_descanso, '')
      INTO v_activo, v_dias_descanso
      FROM veterinarios
     WHERE id = p_veterinario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Veterinario no encontrado o inactivo';
    END IF;

    IF v_activo IS NOT TRUE THEN
        RAISE EXCEPTION 'Veterinario no encontrado o inactivo';
    END IF;

    -- ───── 2. Verificar que no es día de descanso ─────
    -- Mapeo numérico a nombre español (EXTRACT DOW: 0=dom … 6=sáb)
    v_dia_semana := lower(trim(
        (ARRAY['domingo','lunes','martes','miercoles','jueves','viernes','sabado'])
        [EXTRACT(DOW FROM p_fecha_hora)::INT + 1]
    ));

    IF v_dias_descanso <> '' AND v_dia_semana = ANY(string_to_array(v_dias_descanso, ',')) THEN
        RAISE EXCEPTION 'El veterinario descansa el día %. No se puede agendar la cita.',
            v_dia_semana;
    END IF;

    -- ───── 3. Verificar que la mascota existe ─────
    SELECT TRUE
      INTO v_mascota_ok
      FROM mascotas
     WHERE id = p_mascota_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mascota con ID % no encontrada', p_mascota_id;
    END IF;

    -- ───── 4. Insertar la cita ─────
    INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, estado)
    VALUES (p_mascota_id, p_veterinario_id, p_fecha_hora, p_motivo, 'AGENDADA')
    RETURNING id INTO p_cita_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
