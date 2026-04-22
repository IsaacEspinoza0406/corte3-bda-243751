const { Router } = require('express');
const pool = require('../db');

const router = Router();

// ── Mapeo de header X-Role → rol de PostgreSQL ──
const PG_ROLE_MAP = {
  veterinario:   'rol_veterinario',
  recepcion:     'rol_recepcion',
  administrador: null,
};

// ─────────────────────────────────────────────────────────────
// POST /api/citas
// Body JSON: { mascota_id, veterinario_id, fecha_hora, motivo }
// Headers:   X-Role, X-Vet-Id
//
// Llama al procedure sp_agendar_cita que valida:
//   - Veterinario activo
//   - No es día de descanso
//   - Mascota existe
// Si alguna validación falla, el procedure lanza EXCEPTION.
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const role  = req.headers['x-role'];
  const vetId = req.headers['x-vet-id'];
  const { mascota_id, veterinario_id, fecha_hora, motivo } = req.body;

  // ── Validar campos requeridos ──
  if (!mascota_id || !veterinario_id || !fecha_hora || !motivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // ── SET ROLE para que RLS aplique ──
    const pgRole = PG_ROLE_MAP[role];
    if (pgRole) {
      await client.query(`SET ROLE ${pgRole}`);
    }

    if (role === 'veterinario' && vetId) {
      const safeVetId = parseInt(vetId, 10);
      if (isNaN(safeVetId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'X-Vet-Id inválido' });
      }
      await client.query(`SET LOCAL app.current_vet_id = '${safeVetId}'`);
    }

    // ── Llamar al stored procedure con query parametrizada ──
    await client.query(
      'CALL sp_agendar_cita($1, $2, $3::TIMESTAMP, $4, NULL)',
      [mascota_id, veterinario_id, fecha_hora, motivo]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Cita agendada correctamente',
    });

  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[ERROR] POST /api/citas:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    if (client) {
      try { await client.query('RESET ROLE'); } catch (_) {}
      client.release();
    }
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/citas
// Headers: X-Role, X-Vet-Id
//
// Si es veterinario, RLS filtra automáticamente a solo sus citas.
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const role  = req.headers['x-role'];
  const vetId = req.headers['x-vet-id'];

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // ── SET ROLE para que RLS aplique ──
    const pgRole = PG_ROLE_MAP[role];
    if (pgRole) {
      await client.query(`SET ROLE ${pgRole}`);
    }

    if (role === 'veterinario' && vetId) {
      const safeVetId = parseInt(vetId, 10);
      if (isNaN(safeVetId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'X-Vet-Id inválido' });
      }
      await client.query(`SET LOCAL app.current_vet_id = '${safeVetId}'`);
    }

    const { rows } = await client.query(
      'SELECT * FROM citas ORDER BY fecha_hora DESC'
    );

    await client.query('COMMIT');

    res.json({
      total: rows.length,
      citas: rows,
    });

  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[ERROR] GET /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      try { await client.query('RESET ROLE'); } catch (_) {}
      client.release();
    }
  }
});

module.exports = router;
