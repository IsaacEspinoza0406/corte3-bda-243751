const { Router } = require('express');
const pool  = require('../db');
const redis = require('../cache');

const router = Router();

// ── Mapeo de header X-Role → rol de PostgreSQL ──
const PG_ROLE_MAP = {
  veterinario:   'rol_veterinario',
  recepcion:     'rol_recepcion',
  administrador: null,
};

// ─────────────────────────────────────────────────────────────
// POST /api/vacunas
// Body JSON: { mascota_id, vacuna_id, veterinario_id, costo_cobrado }
// Headers:   X-Role, X-Vet-Id
//
// Registra una vacuna aplicada e invalida el caché de
// vacunacion_pendiente.
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const role  = req.headers['x-role'];
  const vetId = req.headers['x-vet-id'];
  const { mascota_id, vacuna_id, veterinario_id, costo_cobrado } = req.body;

  // ── Validar campos requeridos ──
  if (!mascota_id || !vacuna_id || !veterinario_id || costo_cobrado === undefined) {
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

    // ── Insertar vacuna aplicada (query 100% parametrizada) ──
    const { rows } = await client.query(
      `INSERT INTO vacunas_aplicadas
         (mascota_id, vacuna_id, veterinario_id, fecha_aplicacion, costo_cobrado)
       VALUES ($1, $2, $3, CURRENT_DATE, $4)
       RETURNING id`,
      [mascota_id, vacuna_id, veterinario_id, costo_cobrado]
    );

    await client.query('COMMIT');

    // ── Invalidar caché de vacunación pendiente ──
    await redis.del('vacunacion_pendiente');
    console.log(`[${new Date().toISOString()}] [CACHE INVALIDATED] vacunacion_pendiente`);

    res.status(201).json({
      mensaje: 'Vacuna aplicada correctamente',
      id:      rows[0].id,
    });

  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[ERROR] POST /api/vacunas:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      try { await client.query('RESET ROLE'); } catch (_) {}
      client.release();
    }
  }
});

module.exports = router;
