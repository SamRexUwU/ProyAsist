import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Button, ProgressBar, Modal as PaperModal, Portal } from 'react-native-paper';
import api from '../services/api';
import { useAuth } from '../context/AuthContext'; // Asegúrate de tener este contexto

// --- INTERFACES DE DATOS ---
interface AsistenciaResumen {
  materia_id: number;
  materia_nombre: string;
  total_clases: number;
  asistencias: number;
  faltas: number;
  tardanzas: number;
  porcentaje_asistencia: number;
}

interface ClaseInfo {
  id: number;
  materia_semestre: {
    materia: {
      nombre: string;
    };
  };
  fecha: string;
  tema: string;
}

interface AsistenciaDetalle {
  id: number;
  sesion: ClaseInfo;
  estado: 'PRESENTE' | 'RETRASO' | 'FALTA' | 'FALTA_JUSTIFICADA';
  fecha_registro: string;
}

const AsistenciasEstudianteScreen: React.FC = () => {
  // --- ESTADOS ---
  const { authState } = useAuth(); // Usando el contexto de autenticación
  const [resumenAsistencias, setResumenAsistencias] = useState<AsistenciaResumen[]>([]);
  const [historialDetalle, setHistorialDetalle] = useState<AsistenciaDetalle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- ESTADOS PARA EL MODAL ---
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedMateria, setSelectedMateria] = useState<AsistenciaResumen | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // --- CARGA DE DATOS ---
  const fetchResumenAsistencias = useCallback(async () => {
    if (!authState.isAuthenticated || authState.userRole !== 'estudiante') {
      setError('No tienes permisos para ver esta información.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Usando la misma URL que en tu versión web
      const response = await api.get<AsistenciaResumen[]>('/estudiantes/resumen-asistencias/');
      console.log('Resumen de asistencias:', response.data);
      setResumenAsistencias(response.data);
    } catch (err: any) {
      console.error('Error fetching resumen de asistencias:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 404) {
        setError('El recurso solicitado no existe. Verifica la URL.');
      } else {
        setError('No se pudo cargar el resumen de asistencias.');
      }
    } finally {
      setLoading(false);
    }
  }, [authState.isAuthenticated, authState.userRole]);

  const fetchHistorialDetalle = useCallback(async (materiaId: number) => {
    if (!authState.isAuthenticated) return;
    
    setModalLoading(true);
    setModalError(null);
    try {
      // Usando la misma URL que en tu versión web
      const response = await api.get<AsistenciaDetalle[]>(`/estudiantes/historial-asistencias/?materia=${materiaId}`);
      console.log('Historial detallado:', response.data);
      setHistorialDetalle(response.data);
    } catch (err: any) {
      console.error('Error fetching historial detallado:', err);
      if (err.response?.status === 401) {
        setModalError('Sesión expirada.');
      } else {
        setModalError('No se pudo cargar el historial de asistencias.');
      }
      setHistorialDetalle([]);
    } finally {
      setModalLoading(false);
    }
  }, [authState.isAuthenticated]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchResumenAsistencias();
    }
  }, [authState.isAuthenticated, fetchResumenAsistencias]);

  // --- MANEJO DEL MODAL ---
  const handleViewDetails = (materia: AsistenciaResumen) => {
    setSelectedMateria(materia);
    fetchHistorialDetalle(materia.materia_id);
    setShowDetailModal(true);
  };

  // --- RENDERIZADO DE CADA ITEM ---
  const renderAsistenciaItem = ({ item }: { item: AsistenciaResumen }) => {
    const getProgressColor = () => {
      if (item.porcentaje_asistencia >= 80) return '#22c55e';
      if (item.porcentaje_asistencia >= 60) return '#eab308';
      return '#ef4444';
    };

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.materiaNombre}>
            {item.materia_nombre}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{item.total_clases}</Text>
              <Text style={styles.statLabel}>Total Clases</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#22c55e' }]}>{item.asistencias}</Text>
              <Text style={styles.statLabel}>Asistencias</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>{item.faltas}</Text>
              <Text style={styles.statLabel}>Faltas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#eab308' }]}>{item.tardanzas}</Text>
              <Text style={styles.statLabel}>Tardanzas</Text>
            </View>
          </View>

          <ProgressBar
            progress={item.porcentaje_asistencia / 100}
            style={styles.progressBar}
            color={getProgressColor()}
          />
          
          <Text style={[styles.porcentajeText, { color: getProgressColor() }]}>
            {item.porcentaje_asistencia.toFixed(1)}% de Asistencia
          </Text>
        </Card.Content>
        
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => handleViewDetails(item)}
            style={styles.button}
            buttonColor="#2563eb"
          >
            Ver Historial
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  // --- RENDERIZADO DEL HISTORIAL EN EL MODAL ---
  const renderHistorialItem = ({ item }: { item: AsistenciaDetalle }) => {
    const getEstadoStyle = () => {
      switch (item.estado) {
        case 'PRESENTE':
          return { backgroundColor: '#dcfce7', color: '#15803d' };
        case 'RETRASO':
          return { backgroundColor: '#fef9c3', color: '#b45309' };
        case 'FALTA_JUSTIFICADA':
          return { backgroundColor: '#dbeafe', color: '#2563eb' };
        case 'FALTA':
          return { backgroundColor: '#fee2e2', color: '#b91c1c' };
        default:
          return { backgroundColor: '#f3f4f6', color: '#374151' };
      }
    };

    const estadoStyle = getEstadoStyle();

    return (
      <View style={styles.historialItem}>
        <View style={styles.historialText}>
          <Text style={styles.historialFecha}>Fecha: {item.sesion.fecha}</Text>
          <Text style={styles.historialTema}>Tema: {item.sesion.tema || 'No especificado'}</Text>
          <Text style={styles.historialRegistro}>
            Registro: {new Date(item.fecha_registro).toLocaleString()}
          </Text>
        </View>
        <View>
          <Text style={[styles.estadoBadge, estadoStyle]}>
            {item.estado === 'PRESENTE' ? 'Presente' :
             item.estado === 'RETRASO' ? 'Con Retraso' :
             item.estado === 'FALTA_JUSTIFICADA' ? 'Falta Justificada' :
             'Falta'}
          </Text>
        </View>
      </View>
    );
  };

  // --- RENDERIZADO PRINCIPAL ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando resumen de asistencias...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Mis Asistencias
      </Text>
      
      {resumenAsistencias.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay materias disponibles</Text>
          <Text style={styles.emptySubtext}>
            Parece que no tienes materias asignadas o no hay registros de asistencia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={resumenAsistencias}
          renderItem={renderAsistenciaItem}
          keyExtractor={(item) => item.materia_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* --- MODAL DE HISTORIAL --- */}
      <Portal>
        <PaperModal
          visible={showDetailModal}
          onDismiss={() => setShowDetailModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Historial - {selectedMateria?.materia_nombre}
          </Text>
          
          {modalLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text>Cargando historial...</Text>
            </View>
          ) : modalError ? (
            <Text style={styles.modalError}>{modalError}</Text>
          ) : (
            <FlatList
              data={historialDetalle}
              renderItem={renderHistorialItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          )}
          
          <Button
            mode="contained"
            onPress={() => setShowDetailModal(false)}
            style={styles.modalButton}
            buttonColor="#2563eb"
          >
            Cerrar
          </Button>
        </PaperModal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Fondo claro institucional
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#002855',
    fontWeight: 'bold',
    fontSize: 22,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#002855',
    elevation: 3,
  },
  materiaNombre: {
    marginBottom: 12,
    color: '#002855',
    fontWeight: 'bold',
    fontSize: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    marginVertical: 8,
    height: 8,
    borderRadius: 4,
  },
  porcentajeText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#002855',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#002855',
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#002855',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalError: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
    padding: 16,
  },
  modalList: {
    maxHeight: 400,
  },
  modalButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#ffc72c',
  },
  historialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historialText: {
    flex: 1,
  },
  historialFecha: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 2,
  },
  historialTema: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  historialRegistro: {
    fontSize: 11,
    color: '#9ca3af',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: 'bold',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default AsistenciasEstudianteScreen;