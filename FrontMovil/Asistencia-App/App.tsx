import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './context/AuthContext'; // Asegúrate de la ruta correcta
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MisMateriasEstudianteScreen from './screens/MisMateriasEstudianteScreen';
import ScanQRScreen from './screens/ScanQRScreen';
import AsistenciasEstudianteScreen from './screens/AsistenciasEstudianteScreen';
import { PaperProvider } from 'react-native-paper';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MisMateriasEstudiante: undefined;
  ScanQR: { materiaId: number; materiaNombre: string };
  AsistenciasEstudiante: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Componente para manejar la navegación basada en el estado de autenticación
const NavigationHandler: React.FC = () => {
  const { authState, checkAuthState } = useAuth();

  useEffect(() => {
    // Verificar el estado de autenticación al iniciar la app
    checkAuthState();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={authState.isAuthenticated ? "Home" : "Login"}
      screenOptions={{
        headerBackVisible: false,
      }}
    >
      {authState.isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MisMateriasEstudiante" component={MisMateriasEstudianteScreen} />
          <Stack.Screen 
            name="ScanQR" 
            component={ScanQRScreen} 
            options={{
              title: 'Escanear QR',
            }}
          />
          <Stack.Screen 
            name="AsistenciasEstudiante" 
            component={AsistenciasEstudianteScreen}
            options={{
              title: 'Mis Asistencias',
            }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{
            headerShown: false, // Ocultar header en login
          }}
        />
      )}
    </Stack.Navigator>
  );
};

// App principal con el AuthProvider
const App: React.FC = () => {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <NavigationHandler />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
};

export default App;