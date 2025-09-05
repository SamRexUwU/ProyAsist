// src/services/api.ts

import axios from 'axios';

// Crea una instancia de Axios
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', // Asegúrate de que esta URL sea la de tu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones para añadir el token de autenticación
api.interceptors.request.use(
  (config) => {
    // Obtenemos el token del sessionStorage
    const token = sessionStorage.getItem('authToken');
    
    // Si existe el token, lo adjuntamos al encabezado Authorization
    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir al login si no está autenticado
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;