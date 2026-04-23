# Cuaderno de Ataques — Clínica Veterinaria

Base de Datos Avanzadas · Corte 3 · UP Chiapas · Abril 2026

Este documento demuestra que las defensas de seguridad del sistema funcionan correctamente: las queries parametrizadas bloquean SQL injection, RLS filtra datos por veterinario, y el caché Redis optimiza consultas costosas.

---

## Sección 1 — Ataques de SQL Injection (los 3 fallan)

Las queries de la API usan **placeholders `$1, $2...`** del driver `pg` (node-postgres).
El driver envía los valores como parámetros separados en el protocolo de PostgreSQL
(extended query protocol), nunca como parte del string SQL. Esto hace que la
inyección sea **estructuralmente imposible**, no depende de escapar caracteres.

---

### Ataque 1 — Quote escape clásico (`' OR '1'='1`)

**Objetivo:** Hacer que la query retorne TODAS las mascotas sin importar el nombre.

**Input probado:**
```
' OR '1'='1
```

**Pantalla:** Búsqueda de mascotas (`/buscar`), campo "Buscar mascota por nombre"

**Resultado esperado del atacante:** Todas las mascotas de la BD.
**Resultado real:** 0 mascotas. La búsqueda trata el input literalmente como un nombre.
**Captura de pantalla:** docs/screenshots/ataque1.png
**Línea que defendió:**

Archivo: `api/src/routes/mascotas.js`, líneas 57-58:
```javascript
query  = 'SELECT * FROM mascotas WHERE nombre ILIKE $1 ORDER BY id';
params = [`%${nombre}%`];
```

**¿Por qué falla el ataque?**
El driver `pg` envía `%' OR '1'='1%` como un **valor de dato**, no como instrucción SQL.
PostgreSQL ejecuta:
```sql
SELECT * FROM mascotas WHERE nombre ILIKE '%'' OR ''1''=''1%' ORDER BY id;
```
No hay ninguna mascota cuyo nombre contenga esa cadena, así que retorna 0 filas.

---

### Ataque 2 — Stacked query (`'; DROP TABLE mascotas; --`)

**Objetivo:** Inyectar un segundo comando SQL para eliminar la tabla de mascotas.

**Input probado:**
```
'; DROP TABLE mascotas; --
```

**Pantalla:** Búsqueda de mascotas (`/buscar`), campo "Buscar mascota por nombre"

**Resultado esperado del atacante:** La tabla `mascotas` es eliminada.
**Resultado real:** 0 mascotas encontradas. La tabla sigue intacta.
**Captura de pantalla:** docs/screenshots/ataque2.png
**Línea que defendió:**

Archivo: `api/src/routes/mascotas.js`, líneas 57-58 (misma defensa):
```javascript
query  = 'SELECT * FROM mascotas WHERE nombre ILIKE $1 ORDER BY id';
params = [`%${nombre}%`];
```

**¿Por qué falla el ataque?**
El protocolo extended query de PostgreSQL **no permite stacked queries** cuando se
usan parámetros. El string `'; DROP TABLE mascotas; --` se trata como un valor de
texto literal para el `ILIKE`. El `DROP TABLE` nunca se interpreta como una
instrucción SQL separada. Adicionalmente, incluso si llegara a ejecutarse de alguna forma,
`rol_veterinario` no tiene permisos `DROP` sobre ninguna tabla.

---

### Ataque 3 — Union-based (`' UNION SELECT...`)

**Objetivo:** Unir los resultados con datos de otra tabla (veterinarios) para exfiltrar información.

**Input probado:**
```
' UNION SELECT id,nombre,null,null FROM veterinarios; --
```

**Pantalla:** Búsqueda de mascotas (`/buscar`), campo "Buscar mascota por nombre"

**Resultado esperado del atacante:** Datos de la tabla `veterinarios` mezclados con mascotas.
**Resultado real:** 0 mascotas encontradas. No hay datos exfiltrados.
**Captura de pantalla:** docs/screenshots/ataque3.png
**Línea que defendió:**

Archivo: `api/src/routes/mascotas.js`, líneas 57-58 (misma defensa):
```javascript
query  = 'SELECT * FROM mascotas WHERE nombre ILIKE $1 ORDER BY id';
params = [`%${nombre}%`];
```

**¿Por qué falla el ataque?**
El `UNION SELECT` es parte del **valor** del parámetro, no de la estructura SQL.
PostgreSQL busca mascotas cuyo nombre contenga literalmente el texto
`' UNION SELECT id,nombre,null,null FROM veterinarios; --`.
No encuentra ninguna, retorna 0 filas. La estructura `UNION` nunca se evalúa
como SQL porque el parámetro y la instrucción viajan por canales separados en
el protocolo.

---

## Sección 2 — Demostración de RLS en Acción

### Contexto: Asignaciones vet → mascotas (según `vet_atiende_mascota`)

| Veterinario                | vet_id | Mascotas asignadas                           |
|----------------------------|--------|---------------------------------            |
| Dr. Fernando López Castro  | 1      | Firulais (1), Toby (5), Max (7)             |
| Dra. Sofía García Velasco  | 2      | Misifú (2), Luna (4), Dante (9)             |
| Dr. Andrés Méndez Bravo    | 3      | Rocky (3), Pelusa (6), Coco (8), Mango (10) |
| Dra. Mónica Sánchez Aguilar| 4      | Ninguna (inactiva)                          |

---

### Prueba 2.1 — Veterinario ID 1 (Dr. López) ve solo sus 3 mascotas

**Pasos:**
1. En `/`, seleccionar rol **Veterinario**, ID: **1**
2. Click en "Ingresar al sistema"
3. En `/buscar`, click en "Buscar" (sin escribir nombre)

