import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

// --- INTERFACES ---
interface Materia {
  id: number;
  nombre: string;
}

interface Carrera {
  id: number;
  nombre: string;
}

const MateriasView: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el modal de materia
  const [showAddMateriaModal, setShowAddMateriaModal] = useState<boolean>(false);

  // Estado para el formulario de materia
  const [newMateriaNombre, setNewMateriaNombre] = useState<string>('');

  // --- Funciones de carga de datos ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [materiasRes, carrerasRes] = await Promise.all([
          api.get<Materia[]>('/materias/'),
          api.get<Carrera[]>('/carreras/'),
        ]);
        setMaterias(materiasRes.data);
        setCarreras(carrerasRes.data);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('No se pudieron cargar los datos. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Manejo del formulario de añadir Materia ---
  const handleAddMateria = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMateriaNombre) {
      toast.error('El nombre de la materia es obligatorio.');
      return;
    }
    try {
      await api.post('/materias/', {
        nombre: newMateriaNombre,
      });
      toast.success('Materia creada exitosamente!');
      setNewMateriaNombre('');
      setShowAddMateriaModal(false);
      const response = await api.get<Materia[]>('/materias/');
      setMaterias(response.data);
    } catch (err) {
      console.error('Error al crear materia:', err);
      toast.error('Error al crear la materia.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-blue-50"><p className="text-xl text-blue-700">Cargando datos de administración...</p></div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-red-50"><p className="text-xl text-red-700">{error}</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto mt-8">
        <h1 className="text-4xl font-extrabold text-blue-800 mb-6">Administración de Materias y Carreras</h1>
        
        {/* Sección de Botones para Abrir Modales */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setShowAddMateriaModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Añadir Materia
          </button>
        </div>

        {/* Sección de listado de Carreras */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Carreras Disponibles</h2>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {carreras.map(carrera => (
                <li key={carrera.id} className="p-4 hover:bg-gray-50 transition">
                  {carrera.nombre}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sección de listado de Materias */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Materias Existentes</h2>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {materias.map(materia => (
                <li key={materia.id} className="p-4 hover:bg-gray-50 transition">
                  <p className="font-semibold">{materia.nombre}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal para añadir Materia */}
      <Modal isOpen={showAddMateriaModal} onClose={() => setShowAddMateriaModal(false)} title="Añadir Nueva Materia">
        <form onSubmit={handleAddMateria} className="space-y-4">
          <div>
            <label htmlFor="materia-nombre" className="block text-sm font-medium text-gray-700">Nombre de la Materia</label>
            <input
              type="text"
              id="materia-nombre"
              value={newMateriaNombre}
              onChange={(e) => setNewMateriaNombre(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Crear Materia
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default MateriasView;