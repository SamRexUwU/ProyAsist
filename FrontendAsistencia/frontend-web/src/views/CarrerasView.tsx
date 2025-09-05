import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

interface Carrera {
  id: number;
  nombre: string;
  
}

const Carreras: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newCarreraNombre, setNewCarreraNombre] = useState<string>('');
  const [newCarreraCodigo, setNewCarreraCodigo] = useState<string>('');
  const [addFormError, setAddFormError] = useState<string>('');
  const [addFormSuccess, setAddFormSuccess] = useState<string>('');
  const [addFormLoading, setAddFormLoading] = useState<boolean>(false);

  const fetchCarreras = async () => {
    try {
      setLoading(true);
      const response = await api.get<Carrera[]>('/carreras/');
      setCarreras(response.data);
    } catch (err) {
      console.error('Error al cargar carreras:', err);
      setError('No se pudieron cargar las carreras. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarreras();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddFormError('');
    setAddFormSuccess('');
    setAddFormLoading(true);

    try {
      const response = await api.post('/carreras/', {
        nombre: newCarreraNombre,
        codigo: newCarreraCodigo,
      });

      setAddFormSuccess(`Carrera "${response.data.nombre}" añadida exitosamente!`);
      setNewCarreraNombre('');
      setNewCarreraCodigo('');
      fetchCarreras();
      setTimeout(() => {
        setShowAddModal(false);
        setAddFormSuccess('');
      }, 1500);

    } catch (err) {
      console.error('Error al añadir carrera:', err);
      const axiosError = err as any;
      if (axiosError.response && axiosError.response.data) {
        const errorData = axiosError.response.data;
        if (errorData.nombre) setAddFormError(`Nombre: ${errorData.nombre[0]}`);
        else if (errorData.codigo) setAddFormError(`Código: ${errorData.codigo[0]}`);
        else if (errorData.detail) setAddFormError(errorData.detail);
        else setAddFormError('Error al añadir carrera. Verifica los datos.');
      } else {
        setAddFormError('Error de red o servidor. Intenta nuevamente.');
      }
    } finally {
      setAddFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-xl text-blue-700">Cargando carreras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <p className="text-xl text-red-700 mb-4">{error}</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-blue-800">
            Listado de Carreras
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Añadir Carrera
          </button>
        </div>

        {carreras.length === 0 ? (
          <p className="text-gray-600 text-lg">No hay carreras registradas.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {carreras.map((carrera) => (
                <li key={carrera.id} className="p-4 hover:bg-gray-50 transition">
                  <p className="font-semibold">{carrera.nombre}</p>
                  
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Añadir Nueva Carrera"
      >
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <div>
            <label htmlFor="modal-nombre" className="block text-sm font-medium text-gray-700">
              Nombre de la Carrera
            </label>
            <input
              type="text"
              id="modal-nombre"
              value={newCarreraNombre}
              onChange={(e) => setNewCarreraNombre(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Ingeniería de Sistemas"
            />
          </div>
          

          {addFormError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {addFormError}
            </div>
          )}
          {addFormSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
              {addFormSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={addFormLoading}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium transition ${
              addFormLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {addFormLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A8 8 0 014 12H0c0 3.04 1.14 5.82 3 7.94l3-2.65z"
                ></path>
              </svg>
            ) : (
              'Guardar Carrera'
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Carreras;