**Resultado esperado:** La tabla muestra solo **3 mascotas**: Firulais, Toby, Max
**Resultado real:**

**Política RLS que lo produce:**
```sql
-- Archivo: backend/05_rls.sql
CREATE POLICY policy_mascotas_vet ON mascotas
    FOR SELECT TO rol_veterinario
    USING (EXISTS (
        SELECT 1 FROM vet_atiende_mascota
        WHERE mascota_id = mascotas.id
        AND vet_id = current_setting('app.current_vet_id', TRUE)::INT
    ));
```
La API ejecuta `SET ROLE rol_veterinario` + `SET LOCAL app.current_vet_id = '1'`
antes de la query. PostgreSQL evalúa la política y solo retorna las mascotas
donde existe una fila en `vet_atiende_mascota` con `vet_id = 1`.

---

### Prueba 2.2 — Veterinario ID 2 (Dra. García) ve solo sus 3 mascotas

**Pasos:**
1. Volver a `/`, seleccionar rol **Veterinario**, ID: **2**
2. En `/buscar`, click en "Buscar"

**Resultado esperado:** La tabla muestra solo **3 mascotas**: Misifú, Luna, Dante
---

### Prueba 2.3 — Recepción ve TODAS las mascotas

**Pasos:**
1. Volver a `/`, seleccionar rol **Recepción**
2. En `/buscar`, click en "Buscar"

**Resultado esperado:** La tabla muestra las **10 mascotas** del sistema.

**Política RLS que lo produce:**
```sql
CREATE POLICY policy_mascotas_recepcion ON mascotas
    FOR SELECT TO rol_recepcion
    USING (TRUE);
```
La condición `TRUE` permite que la recepción vea todas las filas sin filtro.

---

### Prueba 2.4 — Administrador ve TODAS las mascotas

**Pasos:**
1. Volver a `/`, seleccionar rol **Administrador**
2. En `/buscar`, click en "Buscar"

**Resultado esperado:** La tabla muestra las **10 mascotas** del sistema.

**¿Por qué ve todo?** El rol `rol_administrador` tiene `BYPASSRLS`, así que
PostgreSQL ni siquiera evalúa las políticas. La API no ejecuta `SET ROLE`
para el administrador — la conexión se mantiene como `vetadmin`.

---

## Sección 3 — Demostración de Caché Redis

### Configuración del caché

| Parámetro     | Valor                                |
|---------------|--------------------------------      |
| Clave Redis   | `vacunacion_pendiente`               |
| TTL           | 300 segundos (5 minutos)             |
| Invalidación  | `redis.del()` en `POST /api/vacunas` |
| Endpoint      | `GET /api/vacunacion-pendiente`      |

---

### Prueba 3.1 — Primera consulta (CACHE MISS)

**Pasos:**
1. En `/vacunacion`, click en "Actualizar consulta"
2. Observar el badge de la respuesta y los logs de la API

**Resultado esperado:**
- Badge: **BASE DE DATOS 🔴**
- Response JSON incluye `"source": "db"`

**Logs esperados en la terminal de la API:**
```
[2026-04-XX...] [CACHE MISS] vacunacion_pendiente
[BD] Consulta completada en XXXms
```

---

### Prueba 3.2 — Segunda consulta (CACHE HIT)

**Pasos:**
1. Sin esperar 5 minutos, click de nuevo en "Actualizar consulta"

**Resultado esperado:**
- Badge: **CACHÉ HIT 🟢**
- Response JSON incluye `"source": "cache"`
- La respuesta es notablemente más rápida

**Logs esperados:**
```
[2026-04-XX...] [CACHE HIT] vacunacion_pendiente
```

---

### Prueba 3.3 — Invalidación por aplicar vacuna + nuevo CACHE MISS

**Pasos:**
1. Aplicar una vacuna usando curl o Postman:
   ```bash
   curl -X POST http://localhost:3001/api/vacunas \
     -H "Content-Type: application/json" \
     -H "X-Role: veterinario" \
     -H "X-Vet-Id: 1" \
     -d '{"mascota_id":1,"vacuna_id":1,"veterinario_id":1,"costo_cobrado":350}'
   ```
2. En `/vacunacion`, click en "Actualizar consulta"

**Resultado esperado:**
- El caché fue invalidado por el POST
- Badge: **BASE DE DATOS 🔴** (CACHE MISS porque la clave fue eliminada)

**Logs esperados:**
```
[2026-04-XX...] [CACHE INVALIDATED] vacunacion_pendiente
[2026-04-XX...] [CACHE MISS] vacunacion_pendiente
[BD] Consulta completada en XXXms
```

---

### ¿Por qué este TTL y esta estrategia?

**Clave:** `vacunacion_pendiente` — una sola clave para toda la vista.

**TTL de 300 segundos:** Los datos de vacunación pendiente no cambian cada segundo.
En una clínica veterinaria típica, se aplican unas pocas vacunas por hora.
Cinco minutos es un balance razonable entre rendimiento (evitar una query costosa con
`LEFT JOIN` + `GROUP BY` + `MAX()`) y frescura de datos.

**Invalidación activa:** No dependemos solo del TTL. Cada vez que se aplica una vacuna
(`POST /api/vacunas`), ejecutamos `redis.del('vacunacion_pendiente')`. Esto fuerza un
`CACHE MISS` en la siguiente consulta, garantizando que la mascota recién vacunada
desaparezca de la lista de pendientes de inmediato. Esta estrategia combina lo mejor de
ambos mundos: el TTL protege contra datos obsoletos por otras causas (ediciones directas
en la BD), y la invalidación activa mantiene la consistencia en el flujo normal de uso.
