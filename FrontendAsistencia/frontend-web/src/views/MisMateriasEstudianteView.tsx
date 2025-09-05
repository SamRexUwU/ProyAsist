import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ModalSesionActiva from '../components/ModalSesionActiva';

interface MateriaEstudiante {
  id: number;
  materia_nombre: string;
  semestre_nombre: string;
  gestion: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  docentes?: { nombre: string; apellido: string }[];
  sesion_activa?: boolean;
}

const MisMateriasEstudianteView: React.FC = () => {
  const [materias, setMaterias] = useState<MateriaEstudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get<MateriaEstudiante[]>('mis-materias-estudiante/')
      .then(({ data }) => setMaterias(data))
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 401) navigate('/login');
        else console.error(err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleVerSesion = (materiaNombre: string) => {
    setMateriaSeleccionada(materiaNombre);
    setModalOpen(true);
  };

  if (loading) return <p className="text-center p-8">Cargando materias...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Mis Materias</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semestre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Día</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Docentes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sesión</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materias.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.materia_nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.semestre_nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.dia_semana}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.hora_inicio} - {m.hora_fin}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {m.docentes?.map(d => `${d.nombre} ${d.apellido}`).join(', ') || 'No asignado'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {m.sesion_activa ? (
                    <button
                      onClick={() => handleVerSesion(m.materia_nombre)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      Ver sesión
                    </button>
                  ) : (
                    <span className="text-gray-400 italic">Sin sesión activa</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ModalSesionActiva
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        materia={materiaSeleccionada}
      />
    </div>
  );
};

export default MisMateriasEstudianteView;
