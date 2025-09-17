// src/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type RouteWithSub = {
  label: string;
  sub: { path: string; label: string; }[];
};

type RouteNormal = {
  path: string;
  label: string;
};

type RouteItem = RouteWithSub | RouteNormal;

const Navbar: React.FC = () => {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownsOpen, setDropdownsOpen] = useState({ academico: false, usuarios: false });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!authState.isAuthenticated) {
    return null;
  }

  const adminRoutes: RouteItem[] = [
    { path: '/home', label: 'Inicio' },
    { label: 'Académico', sub: [
      { path: '/carreras', label: 'Carreras' },
      { path: '/semestres', label: 'Semestres' },
      { path: '/materias', label: 'Materias' },
      { path: '/dias-especiales', label: 'Días Especiales' },
    ] },
    { path: '/docentes-materias-semestre', label: 'Asignación de Docentes' },
    { label: 'Usuarios', sub: [
      { path: '/docentes', label: 'Docentes' },
      { path: '/students', label: 'Estudiantes' },
    ] },
    { path: '/reportes', label: 'Reportes' },
    { path: '/asistencias-estudiante', label: 'Asistencias de Estudiantes' },
  ];

  const studentRoutes: RouteItem[] = [
    { path: '/home', label: 'Inicio' },
    { path: '/mis-materias-estudiante', label: 'Mis Clases' },
    { path: '/mis-asistencias', label: 'Mis Asistencias' },
  ];

  const docenteRoutes: RouteItem[] = [
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
          <img
            src="/CASTILLO-AMARILLO.png"
            alt="Castillo Amarillo Logo"
            className="h-8 w-8 mr-2"
          />
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
            {getRoutes().map((route, index) => (
              'sub' in route ? (() => {
                const r = route as RouteWithSub;
                return (
                  <div key={index} className="relative mt-4 lg:mt-0 mr-4">
                    <button
                      onClick={() => setDropdownsOpen(prev => ({ ...prev, [r.label === 'Académico' ? 'academico' : 'usuarios']: !prev[r.label === 'Académico' ? 'academico' : 'usuarios'] }))}
                      className="block lg:inline-block px-3 py-2 rounded transition-colors duration-300 text-white hover:bg-[#ffc72c] hover:text-[#002855]"
                    >
                      {r.label}
                    </button>
                    {dropdownsOpen[r.label === 'Académico' ? 'academico' : 'usuarios'] && (
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                        {r.sub.map((subRoute) => (
                          <NavLink
                            key={subRoute.path}
                            to={subRoute.path}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                                isActive ? 'bg-gray-100 font-semibold' : ''
                              }`
                            }
                            onClick={() => {
                              setDropdownsOpen({ academico: false, usuarios: false });
                              setIsOpen(false);
                            }}
                          >
                            {subRoute.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (() => {
                const r = route as RouteNormal;
                return (
                  <NavLink
                    key={r.path}
                    to={r.path}
                    className={({ isActive }) =>
                      `block mt-4 lg:inline-block lg:mt-0 mr-4 px-3 py-2 rounded transition-colors duration-300 ${
                        isActive
                          ? 'bg-[#ffc72c] text-[#002855] font-semibold'
                          : 'text-white hover:bg-[#ffc72c] hover:text-[#002855]'
                      }`
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    {r.label}
                  </NavLink>
                );
              })()
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
