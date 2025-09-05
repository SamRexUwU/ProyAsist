import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.100.5:8000/api/',
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Obtener el token CSRF antes de cada solicitud POST
  if (config.method?.toLowerCase() === 'post') {
    try {
      const response = await axios.get('http://192.168.100.5:8000/api/get-csrf-token/', {
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