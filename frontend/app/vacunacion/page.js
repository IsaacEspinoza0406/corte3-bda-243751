'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VacunacionPage() {
  const { rol, vetId, usuario } = useAuth();

  const [data, setData]         = useState([]);
  const [source, setSource]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  //Form state para aplicar vacunas.
  const [formMascotaId, setFormMascotaId]         = useState('');
  const [formVacunaId, setFormVacunaId]           = useState('');
  const [formVeterinarioId, setFormVeterinarioId] = useState('');
  const [formCosto, setFormCosto]                 = useState('');
  const [formLoading, setFormLoading]             = useState(false);
  const [formError, setFormError]                 = useState('');
  const [formSuccess, setFormSuccess]             = useState('');

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

  const handleAplicarVacuna = async () => {
    setFormError('');
    setFormSuccess('');

    if (!formMascotaId || !formVacunaId || !formVeterinarioId || formCosto === '') {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/vacunas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role':   rol,
          'X-Vet-Id': vetId,
        },
        body: JSON.stringify({
          mascota_id:     parseInt(formMascotaId, 10),
          vacuna_id:      parseInt(formVacunaId, 10),
          veterinario_id: parseInt(formVeterinarioId, 10),
          costo_cobrado:  parseFloat(formCosto),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const result = await res.json();
      setFormSuccess(`${result.mensaje} (ID: ${result.id})`);

      setFormMascotaId('');
      setFormVacunaId('');
      setFormVeterinarioId('');
      setFormCosto('');

      await consultar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
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
    if (s.includes('ave') || s.includes('pájaro')) return '🐦';
    return '🐾';
  };

  return (
    <div className="min-h-screen bg-vet-bg">
      {}
      <header className="sticky top-0 z-50 bg-vet-dark shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/buscar" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">🐾</span>
            <span className="text-white font-bold text-lg tracking-tight">VetSystem</span>
          </Link>
          <span className="text-xs bg-white/15 text-white/90 px-3 py-1.5 rounded-full font-medium backdrop-blur-sm">
            {sesionLabel}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-vet-dark">
            Vacunación Pendiente
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Mascotas que requieren atención de vacunación
          </p>
        </div>

        {}
        {source && (
          <div className={`inline-flex items-center gap-2.5 text-sm font-bold px-5 py-3 rounded-2xl mb-6 animate-vet-fade-in ${
            source === 'cache'
              ? 'bg-vet-success-bg text-vet-success-text border-2 border-green-300'
              : 'bg-vet-accent-bg text-vet-accent-text border-2 border-orange-300'
          }`}>
            <span className={`w-3 h-3 rounded-full ${
              source === 'cache' ? 'bg-green-500' : 'bg-vet-accent'
            }`} />
            {source === 'cache' ? '🟢 CACHÉ HIT' : '🔴 BASE DE DATOS'}
          </div>
        )}

        {}
        <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 p-5 mb-6 animate-vet-fade-in">
          <button
            onClick={consultar}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-vet-mid text-white font-semibold px-6 py-3 rounded-xl
                       hover:bg-vet-dark transition-all duration-200 disabled:opacity-50
                       cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="animate-vet-pulse">Consultando...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                Actualizar consulta
              </>
            )}
          </button>
        </div>

        {}
        {error && (
          <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg text-sm rounded-xl p-4 mb-6 animate-vet-fade-in border border-red-200">
            <span></span>
            <span>{error}</span>
          </div>
        )}

        {}
        {data.length > 0 ? (
          <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-vet-fade-in mb-8">
            {}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-vet-mid rounded-full" />
              <p className="text-sm text-vet-dark font-medium">
                <strong>{data.length}</strong> mascotas con vacunación pendiente
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-vet-dark text-white">
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Mascota</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Especie</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Dueño</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Última Vacuna</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Días sin Vacuna</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr
                      key={row.mascota_id}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-vet-row'} hover:bg-vet-mid/5 transition-colors duration-150`}
                    >
                      <td className="px-5 py-3 font-semibold text-gray-800">{row.nombre_mascota}</td>
                      <td className="px-5 py-3 capitalize">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{especieIcon(row.especie)}</span>
                          <span className="text-gray-700">{row.especie}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{row.nombre_dueno}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{row.telefono_dueno || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {row.ultima_vacuna
                          ? new Date(row.ultima_vacuna).toLocaleDateString('es-MX')
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-gray-800">{row.dias_sin_vacuna}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                          row.estado === 'NUNCA VACUNADA'
                            ? 'bg-vet-error-bg text-vet-error-text border border-red-200'
                            : 'bg-vet-accent-bg text-vet-accent-text border border-orange-200'
                        }`}>
                          {row.estado === 'NUNCA VACUNADA' ? '⚠️' : '⏰'}
                          {row.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : source !== null && (
          <div className="text-center py-16 bg-vet-card rounded-2xl border border-gray-100 shadow-md animate-vet-fade-in mb-8">
            <span className="text-4xl mb-3 block">✅</span>
            <p className="text-gray-500">No hay mascotas con vacunación pendiente</p>
          </div>
        )}

        { }
        <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 p-6 mb-8 animate-vet-fade-in">
          <h2 className="text-lg font-bold text-vet-dark mb-1 flex items-center gap-2">
            <span>💉</span>
            Registrar Vacuna Aplicada
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Al registrar una vacuna, el caché Redis se invalida automáticamente
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mascota ID
              </label>
              <input
                type="number"
                placeholder="Ej: 1"
                value={formMascotaId}
                onChange={(e) => setFormMascotaId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                           bg-white vet-focus transition-all duration-200 text-sm"
              />
            </div>

            {}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Vacuna ID
              </label>
              <input
                type="number"
                placeholder="Ej: 1"
                value={formVacunaId}
                onChange={(e) => setFormVacunaId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                           bg-white vet-focus transition-all duration-200 text-sm"
              />
            </div>

            {}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Veterinario ID
              </label>
              <input
                type="number"
                placeholder="Ej: 1"
                value={formVeterinarioId}
                onChange={(e) => setFormVeterinarioId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                           bg-white vet-focus transition-all duration-200 text-sm"
              />
            </div>

            {}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Costo
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ej: 350.00"
                value={formCosto}
                onChange={(e) => setFormCosto(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                           bg-white vet-focus transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {}
          <button
            onClick={handleAplicarVacuna}
            disabled={formLoading}
            className="inline-flex items-center gap-2 bg-vet-accent text-white font-semibold px-6 py-3 rounded-xl
                       hover:bg-amber-500 transition-all duration-200 disabled:opacity-50
                       cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {formLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <span>💉</span>
                Aplicar vacuna
              </>
            )}
          </button>

          {}
          {formSuccess && (
            <div className="flex items-center gap-2 text-vet-success-text bg-vet-success-bg text-sm rounded-xl p-4 mt-4 animate-vet-fade-in border border-green-200">
              <span>{formSuccess}</span>
            </div>
          )}

          {}
          {formError && (
            <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg text-sm rounded-xl p-4 mt-4 animate-vet-fade-in border border-red-200">
              <span>❌</span>
              <span>{formError}</span>
            </div>
          )}
        </div>

        {}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/buscar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-vet-mid text-vet-mid
                       font-semibold text-sm hover:bg-vet-mid hover:text-white transition-all duration-200 no-underline">
            <span>🔍</span>
            Buscar mascotas
          </Link>
          <Link href="/citas"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-vet-mid text-vet-mid 
                       font-semibold text-sm hover:bg-vet-mid hover:text-white transition-all duration-200 no-underline">
            <span>📅</span>
            Gestión de Citas
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
