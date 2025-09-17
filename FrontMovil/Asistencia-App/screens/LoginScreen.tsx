import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const BASE_URL = 'http://10.4.2.133:8000';
const LOGIN_URL = `${BASE_URL}/api/login/`;
const CSRF_TOKEN_URL = `${BASE_URL}/api/csrf_token/`;

axios.defaults.withCredentials = true;

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user_id: number;
  email: string;
  role: 'administrador' | 'docente' | 'estudiante';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const LoginScreen: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: 'agomez@est.emi.edu.bo',
    password: '123456',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const { login } = useAuth();

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get<{ csrfToken: string }>(CSRF_TOKEN_URL, {
          withCredentials: true,
        });
        setCsrfToken(response.data.csrfToken);
      } catch {
        Alert.alert('Error', 'No se pudo obtener el token CSRF');
      }
    };
    fetchCsrfToken();
  }, []);

  async function obtenerPushToken() {
    try {
      if (!Device.isDevice) {
        console.warn('Debes usar un dispositivo físico para notificaciones push');
        return null;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permisos de notificaciones no otorgados');
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error('Project ID no encontrado en app.json');
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('Error al obtener el push token:', error);
      return null;
    }
  }

  async function enviarTokenAlBackend(token: string, csrfToken: string) {
    try {
      await axios.post(
        `${BASE_URL}enviar-notificacion-prueba/`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          withCredentials: true,
        }
      );
      console.log('Token push enviado al backend');
    } catch (error) {
      console.warn('Error al enviar el token push al backend:', error);
    }
  }

  const handleLogin = async () => {
    if (!csrfToken) {
      Alert.alert('Error', 'Token CSRF no disponible');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(LOGIN_URL, credentials, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true,
      });

      const { access, refresh, user_id, role } = response.data;

      await login(access, role, user_id, refresh);

      const pushToken = await obtenerPushToken();
      if (pushToken && csrfToken) {
        await enviarTokenAlBackend(pushToken, csrfToken);
      }

      Alert.alert('Éxito', `Bienvenido, ${credentials.email} (${role})`);
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Error al iniciar sesión';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sistema de Asistencia</Text>
      <Text style={styles.subtitle}>Ingresa con tu correo institucional</Text>

      <View style={styles.card}>
        <TextInput
          label="Correo electrónico"
          value={credentials.email}
          onChangeText={(text) => setCredentials({ ...credentials, email: text })}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          left={<TextInput.Icon icon="email" />}
        />
        <TextInput
          label="Contraseña"
          value={credentials.password}
          onChangeText={(text) => setCredentials({ ...credentials, password: text })}
          style={styles.input}
          secureTextEntry
          left={<TextInput.Icon icon="lock" />}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || !csrfToken}
          style={styles.button}
          buttonColor="#2563EB"
          textColor="#fff"
        >
          Iniciar sesión
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0B1D33',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 14,
    color: '#CBD5E0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 6,
  },
});

export default LoginScreen;