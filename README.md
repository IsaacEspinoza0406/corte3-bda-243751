# Clínica Veterinaria — Sistema Full-Stack con Seguridad de BD

Sistema multi-usuario para la gestión de una clínica veterinaria con control de acceso por roles, seguridad a nivel de fila (RLS) en PostgreSQL, protección contra SQL injection mediante queries parametrizadas, y caché Redis para optimizar consultas costosas. Proyecto final de Base de Datos Avanzadas, Corte 3.

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7--alpine-DC382D?logo=redis&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Características de Seguridad Implementadas

- **Row Level Security (RLS)** en 3 tablas: `mascotas`, `citas`, `vacunas_aplicadas`
- **3 roles de PostgreSQL** con permisos GRANT/REVOKE finos por tabla
- **Queries 100% parametrizadas** con placeholders `$1, $2...` del driver `pg` (prevención de SQL injection)
- **Variable de sesión** `app.current_vet_id` para identificar al veterinario activo en políticas RLS
- **SET ROLE** en cada request para salir del usuario superusuario y aplicar RLS
- **Caché Redis** con TTL de 300s e invalidación automática al aplicar vacunas
- **FORCE ROW LEVEL SECURITY** para que RLS aplique incluso al dueño de las tablas
- **Sin SECURITY DEFINER** — todas las funciones/procedures corren con los permisos del usuario invocador

---

## Levantar el Proyecto

```bash
git clone https://github.com/IsaacEspinoza0406/corte3-bda-243751.git
cd corte3-bda-243751
cp .env.example .env       # editar con tus valores (mínimo: POSTGRES_PASSWORD)
docker-compose up --build
```

| Servicio  | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000       |
| API       | http://localhost:3001       |
| Health    | http://localhost:3001/health|
| PostgreSQL| localhost:5440             |
| Redis     | localhost:6379             |

### Usuarios de prueba

| Usuario        | Rol               | Contraseña |
|----------------|-------------------|------------|
| vet_lopez      | rol_veterinario   | vet123     |
| recepcion_ana  | rol_recepcion     | rec123     |
| admin_isaac    | rol_administrador | adm123     |

---

## Estructura del Proyecto

```
corte3-bda-243751/
├── schema_corte3.sql              ← Schema base (del profesor, NO se modifica)
├── docker-compose.yml
├── backend/
│   ├── 01_procedures.sql          ← sp_agendar_cita
│   ├── 02_triggers.sql            ← trg_historial_cita, fn_total_facturado
│   ├── 03_views.sql               ← v_mascotas_vacunacion_pendiente
│   ├── 04_roles_y_permisos.sql    ← GRANT/REVOKE por rol
│   └── 05_rls.sql                 ← Políticas RLS
├── api/                           ← Node.js + Express
│   └── src/
│       ├── app.js                 ← Servidor Express
│       ├── db.js                  ← Pool PostgreSQL
│       ├── cache.js               ← Cliente Redis
│       └── routes/
│           ├── mascotas.js        ← GET /api/mascotas
│           ├── citas.js           ← GET/POST /api/citas
│           ├── vacunas.js         ← POST /api/vacunas
│           └── vacunacion.js      ← GET /api/vacunacion-pendiente
└── frontend/                      ← Next.js 16 (App Router)
    └── app/
        ├── page.js                ← Selector de rol
        ├── buscar/page.js         ← Búsqueda de mascotas
        └── vacunacion/page.js     ← Vacunación pendiente con caché
```

---

## Decisiones de Diseño — Preguntas del Profesor

### 1. ¿Qué política RLS aplicaste a la tabla `mascotas`?

La política `policy_mascotas_vet` restringe la visibilidad de mascotas para el rol veterinario:

```sql
CREATE POLICY policy_mascotas_vet
    ON mascotas
    FOR SELECT
    TO rol_veterinario
    USING (
        EXISTS (
            SELECT 1
              FROM vet_atiende_mascota
             WHERE vet_atiende_mascota.mascota_id = mascotas.id
               AND vet_atiende_mascota.vet_id =
                   current_setting('app.current_vet_id', TRUE)::INT
        )
    );
```

Esta política filtra cada fila de `mascotas` verificando que exista una relación activa en `vet_atiende_mascota` entre esa mascota y el veterinario actual (identificado por la variable de sesión `app.current_vet_id`). Si no existe la relación, la fila es invisible para ese veterinario. Esto garantiza que el Dr. López (vet_id=1) solo vea a Firulais, Toby y Max — las 3 mascotas que tiene asignadas — y no pueda acceder a los datos clínicos de pacientes de otros veterinarios.

---

### 2. Tu estrategia de identificación del veterinario tiene un vector de ataque. ¿Cuál es?

