// src/views/EstudianteView.tsx  (re-styled to match Semestres page)
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import GeneradorQR from '../components/GeneradorQR';

/* -----------  INTERFACES  ----------- */
interface Estudiante {
  id: number;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    is_active: boolean;
  };
  codigo_institucional: string;
  semestre: number;
  carrera: number;
  semestre_nombre?: string;
  carrera_nombre?: string;
}

interface Carrera {
  id: number;
  nombre: string;
}

interface Semestre {
  id: number;
  nombre: string;
  carrera: number;
}

/* -----------  COMPONENT  ----------- */
const EstudianteView: React.FC = () => {
  const navigate = useNavigate();
  /* ---- Data ---- */
  const [students, setStudents] = useState<Estudiante[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Estudiante[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [semestres, setSemestres] = useState<Semestre[]>([]);

  /* ---- Filters ---- */
  const [selectedCarrera, setSelectedCarrera] = useState<number | ''>('');

  /* ---- UI ---- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Add Modal ---- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCodigoInstitucional, setNewCodigoInstitucional] = useState('');
  const [addSelectedCarrera, setAddSelectedCarrera] = useState<number | ''>('');
  const [addSelectedSemestre, setAddSelectedSemestre] = useState<number | ''>('');
  const [filteredSemestres, setFilteredSemestres] = useState<Semestre[]>([]);
  const [addFormError, setAddFormError] = useState('');
  const [addFormSuccess, setAddFormSuccess] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [emailError, setEmailError] = useState('');

  /* ---- QR Modal ---- */
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<number | null>(null);

  /* -----------  FETCH  ----------- */
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get<Estudiante[]>('/estudiantes/');
      setStudents(res.data);
      setFilteredStudents(res.data);
    } catch {
      setError('No se pudieron cargar los estudiantes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      setLoadingDeps(true);
      const [cRes, sRes] = await Promise.all([
        api.get<Carrera[]>('/carreras/'),
        api.get<Semestre[]>('/semestres/'),
      ]);
      setCarreras(cRes.data);
      setSemestres(sRes.data);
    } catch {
      setAddFormError('No se pudieron cargar carreras/semestres.');
    } finally {
      setLoadingDeps(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDependencies();
  }, []);

  /* -----------  FILTERS  ----------- */
  useEffect(() => {
    if (selectedCarrera) {
      setFilteredStudents(students.filter((s) => s.carrera === selectedCarrera));
    } else {
      setFilteredStudents(students);
    }
  }, [selectedCarrera, students]);

  /* ---- Filtrar semestres en modal cuando cambia la carrera ---- */
  useEffect(() => {
    if (addSelectedCarrera) {
      setFilteredSemestres(semestres.filter((s) => s.carrera === addSelectedCarrera));
      const first = semestres.find((s) => s.carrera === addSelectedCarrera);
      setAddSelectedSemestre(first?.id || '');
    } else {
      setFilteredSemestres([]);
      setAddSelectedSemestre('');
    }
  }, [addSelectedCarrera, semestres]);

  /* -----------  HANDLERS  ----------- */
  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      const url = active
        ? `/estudiantes/${id}/desactivar/`
        : `/estudiantes/${id}/activar/`;
      await api.post(url);
      fetchStudents();
    } catch {
      setError('No se pudo cambiar el estado.');
    }
  };

  /* ---- Email validation ---- */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewEmail(value);
    if (value && !value.endsWith('@est.emi.edu.bo')) {
      setEmailError('El email debe terminar con @est.emi.edu.bo');
    } else {
      setEmailError('');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError) {
      setAddFormError('Corrige los errores antes de guardar.');
      return;
    }
    if (!addSelectedCarrera || !addSelectedSemestre) {
      setAddFormError('Selecciona carrera y semestre.');
      return;
    }
    setAddFormLoading(true);
    try {
      await api.post('/estudiantes/', {
        usuario: {
          nombre: newNombre,
          apellido: newApellido,
          email: newEmail,
          password: newPassword,
        },
        codigo_institucional: newCodigoInstitucional,
        carrera: addSelectedCarrera,
        semestre_actual: addSelectedSemestre,
      });
      setAddFormSuccess('Estudiante añadido.');
      setNewNombre('');
      setNewApellido('');
      setNewEmail('');
      setNewPassword('');
      setNewCodigoInstitucional('');
      setEmailError('');
      fetchStudents();
      setTimeout(() => {
        setShowAddModal(false);
        setAddFormSuccess('');
      }, 1500);
    } catch (err) {
      // setAddFormError(
      //   err?.response?.data?.detail || 'Error al añadir estudiante.'
      // );
      console.error(err);
      setAddFormError('Error al añadir estudiante.');
    } finally {
      setAddFormLoading(false);
    }
  };

  const handleShowQR = (id: number) => {
    setSelectedStudentForQR(id);
    setShowQRModal(true);
  };

  /* -----------  RENDER  ----------- */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <p className="text-xl text-[#002855]">Cargando estudiantes...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 font-sans">
        <p className="text-xl text-red-700 mb-4">{error}</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition"
        >
          Volver al Inicio
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-8 font-sans">
      <div className="container mx-auto mt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-[#002855]">
            Listado de Estudiantes
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-[#ffc72c] text-[#002855] font-bold rounded-md hover:bg-[#e6b81e] transition"
          >
            + Añadir Estudiante
          </button>
        </div>

        {/* Filtro carrera */}
        <div className="mb-4">
          <label
            htmlFor="filter-carrera"
            className="block text-sm font-medium text-[#002855] mb-1"
          >
            Filtrar por carrera:
          </label>
          <select
            id="filter-carrera"
            value={selectedCarrera}
            onChange={(e) =>
              setSelectedCarrera(e.target.value ? Number(e.target.value) : '')
            }
            className="border border-gray-300 rounded-md px-4 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#002855]"
          >
            <option value="">Todas las carreras</option>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        {filteredStudents.length === 0 ? (
          <p className="text-gray-600">No hay estudiantes para esta carrera.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full table-auto">
              <thead className="bg-[#002855] text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Código Institucional
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Carrera
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Semestre
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-[#002855] hover:text-white transition ${
                      idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-4">
                      {s.usuario.nombre} {s.usuario.apellido}
                      {!s.usuario.is_active && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{s.usuario.email}</td>
                    <td className="px-6 py-4">{s.codigo_institucional}</td>
                    <td className="px-6 py-4">{s.carrera_nombre || '—'}</td>
                    <td className="px-6 py-4">{s.semestre_nombre || '—'}</td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleShowQR(s.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Ver QR
                      </button>
                      <button
                        onClick={() =>
                          handleToggleActive(s.id, s.usuario.is_active)
                        }
                        className={`px-3 py-1 text-white text-xs font-semibold rounded-md transition ${
                          s.usuario.is_active
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {s.usuario.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------  ADD MODAL  ---------- */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Añadir Nuevo Estudiante"
      >
        {loadingDeps ? (
          <p className="text-gray-600">Cargando dependencias...</p>
        ) : (
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Nombre
              </label>
              <input
                type="text"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Apellido
              </label>
              <input
                type="text"
                value={newApellido}
                onChange={(e) => setNewApellido(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={handleEmailChange}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
              />
              {emailError && (
                <p className="text-red-600 text-sm mt-1">{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
              />
            </div>

            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Código Institucional
              </label>
              <input
                type="text"
                value={newCodigoInstitucional}
                onChange={(e) => setNewCodigoInstitucional(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
              />
            </div>

            {/* Carrera */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Carrera
              </label>
              <select
                value={addSelectedCarrera}
                onChange={(e) => setAddSelectedCarrera(Number(e.target.value))}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855] bg-white"
              >
                <option value="">Seleccione una carrera</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label className="block text-sm font-medium text-[#002855]">
                Semestre
              </label>
              <select
                value={addSelectedSemestre}
                onChange={(e) => setAddSelectedSemestre(Number(e.target.value))}
                required
                disabled={filteredSemestres.length === 0}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855] bg-white"
              >
                {filteredSemestres.length ? (
                  filteredSemestres.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))
                ) : (
                  <option value="">No hay semestres para esta carrera</option>
                )}
              </select>
            </div>

            {/* Mensajes */}
            {addFormError && (
              <p className="text-red-600 text-sm">{addFormError}</p>
            )}
            {addFormSuccess && (
              <p className="text-green-600 text-sm">{addFormSuccess}</p>
            )}

            <button
              type="submit"
              disabled={addFormLoading}
              className="w-full px-4 py-2 bg-[#002855] text-white rounded-md hover:bg-[#003d80] transition disabled:bg-gray-400"
            >
              {addFormLoading ? 'Guardando…' : 'Guardar Estudiante'}
            </button>
          </form>
        )}
      </Modal>

      {/* ----------  QR MODAL  ---------- */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Código QR del Estudiante"
      >
        <div className="flex justify-center p-4">
          {selectedStudentForQR && <GeneradorQR estudianteId={selectedStudentForQR} />}
        </div>
        <p className="text-center text-sm text-gray-600">
          Escanea este código para acceder a la información del estudiante.
        </p>
      </Modal>
    </div>
  );
};

export default EstudianteView;