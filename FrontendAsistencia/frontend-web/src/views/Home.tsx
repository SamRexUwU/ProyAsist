// src/views/Home.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ResumenAsistencia {
  materia_id: number;
  materia_nombre: string;
  carrera_nombre: string;
  semestre_nombre: string;
  docente_nombre: string;
  total_sesiones: number;
  total_estudiantes: number;
  asistencias_totales: number;
  porcentaje_asistencia_general: number;
}

interface Carrera {
  id: number;
  nombre: string;
}

interface Semestre {
  id: number;
  nombre: string;
  carrera__id: number;
  carrera__nombre: string;
}

const Home: React.FC = () => {
  const { authState } = useAuth();

  const [loading, setLoading] = useState(true);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenAsistencia[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Estados para filtros
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState<string>('');
  const [loadingFiltros, setLoadingFiltros] = useState(false);

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

  // Efecto para obtener opciones de filtros
  useEffect(() => {
    if (authState.userRole === 'administrador') {
      setLoadingFiltros(true);
      api.get('filtros-asistencia/')
        .then(response => {
          setCarreras(response.data.carreras);
          setSemestres(response.data.semestres);
          setLoadingFiltros(false);
        })
        .catch(error => {
          console.error('Error al obtener filtros:', error);
          setLoadingFiltros(false);
        });
    }
  }, [authState.userRole]);

  // Función para obtener resumen con filtros
  const obtenerResumenFiltrado = () => {
    if (authState.userRole === 'administrador') {
      setLoadingResumen(true);
      const params = new URLSearchParams();
      if (carreraSeleccionada) params.append('carrera_id', carreraSeleccionada);
      if (semestreSeleccionado) params.append('semestre_id', semestreSeleccionado);

      api.get(`resumen-asistencias-general/?${params.toString()}`)
        .then(response => {
          setResumenGeneral(response.data);
          setLoadingResumen(false);
        })
        .catch(error => {
          console.error('Error al obtener resumen general:', error);
          setLoadingResumen(false);
        });
    }
  };

  // Efecto para obtener resumen general de asistencias para administrador
  useEffect(() => {
    obtenerResumenFiltrado();
  }, [authState.userRole, carreraSeleccionada, semestreSeleccionado]);

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
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
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
          </div> */}

          {/* Filtros */}
          <div className="mt-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Porcentaje General de Asistencias por Materia</h2>

            {/* Controles de filtros */}
            <div className="mb-6 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="carrera-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Carrera
                </label>
                <select
                  id="carrera-filter"
                  value={carreraSeleccionada}
                  onChange={(e) => setCarreraSeleccionada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las Carreras</option>
                  {carreras.map((carrera) => (
                    <option key={carrera.id} value={carrera.id}>
                      {carrera.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label htmlFor="semestre-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Semestre
                </label>
                <select
                  id="semestre-filter"
                  value={semestreSeleccionado}
                  onChange={(e) => setSemestreSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los Semestres</option>
                  {semestres
                    .filter((semestre) =>
                      !carreraSeleccionada || semestre.carrera__id.toString() === carreraSeleccionada
                    )
                    .map((semestre) => (
                      <option key={semestre.id} value={semestre.id}>
                        {semestre.nombre} - {semestre.carrera__nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <button
                  onClick={() => {
                    setCarreraSeleccionada('');
                    setSemestreSeleccionado('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
            {loadingResumen ? (
              <p>Cargando resumen de asistencias...</p>
            ) : resumenGeneral.length === 0 ? (
              <p>No hay datos de asistencia disponibles.</p>
            ) : (
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead>
                  <tr>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Materia</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Carrera</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Semestre</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Docente</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Porcentaje de Asistencia</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Total Sesiones</th>
                    <th className="py-3 px-6 bg-gray-200 font-bold uppercase text-sm text-gray-600">Total Estudiantes</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenGeneral.map((item) => (
                    <tr key={item.materia_id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left">{item.materia_nombre}</td>
                      <td className="py-3 px-6 text-center">{item.carrera_nombre}</td>
                      <td className="py-3 px-6 text-center">{item.semestre_nombre}</td>
                      <td className="py-3 px-6 text-center">{item.docente_nombre}</td>
                      <td className="py-3 px-6 text-center">{item.porcentaje_asistencia_general.toFixed(2)}%</td>
                      <td className="py-3 px-6 text-center">{item.total_sesiones}</td>
                      <td className="py-3 px-6 text-center">{item.total_estudiantes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
