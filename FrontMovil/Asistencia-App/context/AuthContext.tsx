import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  userRole: 'administrador' | 'docente' | 'estudiante' | null;
  userId?: number | null; // Agregamos userId para móvil
}

interface AuthContextType {
  authState: AuthState;
  login: (accessToken: string, role: AuthState['userRole'], userId?: number, refreshToken?: string) => void;
  logout: () => void;
  checkAuthState: () => Promise<void>; // Método asíncrono para verificar estado
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
  });

  // Verificamos el estado en AsyncStorage al cargar la app
  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const role = await AsyncStorage.getItem('userRole') as AuthState['userRole'];
      const userId = await AsyncStorage.getItem('userId');
      
      if (token && role) {
        // Configurar el token en los headers de axios
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setAuthState({ 
          isAuthenticated: true, 
          userRole: role,
          userId: userId ? parseInt(userId, 10) : null 
        });
      } else {
        // Limpiar headers si no hay token
        delete api.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      console.error('Error al verificar el estado de autenticación:', error);
      // Limpiar estado si hay error
      delete api.defaults.headers.common['Authorization'];
      setAuthState({ isAuthenticated: false, userRole: null, userId: null });
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const login = async (accessToken: string, role: AuthState['userRole'], userId?: number, refreshToken?: string) => {
    try {
      // Validar que los parámetros requeridos no sean undefined
      if (!accessToken || !role) {
        console.error('Error: accessToken o role son undefined');
        return;
      }

      // Guardamos los tokens, rol y userId en AsyncStorage
      await AsyncStorage.setItem('authToken', accessToken);
      await AsyncStorage.setItem('userRole', role);
      if (userId) {
        await AsyncStorage.setItem('userId', userId.toString());
      }
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }

      // Configurar el token en los headers de axios
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      setAuthState({
        isAuthenticated: true,
        userRole: role,
        userId: userId || null
      });
    } catch (error) {
      console.error('Error al guardar credenciales:', error);
    }
  };

  const logout = async () => {
    try {
      // Eliminamos todos los datos de AsyncStorage
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userRole', 'userId']);

      // Limpiar el header de autorización
      delete api.defaults.headers.common['Authorization'];

      setAuthState({ isAuthenticated: false, userRole: null, userId: null });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, checkAuthState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};