import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

import LoginPage from './views/LoginView.tsx';
import Navbar from './components/Navbar.tsx';
import Home from './views/Home.tsx';

// Importaciones de vistas
import Carreras from './views/CarrerasView.tsx';
import Semestres from './views/SemestresView.tsx';

// Importamos el componente correcto para la vista de administración de materias
import MateriasView from './views/MateriasView.tsx'; 

// Importamos el componente para la vista de asignaciones a docentes
import AsignacionesDocenteView from './views/AsignacionesDocenteView.tsx'; 

import Docentes from './views/DocentesView.tsx';
import Admins from './views/AdminView.tsx';
import Students from './views/EstudianteView.tsx';

import MisMateriasDocenteView from './views/MisMateriasDocenteView.tsx';

// ¡IMPORTAMOS EL NUEVO COMPONENTE!
import InscripcionEstudiantesView from './views/InscripcionEstudiantesView.tsx';
import MisMateriasEstudianteView from './views/MisMateriasEstudianteView.tsx';
import VerAsistenciaView from './views/VerAsistenciaView';
import AsistenciasEstudianteView from './views/AsistenciasEstudianteView';
import ReportesView from './views/ReportesView.tsx';
import VerAsistenciaAdministradorView from './views/VerAsistenciaAdministradorView.tsx';
import DiasEspecialesView from './views/DiasEspecialesView.tsx';

// ProtectedRoute utiliza el estado del AuthContext para proteger las rutas.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const RoleBasedRoute: React.FC<{ children: React.ReactNode, allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { authState } = useAuth();
  // Si no está autenticado o su rol no está permitido, lo redirigimos al login
  if (!authState.isAuthenticated || !authState.userRole || !allowedRoles.includes(authState.userRole)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const initialRedirect = sessionStorage.getItem('authToken') ? "/home" : "/login";

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to={initialRedirect} replace />} />

          {/* Rutas Protegidas y basadas en roles */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          
          {/* Rutas de ADMINISTRADOR */}
          <Route path="/carreras" element={<ProtectedRoute><Carreras /></ProtectedRoute>} />
          <Route path="/semestres" element={<ProtectedRoute><Semestres /></ProtectedRoute>} />

          {/* ESTA ES LA RUTA CORREGIDA PARA EL ADMINISTRADOR */}
          <Route
            path="/materias"
            element={
              <RoleBasedRoute allowedRoles={['administrador']}>
                <Navbar />
                <MateriasView />
              </RoleBasedRoute>
            }
          />
          
          {/* RUTA PARA LA NUEVA VISTA DE INSCRIPCIONES */}
          <Route
            path="/inscripciones"
            element={
              <RoleBasedRoute allowedRoles={['administrador']}>
                <Navbar />
                <InscripcionEstudiantesView />
              </RoleBasedRoute>
            }
          />

          {/* RUTA PARA LA VISTA DE REPORTES */}
          <Route
            path="/reportes"
            element={
              <RoleBasedRoute allowedRoles={['administrador']}>
                <Navbar />
                <ReportesView />
              </RoleBasedRoute>
            }
          />

          {/* RUTA PARA LA GESTIÓN DE DÍAS ESPECIALES */}
          <Route
            path="/dias-especiales"
            element={
              <RoleBasedRoute allowedRoles={['administrador']}>
                <Navbar />
                <DiasEspecialesView />
              </RoleBasedRoute>
            }
          />

          {/* La vista de asignaciones, ahora en una ruta separada y protegida */}
          <Route
            path="/docentes-materias-semestre"
            element={
              <RoleBasedRoute allowedRoles={['administrador']}>
                <Navbar />
                <AsignacionesDocenteView />
              </RoleBasedRoute>
            }
          />
          
          <Route path="/docentes" element={<ProtectedRoute><Docentes /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/admins" element={<ProtectedRoute><Admins /></ProtectedRoute>} />
          <Route path="/asistencias-estudiante" element={<ProtectedRoute><VerAsistenciaAdministradorView/></ProtectedRoute>} />

          {/* Rutas de DOCENTE */}
          <Route
            path="/mis-materias"
            element={
              <RoleBasedRoute allowedRoles={['docente']}>
                <Navbar />
                <MisMateriasDocenteView />
              </RoleBasedRoute>
            }
          />
          <Route path="/ver-asistencia" 
          element={
          <RoleBasedRoute allowedRoles={['docente']}>
                <Navbar />
                <VerAsistenciaView />
              </RoleBasedRoute>
          } />
          {/* Rutas de ESTUDIANTE */}
          <Route
            path="/qr-scanner"
            element={
              <RoleBasedRoute allowedRoles={['estudiante']}>
                <Navbar />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/mis-materias-estudiante"
            element={
              <RoleBasedRoute allowedRoles={['estudiante']}>
                <Navbar />
                <MisMateriasEstudianteView />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/mis-asistencias"
            element={
              <RoleBasedRoute allowedRoles={['estudiante']}>
                <Navbar />
                <AsistenciasEstudianteView />
              </RoleBasedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
