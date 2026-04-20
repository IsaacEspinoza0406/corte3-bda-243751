const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
});

redis.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redis.on('error', (err) => {
  console.error(`❌ Error de conexión Redis: ${err.message}`);
});

module.exports = redis;
