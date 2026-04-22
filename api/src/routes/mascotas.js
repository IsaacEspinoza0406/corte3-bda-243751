const { Router } = require('express');
const pool = require('../db');

const router = Router();

// ─────────────────────────────────────────────────────────────
// Mapea el header X-Role al usuario de PostgreSQL correspondiente.
// Esto es CLAVE para que RLS funcione: vetadmin es superusuario
// y tiene BYPASSRLS, así que si no hacemos SET ROLE, PostgreSQL
// ignora todas las políticas de seguridad por fila.
// ─────────────────────────────────────────────────────────────
const PG_ROLE_MAP = {
  veterinario:   'rol_veterinario',
  recepcion:     'rol_recepcion',
  administrador: null, // vetadmin ya tiene acceso total
};

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

    // ── Iniciar transacción (SET LOCAL solo funciona dentro de una) ──
    await client.query('BEGIN');

    // ── Cambiar al rol de PostgreSQL que tiene RLS aplicado ──
    const pgRole = PG_ROLE_MAP[role];
    if (pgRole) {
      await client.query(`SET ROLE ${pgRole}`);
    }

    // ── Si es veterinario, setear la variable de sesión para RLS ──
    if (role === 'veterinario' && vetId) {
      const safeVetId = parseInt(vetId, 10);
      if (isNaN(safeVetId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'X-Vet-Id inválido' });
      }
      await client.query(`SET LOCAL app.current_vet_id = '${safeVetId}'`);
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

    await client.query('COMMIT');

    res.json({
      rol:      role || 'sin rol',
      total:    rows.length,
      mascotas: rows,
    });

  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[ERROR] GET /api/mascotas:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      // IMPORTANTE: resetear rol antes de devolver la conexión al pool.
      // Si no, la próxima request que use esta conexión heredaría el rol.
      try { await client.query('RESET ROLE'); } catch (_) {}
      client.release();
    }
  }
});

module.exports = router;