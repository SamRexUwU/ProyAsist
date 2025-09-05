// src/views/Home.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { authState } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Efecto para redirigir a los usuarios según su rol
  useEffect(() => {
    // Si el usuario es docente, lo redirigimos a su página de materias
    if (authState.isAuthenticated && authState.userRole === 'docente') {
      navigate('/mis-materias');
      return;
    }
    
    // Si el usuario es estudiante, lo redirigimos a su página de asistencias
    if (authState.isAuthenticated && authState.userRole === 'estudiante') {
      navigate('/mis-asistencias');
      return;
    }

    // Si el usuario es administrador, no se redirige y se continúa con el renderizado normal
    setLoading(false);
  }, [authState.isAuthenticated, authState.userRole, navigate]); // Dependencias del useEffect

  // Si está cargando o el usuario aún no tiene un rol asignado, mostramos un mensaje
  if (loading || !authState.userRole) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-500">Cargando...</p>
      </div>
    );
  }

  // Si el usuario no es un administrador, no se renderiza nada aquí
  if (authState.userRole !== 'administrador') {
    return null;
  }

  // --- Renderizado exclusivo para ADMINISTRADORES ---
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-extrabold text-gray-800 mb-4">
            ¡Bienvenido, Administrador!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Tu plataforma centralizada para la gestión de estudiantes y asistencia.
          </p>

          {/* Tarjetas de navegación para el administrador */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
            <Link to="/carreras" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
              <h2 className="text-2xl font-semibold text-blue-700 mb-2">Gestionar Carreras</h2>
              <p className="text-gray-600">Ver, añadir y editar carreras universitarias.</p>
            </Link>
            <Link to="/materias" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
              <h2 className="text-2xl font-semibold text-green-700 mb-2">Gestionar Materias</h2>
              <p className="text-gray-600">Administrar el catálogo de materias.</p>
            </Link>
            <Link to="/docentes" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
              <h2 className="text-2xl font-semibold text-purple-700 mb-2">Gestionar Docentes</h2>
              <p className="text-gray-600">Administrar la información de los docentes.</p>
            </Link>
            <Link to="/students" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
              <h2 className="text-2xl font-semibold text-red-700 mb-2">Gestionar Estudiantes</h2>
              <p className="text-gray-600">Administrar la información de los estudiantes.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;