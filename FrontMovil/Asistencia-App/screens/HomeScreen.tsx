import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

type Props = { navigation: any };

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { authState, logout } = useAuth();

  const handleLogout = async () => await logout();

  const roleLabels = {
    administrador: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
  };

  const roleColors = {
    administrador: '#ffc72c', // Dorado
    docente: '#1f7a8c',       // Azul medio
    estudiante: '#ffc72c',    // Dorado
  };

  const renderRoleOptions = () => {
    switch (authState.userRole) {
      case 'estudiante':
        return (
          <>
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('MisMateriasEstudiante')}
            >
              <Card.Title
                title="Mis Materias"
                subtitle="Ver mis materias inscritas"
                left={(props) => (
                  <Avatar.Icon
                    {...props}
                    icon="book"
                    color="#002855"
                    style={styles.iconGold}
                  />
                )}
              />
            </Card>

            <Card
              style={styles.card}
              onPress={() => navigation.navigate('AsistenciasEstudiante')}
            >
              <Card.Title
                title="Mis Asistencias"
                subtitle="Ver historial de asistencias"
                left={(props) => (
                  <Avatar.Icon
                    {...props}
                    icon="calendar-check"
                    color="#002855"
                    style={styles.iconGold}
                  />
                )}
              />
            </Card>
          </>
        );
      case 'docente':
        return (
          <Card style={styles.card}>
            <Card.Title
              title="Mis Cursos"
              subtitle="Gestionar cursos asignados"
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="teach"
                  color="#002855"
                  style={styles.iconGold}
                />
              )}
            />
          </Card>
        );
      case 'administrador':
        return (
          <Card style={styles.card}>
            <Card.Title
              title="Panel Admin"
              subtitle="Administrar usuarios y cursos"
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="shield-crown"
                  color="#002855"
                  style={styles.iconGold}
                />
              )}
            />
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={authState.userRole?.charAt(0).toUpperCase() || 'U'}
          style={[
            styles.avatar,
            { backgroundColor: roleColors[authState.userRole || 'estudiante'] },
          ]}
          color="#002855"
        />
        <Text style={styles.welcomeText}>¡Bienvenido!</Text>
        <Text style={styles.userInfo}>
          {roleLabels[authState.userRole || 'estudiante']}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        {renderRoleOptions()}
      </View>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        icon="logout"
        textColor="#002855"
      >
        Cerrar sesión
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#002855',
  },
  userInfo: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#002855',
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#002855',
    backgroundColor: '#ffffff',
  },
  iconGold: {
    backgroundColor: '#ffc72c',
  },
  logoutButton: {
    marginTop: 8,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffc72c',
  },
});

export default HomeScreen;
