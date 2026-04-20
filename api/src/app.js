require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar conexiones
const pool = require('./db');
const redis = require('./cache');

// Importar rutas
const mascotasRouter = require('./routes/mascotas');
const vacunacionRouter = require('./routes/vacunacion');
const citasRouter = require('./routes/citas');
const vacunasRouter = require('./routes/vacunas');

const app = express();

// ───── Middlewares ─────
app.use(cors());
app.use(express.json());

// ───── Ruta de salud ─────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ───── Rutas de la API ─────
app.use('/api/mascotas', mascotasRouter);
app.use('/api/vacunacion-pendiente', vacunacionRouter);
app.use('/api/citas', citasRouter);
app.use('/api/vacunas', vacunasRouter);

// ───── Arranque del servidor ─────
const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🐾 API Clínica Veterinaria corriendo en puerto ${PORT}`);
});
