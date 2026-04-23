const { Router } = require('express');
const pool = require('../db');

const router = Router();


router.post('/login', async (req, res) => {
  const { usuario, cedula } = req.body;

  if (!usuario || !cedula) {
    return res.status(400).json({ error: 'Usuario y cédula son requeridos' });
  }

  try {
    // Mapa de usuarios a roles
    const usuarioRol = {
      'vet_lopez':     { rol: 'veterinario', vetId: '1' },
      'vet_garcia':    { rol: 'veterinario', vetId: '2' },
      'vet_mendez':    { rol: 'veterinario', vetId: '3' },
      'recepcion_ana': { rol: 'recepcion',     vetId: '' },
      'admin_isaac':   { rol: 'administrador', vetId: '' },
    };

    const userInfo = usuarioRol[usuario.trim()];
    if (!userInfo) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (userInfo.rol === 'veterinario') {
      const { rows } = await pool.query(
        'SELECT id, nombre FROM veterinarios WHERE id = $1 AND cedula = $2 AND activo = TRUE',
        [userInfo.vetId, cedula.trim()]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Cédula incorrecta o veterinario inactivo' });
      }

      return res.json({
        rol:     userInfo.rol,
        vetId:   userInfo.vetId,
        nombre:  rows[0].nombre,
      });
    }


    const { Client } = require('pg');
    const client = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'clinica_vet',
      user: usuario.trim(),
      password: cedula.trim(),
    });

    try {
      await client.connect();
      await client.end();
    } catch (dbErr) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    return res.json({
      rol:    userInfo.rol,
      vetId:  '',
      nombre: usuario === 'recepcion_ana' ? 'Ana · Recepción' : 'Isaac · Admin',
    });

  } catch (err) {
    console.error('[ERROR] POST /api/auth/login:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;