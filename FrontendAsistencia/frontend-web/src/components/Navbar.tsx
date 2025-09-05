// src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!authState.isAuthenticated) {
    return null;
  }

  const adminRoutes = [
    { path: '/home', label: 'Inicio' },
    { path: '/carreras', label: 'Carreras' },
    { path: '/semestres', label: 'Semestres' },
    { path: '/materias', label: 'Materias' },
    { path: '/docentes-materias-semestre', label: 'Asignación de Docentes' },
    { path: '/docentes', label: 'Docentes' },
    { path: '/students', label: 'Estudiantes' },
    { path: '/reportes', label: 'Reportes' },
    { path: '/asistencias-estudiante', label: 'Asistencias de Estudiantes' },
  ];

  const studentRoutes = [
    { path: '/home', label: 'Inicio' },
    { path: '/mis-materias-estudiante', label: 'Mis Clases' },
    { path: '/mis-asistencias', label: 'Mis Asistencias' },
  ];

  const docenteRoutes = [
    { path: '/home', label: 'Inicio' },
    { path: '/mis-materias', label: 'Mis Materias' },
    { path: '/ver-asistencia', label: 'Ver Asistencia' },
  ];

  const getRoutes = () => {
    if (authState.userRole === 'administrador') return adminRoutes;
    if (authState.userRole === 'estudiante') return studentRoutes;
    if (authState.userRole === 'docente') return docenteRoutes;
    return [];
  };

  return (
    <nav className="bg-[#002855] text-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between flex-wrap px-4 py-3">
        {/* Logo */}
        <Link
          to="/home"
          className="flex items-center flex-shrink-0 text-white mr-6"
        >
          <svg
            className="h-8 w-8 mr-2 text-[#ffc72c]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="font-bold text-xl tracking-wide">
            Sistema de Asistencia
          </span>
        </Link>

        {/* Botón Menú móvil */}
        <div className="block lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center px-3 py-2 border rounded text-[#ffc72c] border-[#ffc72c] hover:text-white hover:border-white"
          >
            <svg
              className="fill-current h-4 w-4"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Menu</title>
              <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <div
          className={`w-full lg:flex lg:items-center lg:w-auto ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <div className="text-sm lg:flex-grow flex flex-col lg:flex-row lg:items-center">
            {getRoutes().map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  `block mt-4 lg:inline-block lg:mt-0 mr-4 px-3 py-2 rounded transition-colors duration-300 ${
                    isActive
                      ? 'bg-[#ffc72c] text-[#002855] font-semibold'
                      : 'text-white hover:bg-[#ffc72c] hover:text-[#002855]'
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                {route.label}
              </NavLink>
            ))}
          </div>

          {/* Botón Logout */}
          <div>
            <button
              onClick={handleLogout}
              className="inline-block mt-4 lg:mt-0 px-4 py-2 border-2 border-[#ffc72c] text-[#ffc72c] rounded hover:bg-[#ffc72c] hover:text-[#002855] font-semibold transition-colors duration-300"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
