'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const { setRol, setVetId, setUsuario } = useAuth();

  const [username, setUsername] = useState('');
  const [cedula, setCedula]     = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleIngresar = async () => {
    setError('');

    if (!username.trim() || !cedula.trim()) {
      setError('Ingresa usuario y cédula.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: username.trim(),
          cedula:  cedula.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales incorrectas');
        return;
      }

      setRol(data.rol);
      setVetId(data.vetId);
      setUsuario(data.nombre);
      router.push('/buscar');

    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-vet-bg via-white to-vet-row px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-vet-mid/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-vet-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-vet-card shadow-xl rounded-3xl p-10 w-full max-w-md border border-gray-100">
        {}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-vet-dark rounded-2xl flex items-center justify-center mb-5 shadow-lg">
            <span className="text-4xl">🐾</span>
          </div>
          <h1 className="text-3xl font-bold text-vet-dark tracking-tight">VetSystem</h1>
          <p className="text-gray-500 text-sm mt-1">Clínica Veterinaria · Suchiapa</p>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-vet-mid/30 to-transparent mb-8" />

        {}
        <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
        <div className="relative mb-5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">👤</span>
          <input
            type="text"
            placeholder="Ej: vet_lopez"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleIngresar()}
            className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3
                       bg-white text-gray-800 vet-focus transition-all duration-200"
          />
        </div>

        {}
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Cédula / Contraseña
        </label>
        <div className="relative mb-5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">🪪</span>
          <input
            type="password"
            placeholder="Ej: VET-2018-001"
            value={cedula}
            onChange={(e) => { setCedula(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleIngresar()}
            className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3
                       bg-white text-gray-800 vet-focus transition-all duration-200"
          />
        </div>

        {}
        {error && (
          <div className="flex items-center gap-2 text-vet-error-text bg-vet-error-bg
                          text-sm rounded-xl p-3 mb-5 border border-red-200">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {}
        <button
          onClick={handleIngresar}
          disabled={loading}
          className="w-full bg-vet-dark text-white font-semibold py-3 px-4
                     rounded-xl hover:bg-vet-mid transition-all duration-200
                     cursor-pointer shadow-lg disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? 'Verificando...' : 'Iniciar sesión'}
        </button>
      </div>
    </main>
  );
}