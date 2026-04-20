'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VacunacionPage() {
  const { rol, vetId } = useAuth();

  const [data, setData]         = useState([]);
  const [source, setSource]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const consultar = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/vacunacion-pendiente`, {
        headers: {
          'X-Role':   rol,
          'X-Vet-Id': vetId,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const json = await res.json();
      setData(json.data);
      setSource(json.source);
    } catch (err) {
      setError(err.message);
      setData([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Etiqueta de sesión ──
  const sesionLabel = rol === 'veterinario'
    ? `Veterinario (ID: ${vetId})`
    : rol === 'recepcion'
      ? 'Recepción'
      : rol === 'administrador'
        ? 'Administrador'
        : 'Sin rol';

  return (
    <main className="max-w-5xl mx-auto p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          💉 Vacunación Pendiente
        </h1>
        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
          Sesión: {sesionLabel}
        </span>
      </div>

      {/* ── Controles ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={consultar}
          disabled={loading}
          className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg
                     hover:bg-blue-700 transition-colors disabled:opacity-50
                     cursor-pointer"
        >
          {loading ? 'Consultando...' : 'Actualizar consulta'}
        </button>

        {/* ── Badge de fuente (CACHE HIT / BASE DE DATOS) ── */}
        {source && (
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            source === 'cache'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {source === 'cache' ? 'CACHÉ HIT 🟢' : 'BASE DE DATOS 🔴'}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="text-red-600 bg-red-50 rounded-lg p-3 mb-4">
          ❌ {error}
        </p>
      )}

      {/* ── Tabla de resultados ── */}
      {data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Mascota</th>
                <th className="text-left px-4 py-3 font-semibold">Especie</th>
                <th className="text-left px-4 py-3 font-semibold">Dueño</th>
                <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold">Última Vacuna</th>
                <th className="text-left px-4 py-3 font-semibold">Días sin Vacuna</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.mascota_id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-2 font-medium">{row.nombre_mascota}</td>
                  <td className="px-4 py-2 capitalize">{row.especie}</td>
                  <td className="px-4 py-2">{row.nombre_dueno}</td>
                  <td className="px-4 py-2">{row.telefono_dueno || '—'}</td>
                  <td className="px-4 py-2">
                    {row.ultima_vacuna
                      ? new Date(row.ultima_vacuna).toLocaleDateString('es-MX')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">{row.dias_sin_vacuna}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      row.estado === 'NUNCA VACUNADA'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {row.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : source !== null && (
        <p className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
          No hay mascotas con vacunación pendiente
        </p>
      )}

      {/* ── Navegación ── */}
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/buscar"
          className="text-blue-600 hover:underline">
          ← Buscar mascotas
        </Link>
        <Link href="/"
          className="text-gray-500 hover:underline">
          ← Cambiar rol
        </Link>
      </div>
    </main>
  );
}
