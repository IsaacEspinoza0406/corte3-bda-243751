'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CitasPage() {
  const { rol, vetId, usuario } = useAuth();

  // State para formulario
  const [formMascotaId, setFormMascotaId] = useState('');
  const [formVeterinarioId, setFormVeterinarioId] = useState('');
  const [formFechaHora, setFormFechaHora] = useState('');
  const [formMotivo, setFormMotivo] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // State para tabla
  const [citas, setCitas] = useState([]);
  const [total, setTotal] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');

  const cargarCitas = useCallback(async () => {
    if (!rol) return;
    setTableLoading(true);
    setTableError('');

    try {
      const res = await fetch(`${API_URL}/api/citas`, {
        headers: {
          'X-Role': rol,
          'X-Vet-Id': vetId,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      setCitas(data.citas || []);
      setTotal(data.total || 0);
    } catch (err) {
      setTableError(err.message);
      setCitas([]);
      setTotal(null);
    } finally {
      setTableLoading(false);
    }
  }, [rol, vetId]);

  useEffect(() => {
    if (rol) {
      cargarCitas();
    }
  }, [rol, cargarCitas]);

  const handleAgendarCita = async () => {
    setFormError('');
    setFormSuccess('');

    if (!formMascotaId || !formVeterinarioId || !formFechaHora || !formMotivo) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/citas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role': rol,
          'X-Vet-Id': vetId,
        },
        body: JSON.stringify({
          mascota_id: parseInt(formMascotaId, 10),
          veterinario_id: parseInt(formVeterinarioId, 10),
          fecha_hora: formFechaHora,
          motivo: formMotivo,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      setFormSuccess('Cita agendada exitosamente ✅');
      setFormMascotaId('');
      setFormVeterinarioId('');
      setFormFechaHora('');
      setFormMotivo('');

      await cargarCitas();
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

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const getStatusBadge = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'AGENDADA':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'COMPLETADA':
        return 'bg-vet-success-bg text-vet-success-text border-green-200';
      case 'CANCELADA':
        return 'bg-vet-error-bg text-vet-error-text border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-vet-bg">
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-vet-dark">
            Gestión de Citas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Agenda y administra las citas de la clínica
          </p>
        </div>

        {/* SECCIÓN 1 - Formulario para agendar cita */}
        <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 p-6 mb-8 animate-vet-fade-in">
          <h2 className="text-lg font-bold text-vet-dark mb-5 flex items-center gap-2">
            <span>📅</span>
            Agendar Nueva Cita
          </h2>

          {rol === 'recepcion' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Fecha y Hora
                  </label>
                  <input
                    type="datetime-local"
                    value={formFechaHora}
                    onChange={(e) => setFormFechaHora(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                               bg-white vet-focus transition-all duration-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Motivo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Revisión general"
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5
                               bg-white vet-focus transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleAgendarCita}
                disabled={formLoading}
                className="inline-flex items-center gap-2 bg-vet-mid text-white font-semibold px-6 py-3 rounded-xl
                           hover:bg-vet-dark transition-all duration-200 disabled:opacity-50
                           cursor-pointer shadow-sm active:scale-[0.98]"
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Agendando...
                  </>
                ) : (
                  'Agendar cita'
                )}
              </button>

              {formSuccess && (
                <div className="flex items-center gap-2 text-vet-success-text bg-vet-success-bg text-sm rounded-xl p-4 mt-4 animate-vet-fade-in border border-green-200">
                  <span>{formSuccess}</span>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg text-sm rounded-xl p-4 mt-4 animate-vet-fade-in border border-red-200">
                  <span>❌</span>
                  <span>{formError}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 text-sm rounded-xl p-4 animate-vet-fade-in border border-amber-200">
              <span>ℹ️</span>
              <span>Solo el personal de recepción puede agendar nuevas citas</span>
            </div>
          )}
        </div>

        {}
        <div className="bg-vet-card rounded-2xl shadow-md border border-gray-100 p-6 mb-8 animate-vet-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-vet-dark flex items-center gap-2">
              <span>📋</span>
              Citas Registradas
            </h2>
            <button
              onClick={cargarCitas}
              disabled={tableLoading}
              className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-xl
                         hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 text-sm shadow-sm"
            >
              <span className={tableLoading ? "animate-spin" : ""}>🔄</span>
              Actualizar
            </button>
          </div>

          {tableError && (
            <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg text-sm rounded-xl p-4 mb-4 border border-red-200">
              <span>❌</span>
              <span>{tableError}</span>
            </div>
          )}

          {total !== null && (
            <div className="mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-vet-mid rounded-full" />
              <p className="text-sm text-vet-dark font-medium">
                <strong>{total}</strong> citas en total
              </p>
            </div>
          )}

          {citas.length === 0 ? (
            <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <span className="text-3xl mb-2 block"></span>
              <p className="text-gray-500 text-sm">No hay citas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-vet-dark text-white">
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">ID</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Mascota ID</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Veterinario ID</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Fecha y Hora</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Motivo</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Costo</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.map((cita, i) => (
                    <tr
                      key={cita.id}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-vet-row'} hover:bg-vet-mid/5 transition-colors duration-150`}
                    >
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{cita.id}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{cita.mascota_id}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{cita.veterinario_id}</td>
                      <td className="px-5 py-3 text-gray-700">{formatDateTime(cita.fecha_hora)}</td>
                      <td className="px-5 py-3 text-gray-700">{cita.motivo}</td>
                      <td className="px-5 py-3 text-gray-700 font-mono text-xs">{formatCurrency(cita.costo)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <Link href="/vacunacion"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-vet-mid text-vet-mid 
                       font-semibold text-sm hover:bg-vet-mid hover:text-white transition-all duration-200 no-underline">
            <span>💉</span>
            Vacunación
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
