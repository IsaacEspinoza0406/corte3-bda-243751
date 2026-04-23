'use client';

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [rol, setRol]         = useState('');
  const [vetId, setVetId]     = useState('');
  const [usuario, setUsuario] = useState('');

  return (
    <AuthContext.Provider value={{ rol, setRol, vetId, setVetId, usuario, setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
