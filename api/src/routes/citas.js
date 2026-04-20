const { Router } = require('express');
const pool = require('../db');

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/citas
// Body JSON: { mascota_id, veterinario_id, fecha_hora, motivo }
// Headers:   X-Role, X-Vet-Id
//
// Llama al procedure sp_agendar_cita que valida:
//   - Veterinario activo
//   - No es día de descanso
//   - Mascota existe
// Si alguna validación falla, el procedure lanza EXCEPTION
// que se captura y se devuelve como 400.
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { mascota_id, veterinario_id, fecha_hora, motivo } = req.body;

  // ── Validar campos requeridos ──
  if (!mascota_id || !veterinario_id || !fecha_hora || !motivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // ── Llamar al stored procedure con query parametrizada ──
    await pool.query(
      'CALL sp_agendar_cita($1, $2, $3::TIMESTAMP, $4, NULL)',
      [mascota_id, veterinario_id, fecha_hora, motivo]
    );

    res.status(201).json({
      mensaje: 'Cita agendada correctamente',
    });

  } catch (err) {
    // Las excepciones del procedure (vet inactivo, día de descanso,
    // mascota no encontrada) llegan aquí como errores de PostgreSQL.
    console.error('[ERROR] POST /api/citas:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/citas
// Headers: X-Role, X-Vet-Id
//
// Retorna las citas visibles según el rol.
// Si es veterinario, RLS filtra automáticamente a solo sus citas
// tras ejecutar SET LOCAL app.current_vet_id.
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const role  = req.headers['x-role'];
  const vetId = req.headers['x-vet-id'];

  let client;

  try {
    client = await pool.connect();

    // ── Si el rol es veterinario, activar RLS ──
    if (role === 'veterinario' && vetId) {
      await client.query('SET LOCAL app.current_vet_id = $1', [vetId]);
    }

    const { rows } = await client.query(
      'SELECT * FROM citas ORDER BY fecha_hora DESC'
    );

    res.json({
      total: rows.length,
      citas: rows,
    });

  } catch (err) {
    console.error('[ERROR] GET /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
