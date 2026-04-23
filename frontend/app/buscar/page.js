'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3001';

export default function BuscarPage() {
  const { rol, vetId, usuario } = useAuth();

  const [nombre, setNombre]       = useState('');
  const [mascotas, setMascotas]   = useState([]);
  const [total, setTotal]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');


  const buscar = useCallback(async (termino = '') => {
    if (!rol) return; 

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


  useEffect(() => {
    if (rol) {
      buscar('');
    }
  }, [rol, buscar]);

  const handleBuscar = () => {
    buscar(nombre);
  };

  const sesionLabel = usuario || (
    rol === 'veterinario'
      ? `Veterinario (ID: ${vetId})`
      : rol === 'recepcion'
        ? 'Recepción'
        : rol === 'administrador'
          ? 'Administrador'
          : 'Sin rol'
  );

  const especieIcon = (especie) => {
  const s = (especie || '').toLowerCase();
  if (s.includes('perro') || s.includes('can')) return '🐕';
  if (s.includes('gato') || s.includes('felin')) return '🐈';
  if (s.includes('conejo')) return '🐇';
  if (s.includes('ave') || s.includes('pájaro') || s.includes('pajaro')) return '🐦';
  return '🐾';
};

  return (
    <div className="min-h-screen bg-vet-bg">
      {}
      <header className="sticky top-0 z-50 bg-vet-dark shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/buscar" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">🐾</span>
            <span className="text-white font-bold text-lg tracking-tight">VetSystem</span>
          </Link>
          <span className="text-xs bg-white/15 text-white/90 px-3 py-1.5 rounded-full font-medium backdrop-blur-sm">
            {sesionLabel}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-vet-dark">
            Búsqueda de Mascotas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Busca en el registro de mascotas de la clínica
          </p>
        </div>

        {}
        <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 p-5 mb-6 animate-vet-fade-in">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Buscar mascota por nombre..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3
                           bg-white vet-focus transition-all duration-200 text-sm"
              />
            </div>
            <button
              onClick={handleBuscar}
              disabled={loading}
              className="bg-vet-mid text-white font-semibold px-8 py-3 rounded-xl
                         hover:bg-vet-dark transition-all duration-200 disabled:opacity-50
                         cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap"
            >
              {loading ? (
                <span className="animate-vet-pulse">Buscando...</span>
              ) : 'Buscar'}
            </button>
          </div>
        </div>

        {}
        {error && (
          <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg text-sm rounded-xl p-4 mb-6 animate-vet-fade-in border border-red-200">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {}
        {total !== null && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-vet-mid rounded-full" />
            <p className="text-sm text-vet-dark font-medium">
              Mostrando <strong>{total}</strong> mascotas
            </p>
          </div>
        )}

        {}
        {total !== null && mascotas.length === 0 ? (
          <div className="text-center py-16 bg-vet-card rounded-2xl border border-gray-100 shadow-md">
            <span className="text-4xl mb-3 block">🐾</span>
            <p className="text-gray-500">No se encontraron mascotas</p>
          </div>
        ) : mascotas.length > 0 && (
          <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-vet-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-vet-dark text-white">
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">ID</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Especie</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Fecha de Nacimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {mascotas.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-vet-row'} hover:bg-vet-mid/5 transition-colors duration-150`}
                    >
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{m.id}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{m.nombre}</td>
                      <td className="px-5 py-3 capitalize">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{especieIcon(m.especie)}</span>
                          <span className="text-gray-700">{m.especie}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {m.fecha_nacimiento
                          ? new Date(m.fecha_nacimiento).toLocaleDateString('es-MX')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/citas"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-vet-mid text-vet-mid 
                       font-semibold text-sm hover:bg-vet-mid hover:text-white transition-all duration-200 no-underline">
            <span>📅</span>
            Gestión de Citas
          </Link>
          <Link href="/vacunacion"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-vet-mid text-vet-mid 
                       font-semibold text-sm hover:bg-vet-mid hover:text-white transition-all duration-200 no-underline">
            <span>💉</span>
            Vacunación pendiente
          </Link>
          <Link href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-500
                       font-semibold text-sm hover:bg-gray-100 transition-all duration-200 no-underline">
            <span>🚪</span>
            Cambiar rol
          </Link>
        </div>
      </main>
    </div>
  );
}