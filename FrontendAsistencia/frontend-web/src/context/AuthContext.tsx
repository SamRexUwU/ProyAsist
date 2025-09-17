import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


interface AuthState {
  isAuthenticated: boolean;
  userRole: 'administrador' | 'docente' | 'estudiante' | null;
}

interface AuthContextType {
  authState: AuthState;
  login: (token: string, role: AuthState['userRole']) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
  });

  useEffect(() => {
    // Verificamos el estado en sessionStorage al cargar la página.
    const token = sessionStorage.getItem('authToken');
    const roleStr = sessionStorage.getItem('userRole');
    const role = roleStr ? (roleStr as AuthState['userRole']) : null;
    if (token && role) {
      setAuthState({ isAuthenticated: true, userRole: role });
    }
  }, []);

  const login = (token: string, role: AuthState['userRole']) => {
    // Guardamos el token y el rol en sessionStorage.
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('userRole', role || '');
    setAuthState({ isAuthenticated: true, userRole: role });
  };

  const logout = () => {
    // Eliminamos los datos de sessionStorage al cerrar sesión.
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userRole');
    setAuthState({ isAuthenticated: false, userRole: null });
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
