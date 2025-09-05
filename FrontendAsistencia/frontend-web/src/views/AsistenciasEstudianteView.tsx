// src/views/AsistenciasEstudianteView.tsx  (estilos “Semestres”)
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* -----------  INTERFACES  ----------- */
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
  materia_semestre: { materia: { nombre: string } };
  fecha: string;
  tema: string;
}

interface AsistenciaDetalle {
  id: number;
  sesion: ClaseInfo;
  estado: 'PRESENTE' | 'RETRASO' | 'FALTA' | 'FALTA_JUSTIFICADA';
  fecha_registro: string;
}

/* -----------  COMPONENTE  ----------- */
const AsistenciasEstudianteView: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  /* ---- data ---- */
  const [resumenAsistencias, setResumenAsistencias] = useState<AsistenciaResumen[]>([]);
  const [historialDetalle, setHistorialDetalle] = useState<AsistenciaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- modal ---- */
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<AsistenciaResumen | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  /* ---- fetch ---- */
  const fetchResumenAsistencias = useCallback(async () => {
    if (!authState.isAuthenticated || authState.userRole !== 'estudiante') {
      setError('No tienes permisos.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<AsistenciaResumen[]>('/estudiantes/resumen-asistencias/');
      setResumenAsistencias(res.data);
    } catch (err) {
      if ((err as any).response?.status === 401) navigate('/login');
      else setError('No se pudo cargar el resumen.');
    } finally {
      setLoading(false);
    }
  }, [authState, navigate]);

  const fetchHistorialDetalle = useCallback(
    async (materiaId: number) => {
      setModalLoading(true);
      setModalError(null);
      try {
        const res = await api.get<AsistenciaDetalle[]>(`/estudiantes/historial-asistencias/?materia=${materiaId}`);
        setHistorialDetalle(res.data);
      } catch {
        setModalError('No se pudo cargar el historial.');
      } finally {
        setModalLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authState.isAuthenticated && authState.userRole === 'estudiante') {
      fetchResumenAsistencias();
    }
  }, [authState, fetchResumenAsistencias]);

  /* ---- handlers ---- */
  const handleViewDetails = (materia: AsistenciaResumen) => {
    setSelectedMateria(materia);
    fetchHistorialDetalle(materia.materia_id);
    setShowDetailModal(true);
  };

  /* ---- render ---- */
  if (!authState.isAuthenticated || authState.userRole !== 'estudiante')
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 font-sans">
        <div className="text-center">
          <p className="text-xl text-red-700 mb-4">No tienes permisos.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <p className="text-xl text-[#002855]">Cargando resumen de asistencias…</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <div className="text-center">
          <p className="text-xl text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-8 font-sans">
      <div className="container mx-auto mt-8">
        <h1 className="text-3xl font-extrabold text-[#002855] mb-6">Mis Asistencias</h1>

        {resumenAsistencias.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay materias disponibles
            </h3>
            <p className="text-gray-600 mb-4">
              Parece que no tienes materias asignadas o sin registros.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition"
            >
              Actualizar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumenAsistencias.map((r) => (
              <div
                key={r.materia_id}
                className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-lg transition"
              >
                <h2 className="text-xl font-bold text-[#002855] mb-3">
                  {r.materia_nombre}
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#002855]">{r.total_clases}</p>
                    <p className="text-xs text-gray-600">Total Clases</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{r.asistencias}</p>
                    <p className="text-xs text-gray-600">Asistencias</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Faltas:</span>
                    <span className="font-semibold text-red-600">{r.faltas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Con Retraso:</span>
                    <span className="font-semibold text-yellow-600">{r.tardanzas}</span>
                  </div>
                </div>

                {/* barra */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        r.porcentaje_asistencia >= 80
                          ? 'bg-green-500'
                          : r.porcentaje_asistencia >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(r.porcentaje_asistencia, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <span
                    className={`text-lg font-bold ${
                      r.porcentaje_asistencia >= 80
                        ? 'text-green-600'
                        : r.porcentaje_asistencia >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {r.porcentaje_asistencia.toFixed(1)}% de Asistencia
                  </span>
                </div>

                <button
                  onClick={() => handleViewDetails(r)}
                  className="w-full bg-[#002855] text-white py-2 px-4 rounded-md hover:bg-[#003d80] transition"
                >
                  Ver Historial Detallado
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Modal detalle ---- */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Historial de Asistencias – ${selectedMateria?.materia_nombre}`}
      >
        {modalLoading ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-[#002855]">Cargando historial…</p>
          </div>
        ) : modalError ? (
          <div className="p-4 text-red-600">{modalError}</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {historialDetalle.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center p-3 border-b border-gray-200"
              >
                <div>
                  <p className="text-sm font-medium text-[#002855]">
                    Fecha: {d.sesion.fecha}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tema: {d.sesion.tema || 'No especificado'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Registro: {new Date(d.fecha_registro).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    d.estado === 'PRESENTE'
                      ? 'bg-green-100 text-green-800'
                      : d.estado === 'RETRASO'
                      ? 'bg-yellow-100 text-yellow-800'
                      : d.estado === 'FALTA_JUSTIFICADA'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {d.estado === 'PRESENTE'
                    ? 'Presente'
                    : d.estado === 'RETRASO'
                    ? 'Con Retraso'
                    : d.estado === 'FALTA_JUSTIFICADA'
                    ? 'Falta Justificada'
                    : 'Falta'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AsistenciasEstudianteView;