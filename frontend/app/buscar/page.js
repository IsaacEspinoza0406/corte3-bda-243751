'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3001';

export default function BuscarPage() {
  const { rol, vetId } = useAuth();

  const [nombre, setNombre]       = useState('');
  const [mascotas, setMascotas]   = useState([]);
  const [total, setTotal]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // ── Función de búsqueda estabilizada con useCallback ──
  // Recibe el término de búsqueda como parámetro para evitar
  // problemas de closure con el state `nombre`.
  const buscar = useCallback(async (termino = '') => {
    if (!rol) return; // No buscar si no hay rol (aún no cargó el context)

    setLoading(true);
    setError('');

    try {
      const params = termino.trim() ? `?nombre=${encodeURIComponent(termino)}` : '';
      const res = await fetch(`${API_URL}/api/mascotas${params}`, {
        headers: {
          'X-Role':   rol,
          'X-Vet-Id': vetId,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      setMascotas(data.mascotas);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      setMascotas([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, [rol, vetId]);

  // ── Cargar mascotas automáticamente cuando el rol esté disponible ──
  // Se ejecuta cuando:
  //   1. El componente monta Y el rol ya tiene valor, O
  //   2. El rol cambia de '' a un valor válido
  useEffect(() => {
    if (rol) {
      buscar('');
    }
  }, [rol, buscar]);

  // ── Handler del botón que usa el valor actual del input ──
  const handleBuscar = () => {
    buscar(nombre);
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
    <main className="max-w-4xl mx-auto p-6">
      {/* ── Header de sesión ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          🔍 Búsqueda de Mascotas
        </h1>
        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
          Sesión: {sesionLabel}
        </span>
      </div>

      {/* ── Barra de búsqueda ── */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Buscar mascota por nombre..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleBuscar}
          disabled={loading}
          className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg
                     hover:bg-blue-700 transition-colors disabled:opacity-50
                     cursor-pointer"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="text-red-600 bg-red-50 rounded-lg p-3 mb-4">
          ❌ {error}
        </p>
      )}

      {/* ── Total de resultados ── */}
      {total !== null && (
        <p className="text-sm text-gray-600 mb-3">
          Mostrando <strong>{total}</strong> mascotas
        </p>
      )}

      {/* ── Tabla de resultados ── */}
      {total !== null && mascotas.length === 0 ? (
        <p className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
          No se encontraron mascotas
        </p>
      ) : mascotas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">ID</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Especie</th>
                <th className="text-left px-4 py-3 font-semibold">Fecha de Nacimiento</th>
              </tr>
            </thead>
            <tbody>
              {mascotas.map((m, i) => (
                <tr
                  key={m.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-2">{m.id}</td>
                  <td className="px-4 py-2 font-medium">{m.nombre}</td>
                  <td className="px-4 py-2 capitalize">{m.especie}</td>
                  <td className="px-4 py-2">
                    {m.fecha_nacimiento
                      ? new Date(m.fecha_nacimiento).toLocaleDateString('es-MX')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Navegación ── */}
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/vacunacion"
          className="text-blue-600 hover:underline">
          → Vacunación pendiente
        </Link>
        <Link href="/"
          className="text-gray-500 hover:underline">
          ← Cambiar rol
        </Link>
      </div>
    </main>
  );
}