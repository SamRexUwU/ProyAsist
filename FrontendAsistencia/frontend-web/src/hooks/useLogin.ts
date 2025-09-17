import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/login/', { email, password });
      const { access, refresh, role } = response.data;

      if (access && role) {
        // Store both tokens
        sessionStorage.setItem('authToken', access);
        sessionStorage.setItem('refreshToken', refresh);
        login(access, role); // La función de login ahora guarda en sessionStorage.
        navigate('/home');
      } else {
        setError('Respuesta del servidor incompleta. Por favor, intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Credenciales incorrectas. Por favor, verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    handleLogin,
  };
};
