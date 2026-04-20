const { Router } = require('express');
const pool  = require('../db');
const redis = require('../cache');

const router = Router();

const CACHE_KEY = 'vacunacion_pendiente';

// ─────────────────────────────────────────────────────────────
// GET /api/vacunacion-pendiente
// Sin parámetros. Usa caché Redis con TTL de 300 s.
// Headers: X-Role
// ─────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    // ── 1. Intentar leer de Redis ──
    const cached = await redis.get(CACHE_KEY);

    if (cached) {
      // CACHE HIT
      console.log(`[${new Date().toISOString()}] [CACHE HIT] ${CACHE_KEY}`);

      return res.json({
        source: 'cache',
        data:   JSON.parse(cached),
      });
    }

    // ── 2. CACHE MISS — consultar la vista en PostgreSQL ──
    console.log(`[${new Date().toISOString()}] [CACHE MISS] ${CACHE_KEY}`);

    const inicio = Date.now();
    const { rows } = await pool.query('SELECT * FROM v_mascotas_vacunacion_pendiente');
    const latencia = Date.now() - inicio + 'ms';

    console.log(`[BD] Consulta completada en ${latencia}`);

    // ── 3. Guardar en Redis con TTL de 300 segundos ──
    await redis.setex(CACHE_KEY, 300, JSON.stringify(rows));

    res.json({
      source: 'db',
      data:   rows,
    });

  } catch (err) {
    console.error('[ERROR] GET /api/vacunacion-pendiente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
