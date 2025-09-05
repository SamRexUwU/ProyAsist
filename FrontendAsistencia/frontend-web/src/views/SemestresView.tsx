import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';


interface Semestre {
  id: number;
  nombre: string;
  carrera: number;
  carrera_nombre?: string;
}

interface Carrera {
  id: number;
  nombre: string;
  codigo: string;
}

const Semestres: React.FC = () => {
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  const [filteredSemestres, setFilteredSemestres] = useState<Semestre[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [selectedCarrera, setSelectedCarrera] = useState<number | ''>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSemestreNombre, setNewSemestreNombre] = useState<string>('');
  const [addFormError, setAddFormError] = useState<string>('');
  const [addFormSuccess, setAddFormSuccess] = useState<string>('');
  const [addFormLoading, setAddFormLoading] = useState<boolean>(false);

  // Fetch semestres y carreras
  const fetchData = async () => {
    try {
      setLoading(true);
      const [semestresRes, carrerasRes] = await Promise.all([
        api.get<Semestre[]>('/semestres/'),
        api.get<Carrera[]>('/carreras/'),
      ]);
      setSemestres(semestresRes.data);
      setFilteredSemestres(semestresRes.data);
      setCarreras(carrerasRes.data);
    } catch (err) {
      setError(`No se pudieron cargar los datos.${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado por carrera
  useEffect(() => {
    if (selectedCarrera) {
      setFilteredSemestres(
        semestres.filter((s) => s.carrera === selectedCarrera)
      );
    } else {
      setFilteredSemestres(semestres);
    }
  }, [selectedCarrera, semestres]);

  // Añadir semestre
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCarrera) {
      setAddFormError('Por favor selecciona una carrera.');
      return;
    }
    setAddFormLoading(true);
    setAddFormError('');
    setAddFormSuccess('');
    try {
      const response = await api.post('/semestres/', {
        nombre: newSemestreNombre,
        carrera: selectedCarrera,
      });
      setAddFormSuccess(`Semestre "${response.data.nombre}" añadido.`);
      setNewSemestreNombre('');
      fetchData();
      setTimeout(() => {
        setShowAddModal(false);
      }, 1500);
    } catch {
      setAddFormError('Error al añadir semestre.');
    } finally {
      setAddFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <p className="text-xl text-[#002855]">Cargando semestres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 font-sans">
        <p className="text-xl text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-8 font-sans">
      <div className="container mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-[#002855]">Listado de Semestres</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-[#ffc72c] text-[#002855] font-bold rounded-md hover:bg-[#e6b81e] transition"
          >
            + Añadir Semestre
          </button>
        </div>

        {/* Filtro por carrera */}
        <div className="mb-4">
          <label htmlFor="filter-carrera" className="block text-sm font-medium text-[#002855] mb-1">
            Filtrar por carrera:
          </label>
          <select
            id="filter-carrera"
            value={selectedCarrera}
            onChange={(e) => setSelectedCarrera(e.target.value ? Number(e.target.value) : '')}
            className="border border-gray-300 rounded-md px-4 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#002855]"
          >
            <option value="">Todas las carreras</option>
            {carreras.map((carrera) => (
              <option key={carrera.id} value={carrera.id}>
                {carrera.nombre} ({carrera.codigo})
              </option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        {filteredSemestres.length === 0 ? (
          <p className="text-gray-600">No hay semestres para esta carrera.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full table-auto">
              <thead className="bg-[#002855] text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Carrera</th>
                </tr>
              </thead>
              <tbody>
                {filteredSemestres.map((semestre, index) => (
                  <tr
                    key={semestre.id}
                    className={`hover:bg-[#002855] hover:text-white transition ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-4">{semestre.id}</td>
                    <td className="px-6 py-4">{semestre.nombre}</td>
                    <td className="px-6 py-4">
                      {semestre.carrera_nombre || `ID ${semestre.carrera}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal añadir semestre */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Añadir Nuevo Semestre">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombreSemestre" className="block text-sm font-medium text-[#002855]">
              Nombre del semestre:
            </label>
            <input
              id="nombreSemestre"
              type="text"
              value={newSemestreNombre}
              onChange={(e) => setNewSemestreNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
            />
          </div>
          <div>
            <label htmlFor="carreraSelect" className="block text-sm font-medium text-[#002855]">
              Carrera:
            </label>
            <select
              id="carreraSelect"
              value={selectedCarrera}
              onChange={(e) => setSelectedCarrera(Number(e.target.value))}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
            >
              <option value="">Seleccione una carrera</option>
              {carreras.map((carrera) => (
                <option key={carrera.id} value={carrera.id}>
                  {carrera.nombre} ({carrera.codigo})
                </option>
              ))}
            </select>
          </div>
          {addFormError && <p className="text-red-600">{addFormError}</p>}
          {addFormSuccess && <p className="text-green-600">{addFormSuccess}</p>}
          <button
            type="submit"
            disabled={addFormLoading}
            className="w-full px-4 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition"
          >
            {addFormLoading ? 'Guardando...' : 'Guardar Semestre'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Semestres;
