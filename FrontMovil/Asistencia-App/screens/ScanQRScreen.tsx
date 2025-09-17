import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MisMateriasEstudiante: undefined;
  ScanQR: { materiaId: number; materiaNombre: string };
};

type ScanQRScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanQR'>;

const GEOFENCE_CENTER = { latitude: -17.378676, longitude: -66.147356 }; // Coordenadas del centro del geofence
const GEOFENCE_RADIUS = 500; // 500 metros

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

async function estaDentroDelGeofence(): Promise<{ dentro: boolean; latitude?: number; longitude?: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Permiso de ubicación denegado. No puedes registrar asistencia sin esto.');
      return { dentro: false };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;

    const distancia = calcularDistancia(
      latitude,
      longitude,
      GEOFENCE_CENTER.latitude,
      GEOFENCE_CENTER.longitude
    );

    if (distancia <= GEOFENCE_RADIUS) {
      console.log('Dentro del geofence:', distancia, 'metros');
      return { dentro: true, latitude, longitude };
    } else {
      Alert.alert(
        'Restricción Geográfica',
        'No estás dentro de la institución. Acércate al campus para registrar asistencia.'
      );
      console.log('Fuera del geofence:', distancia, 'metros');
      return { dentro: false };
    }
  } catch (error) {
    console.error('Error en verificación de geofence:', error);
    Alert.alert('Error', 'No se pudo verificar tu ubicación. Intenta de nuevo.');
    return { dentro: false };
  }
}

const ScanQRScreen: React.FC<ScanQRScreenProps> = ({ navigation, route }) => {
  const { materiaId, materiaNombre } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Solicitando permiso para la cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Se necesita permiso para usar la cámara.</Text>
        <Button title="Otorgar permiso" onPress={requestPermission} />
        <Button title="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Verificar geofence antes de procesar el QR
    const geofenceResult = await estaDentroDelGeofence();
    if (!geofenceResult.dentro) {
      setScanned(false); // Permitir reintentar
      return;
    }

    try {
      // Redondear coordenadas a 6 decimales
      const latitude = Number(geofenceResult.latitude!.toFixed(6)); // e.g., -17.396924
      const longitude = Number(geofenceResult.longitude!.toFixed(6)); // e.g., -66.220317

      console.log('Código QR escaneado:', data);
      console.log('Enviando materia_id:', materiaId);
      console.log('Coordenadas enviadas:', { latitude, longitude });
      const token = await AsyncStorage.getItem('authToken');
      console.log('Token enviado en la solicitud:', token);

      const response = await api.post('registros-asistencia/registrar-qr/', {
        materia_id: materiaId,
        qr_code: data,
        latitude,
        longitude,
      });

      console.log('Respuesta del servidor:', response.data);
      Alert.alert(
        'Asistencia registrada',
        `Asistencia para "${response.data.materia_nombre}" registrada correctamente.\nEstado: ${response.data.estado}`
      );
      navigation.goBack();
    } catch (error: any) {
      console.error('Error al registrar asistencia:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 409) {
        Alert.alert(
          'Asistencia ya registrada',
          'Ya registraste tu asistencia para esta sesión.\nNo es necesario volver a escanear el código.'
        );
      } else if (status === 404) {
        Alert.alert(
          'Sin sesión activa',
          'No hay una sesión activa para esta materia en este momento.\nVerifica el horario o consulta con tu docente.'
        );
      } else if (status === 403) {
        Alert.alert(
          'Acceso denegado',
          detail || 'No tienes autorización para registrar asistencia en esta materia.'
        );
      } else {
        Alert.alert(
          'Error',
          detail || 'Ocurrió un error al registrar la asistencia. Intenta nuevamente.'
        );
      }

      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <Text style={styles.title}>Escanear QR para {materiaNombre}</Text>
          <View style={styles.qrFrame} />
        </View>
      </CameraView>
      <Button title="Cancelar" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
});

export default ScanQRScreen;