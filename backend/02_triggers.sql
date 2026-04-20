-- =============================================================
-- Triggers y Funciones — Clínica Veterinaria
-- Corte 3 · Base de Datos Avanzadas
-- =============================================================


-- =============================================================
-- TRIGGER: trg_historial_cita
-- Registra automáticamente cada nueva cita en historial_movimientos.
-- Se dispara AFTER INSERT ON citas.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_registrar_historial_cita()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO historial_movimientos (tipo, referencia_id, descripcion, fecha)
    VALUES (
        'CITA_AGENDADA',
        NEW.id,
        'Cita agendada para mascota ID: ' || NEW.mascota_id ||
        ' con veterinario ID: '           || NEW.veterinario_id ||
        ' para '                           || NEW.fecha_hora::TEXT,
        NOW()
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_historial_cita
    AFTER INSERT ON citas
    FOR EACH ROW
    EXECUTE FUNCTION fn_registrar_historial_cita();


-- =============================================================
-- FUNCIÓN: fn_total_facturado
-- Devuelve el total facturado (costo de citas COMPLETADAS)
-- para una mascota en un año determinado.
-- Retorna 0 si no hay citas o la mascota no existe.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_total_facturado(
    p_mascota_id INT,
    p_anio       INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(costo), 0)
      INTO v_total
      FROM citas
     WHERE mascota_id = p_mascota_id
       AND estado = 'COMPLETADA'
       AND EXTRACT(YEAR FROM fecha_hora) = p_anio;

    RETURN v_total;
END;
$$;
