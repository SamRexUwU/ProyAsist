import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MisMateriasEstudiante: undefined;
  ScanQR: { materiaId: number; materiaNombre: string };
};

type MisMateriasScreenProps = NativeStackScreenProps<RootStackParamList, 'MisMateriasEstudiante'>;

interface MateriaEstudiante {
  id: number; // ID de MateriaSemestre
  materia_id: number; // ID de Materia
  materia_nombre: string;
  semestre_nombre: string;
  gestion: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  docentes?: { nombre: string; apellido: string }[];
  sesion_activa?: boolean;
}

const MisMateriasEstudianteScreen: React.FC<MisMateriasScreenProps> = ({ navigation }) => {
  const [materias, setMaterias] = useState<MateriaEstudiante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        if (role !== 'estudiante') {
          Alert.alert('Acceso denegado', 'Esta sección es solo para estudiantes.');
          navigation.navigate('Home');
          return;
        }

        const response = await api.get<MateriaEstudiante[]>('mis-materias-estudiante/');
        console.log('Materias cargadas:', response.data); // Log para depurar IDs
        setMaterias(response.data);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente.');
          await AsyncStorage.multiRemove(['authToken', 'userId', 'userEmail', 'userRole']);
          navigation.navigate('Login');
        } else {
          Alert.alert('Error', 'No se pudieron cargar las materias.');
        }
      } finally {
        setLoading(false);
      }
    };
    checkRoleAndFetch();
  }, [navigation]);

  const handleVerSesion = (materiaId: number, materiaNombre: string, sesionActiva: boolean | undefined) => {
    if (!sesionActiva) {
      Alert.alert('No disponible', 'No hay una sesión activa para esta materia.');
      return;
    }
    console.log(`Navegando a ScanQR con materiaId=${materiaId}, materiaNombre=${materiaNombre}`); // Log para depurar
    navigation.navigate('ScanQR', { materiaId, materiaNombre });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" color="#002855" />
        <Text style={styles.loadingText}>Cargando materias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Materias</Text>
      <ScrollView>
        {materias.map((m) => (
          <Card key={m.id} style={styles.card} elevation={3}>
            <Card.Content>
              <Title style={styles.cardTitle}>{m.materia_nombre}</Title>
              <Paragraph style={styles.cardText}>Semestre: {m.semestre_nombre}</Paragraph>
              <Paragraph style={styles.cardText}>Día: {m.dia_semana}</Paragraph>
              <Paragraph style={styles.cardText}>Hora: {m.hora_inicio} - {m.hora_fin}</Paragraph>
              <Paragraph style={styles.cardText}>
                Docentes: {m.docentes?.map((d) => `${d.nombre} ${d.apellido}`).join(', ') || 'No asignado'}
              </Paragraph>

              {m.sesion_activa ? (
                <Button
                  mode="contained"
                  onPress={() => handleVerSesion(m.id, m.materia_nombre, m.sesion_activa)} // Cambia m.materia_id por m.id
                  style={styles.button}
                  buttonColor="#ffc72c"
                  textColor="#002855"
                >
                  Ver sesión
                </Button>
              ) : (
                <Paragraph style={styles.noSession}>Sin sesión activa</Paragraph>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#002855',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#002855',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002855',
    marginBottom: 4,
  },
  cardText: {
    color: '#334155',
    marginBottom: 2,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
  },
  noSession: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4b5563',
  },
});

export default MisMateriasEstudianteScreen;