import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://10.4.2.133:8000/api/',
  // baseURL: 'http://192.168.100.:8000/api/',
});

api.interceptors.request.use(async (config) => {
  // No añadir token para la ruta de login
  if (config.url?.includes('/login/')) {
    return config;
  }

  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Obtener el token CSRF antes de cada solicitud POST (excepto login)
  if (config.method?.toLowerCase() === 'post' && !config.url?.includes('/login/')) {
    try {
      const response = await axios.get('http://10.4.2.133:8000/api/get-csrf-token/', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const csrfToken = response.data.csrfToken;
      if (csrfToken) {
        config.headers['X-Csrftoken'] = csrfToken;
        await AsyncStorage.setItem('csrfToken', csrfToken);
      }
    } catch (error) {
      console.error('Error al obtener el token CSRF:', error);
    }
  }
  return config;
});

export default api;