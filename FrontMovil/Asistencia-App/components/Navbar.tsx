import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import AsistenciasEstudianteScreen from '../screens/AsistenciasEstudianteScreen';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MisMateriasEstudiante: undefined;
  AsistenciasEstudiante : undefined;
};

type NavbarNavigationProp = StackNavigationProp<RootStackParamList>;

interface NavbarProps {
  title: string;
  navigation: NavbarNavigationProp;
}

const Navbar: React.FC<NavbarProps> = ({ title, navigation }) => {
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'userId', 'userEmail', 'userRole']);
    navigation.replace('Login');
  };

  return (
    <Appbar.Header style={styles.header}>
      <Appbar.Content title={title} titleStyle={styles.title} />
      <Appbar.Action
        icon="book-open"
        onPress={() => navigation.navigate('MisMateriasEstudiante')}
      />
      <Appbar.Action icon="book-open" onPress={() => navigation.navigate('AsistenciasEstudiante')} />
      <Appbar.Action icon="logout" onPress={handleLogout} />
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1e3a8a', // blue-950
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default Navbar;