const { Router } = require('express');
const pool = require('../db');

const router = Router();

// ─────────────────────────────────────────────────────────────
// GET /api/mascotas
// Query params: nombre (opcional, búsqueda parcial ILIKE)
// Headers:      X-Role, X-Vet-Id
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const role  = req.headers['x-role'];
  const vetId = req.headers['x-vet-id'];
  const { nombre } = req.query;

  let client;

  try {
    client = await pool.connect();

    // ── Si el rol es veterinario, activar RLS con su vet_id ──
    if (role === 'veterinario' && vetId) {
      await client.query('SET LOCAL app.current_vet_id = $1', [vetId]);
    }

    // ── Construir query con placeholder (NUNCA concatenar input) ──
    let query;
    let params;

    if (nombre) {
      query  = 'SELECT * FROM mascotas WHERE nombre ILIKE $1 ORDER BY id';
      params = [`%${nombre}%`];
    } else {
      query  = 'SELECT * FROM mascotas ORDER BY id';
      params = [];
    }

    const { rows } = await client.query(query, params);

    res.json({
      rol:      role || 'sin rol',
      total:    rows.length,
      mascotas: rows,
    });

  } catch (err) {
    console.error('[ERROR] GET /api/mascotas:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
