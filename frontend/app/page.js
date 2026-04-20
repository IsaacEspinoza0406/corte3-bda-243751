'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { setRol, setVetId } = useAuth();

  const [selectedRol, setSelectedRol] = useState('');
  const [inputVetId, setInputVetId]   = useState('');
  const [error, setError]             = useState('');

  const handleIngresar = () => {
    setError('');

    if (!selectedRol) {
      setError('Selecciona un rol para continuar.');
      return;
    }

    if (selectedRol === 'veterinario' && !inputVetId.trim()) {
      setError('Debes ingresar el ID del veterinario.');
      return;
    }

    setRol(selectedRol);
    setVetId(selectedRol === 'veterinario' ? inputVetId.trim() : '');
    router.push('/buscar');
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md">
        {/* ── Título ── */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          🐾 Clínica Veterinaria
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Sistema de Gestión
        </p>

        {/* ── Selector de rol ── */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rol de acceso
        </label>
        <select
          value={selectedRol}
          onChange={(e) => { setSelectedRol(e.target.value); setError(''); }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Selecciona tu rol...</option>
          <option value="veterinario">Veterinario</option>
          <option value="recepcion">Recepción</option>
          <option value="administrador">Administrador</option>
        </select>

        {/* ── Campo de Vet ID (solo si el rol es veterinario) ── */}
        {selectedRol === 'veterinario' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID del Veterinario
            </label>
            <input
              type="text"
              placeholder="Ej: 1"
              value={inputVetId}
              onChange={(e) => { setInputVetId(e.target.value); setError(''); }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* ── Mensaje de error ── */}
        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg p-2">
            ⚠️ {error}
          </p>
        )}

        {/* ── Botón de ingreso ── */}
        <button
          onClick={handleIngresar}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4
                     rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Ingresar al sistema
        </button>
      </div>
    </main>
  );
}