El vector de ataque es la **suplantación de identidad vía headers HTTP**: un cliente malicioso podría enviar un header `X-Vet-Id: 2` cuando en realidad es el veterinario con ID 1, y así ver mascotas que no le corresponden. El sistema mitiga esto en el backend de dos formas: primero, el valor del header se valida con `parseInt(vetId, 10)` y se rechaza con HTTP 400 si no es un entero válido, lo que previene inyección de valores no numéricos. Segundo, la variable de sesión se setea con `SET LOCAL` dentro de una transacción, lo cual limita su alcance a esa transacción específica y no contamina otras conexiones del pool. Sin embargo, la mitigación completa requeriría una capa de autenticación real (JWT, sesiones) que vincule la identidad del usuario con su vet_id de forma no manipulable — esto está fuera del alcance de este proyecto pero se reconoce como limitación.

---

### 3. Si usas SECURITY DEFINER en algún procedure, ¿qué medida tomaste? Si no, justifica.

No usamos `SECURITY DEFINER` en ningún procedure ni función. La decisión fue intencional: `sp_agendar_cita` corre con los permisos del usuario invocador (`SECURITY INVOKER`, que es el default). Esto significa que las políticas RLS se evalúan contra el rol del veterinario o recepcionista que hace la llamada, no contra el superusuario dueño de la función. Si usáramos `SECURITY DEFINER`, la función correría como `vetadmin` (superusuario con `BYPASSRLS`), lo cual anularía completamente las políticas RLS y permitiría que cualquier usuario inserte citas para mascotas que no le corresponden. La única excepción donde `SECURITY DEFINER` sería necesario es en el trigger de auditoría (`fn_registrar_historial_cita`), pero optamos por otorgar `INSERT` en `historial_movimientos` a los roles que insertan citas, manteniendo así el principio de mínimo privilegio sin escalamiento de permisos.

---

### 4. ¿Qué TTL le pusiste al caché Redis y por qué?

TTL de **300 segundos (5 minutos)**. La vista `v_mascotas_vacunacion_pendiente` hace un `LEFT JOIN` con una subconsulta de agregación (`MAX(fecha_aplicacion)`) sobre `vacunas_aplicadas`, lo que la convierte en la consulta más costosa del sistema. Un TTL de 5 minutos balancea entre rendimiento y frescura: los datos de vacunación pendiente no cambian con frecuencia extrema (un veterinario aplica unas pocas vacunas por hora), así que 5 minutos es aceptable para un sistema de gestión interna. Si el TTL fuera **demasiado bajo** (ej: 10 segundos), prácticamente cada request iría a la base de datos, eliminando el beneficio del caché. Si fuera **demasiado alto** (ej: 1 hora), una mascota recién vacunada seguiría apareciendo como "pendiente" durante hasta 60 minutos, generando confusión — aunque nuestro sistema mitiga esto con **invalidación activa**: cuando se aplica una vacuna en `POST /api/vacunas`, se ejecuta `redis.del('vacunacion_pendiente')` para forzar un `CACHE MISS` en la siguiente consulta.

---

### 5. Elige un endpoint crítico y pega la línea donde el backend maneja el input del usuario.

**Endpoint:** `GET /api/mascotas?nombre=...`
**Archivo:** `api/src/routes/mascotas.js`, líneas 57-58:

```javascript
query  = 'SELECT * FROM mascotas WHERE nombre ILIKE $1 ORDER BY id';
params = [`%${nombre}%`];
```

El valor de `nombre` proviene directamente del query param del request (`req.query.nombre`) y se pasa como elemento del array `params`. El driver `pg` de Node.js envía este valor como un parámetro separado en el protocolo de PostgreSQL (extended query protocol), **nunca como parte del string SQL**. Esto significa que aunque el usuario escriba `' OR '1'='1`, el driver lo trata literalmente como el texto a buscar, no como instrucciones SQL. La separación entre la instrucción SQL y los datos es estructural y no depende de escapar caracteres.

---

### 6. Si revocas todos los permisos de veterinario excepto SELECT en mascotas, ¿qué deja de funcionar?

Tres operaciones concretas que se romperían:

1. **Agendar citas (`INSERT INTO citas`)**: El veterinario ya no podría llamar a `sp_agendar_cita` ni insertar directamente en la tabla `citas`, porque se le revocó el `INSERT` y el `USAGE` sobre la secuencia `citas_id_seq`.

2. **Registrar vacunas aplicadas (`INSERT INTO vacunas_aplicadas`)**: No podría registrar que aplicó una vacuna a una mascota, ya que se le revocó el `INSERT` en `vacunas_aplicadas` y el acceso a la secuencia `vacunas_aplicadas_id_seq`.

3. **Ver inventario de vacunas (`SELECT ON inventario_vacunas`)**: No podría consultar qué vacunas existen en la clínica ni verificar stock antes de aplicar una vacuna, porque se revocó el `SELECT` en `inventario_vacunas`.
