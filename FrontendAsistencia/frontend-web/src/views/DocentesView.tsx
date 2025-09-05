// src/views/DocentesView.tsx  (Semestres-style)
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Docente {
  id: number;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    is_active: boolean;
  };
  especialidad: string;
}

const DocentesView: React.FC = () => {
  const navigate = useNavigate();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Add modal ---- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEspecialidad, setNewEspecialidad] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [addFormSuccess, setAddFormSuccess] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);

  /* ---- Fetch ---- */
  const fetchDocentes = async () => {
    try {
      setLoading(true);
      const res = await api.get<Docente[]>('/docentes/');
      setDocentes(res.data);
    } catch {
      setError('No se pudieron cargar los docentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, []);

  /* ---- Toggle active ---- */
  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      const url = active
        ? `/docentes/${id}/desactivar/`
        : `/docentes/${id}/activar/`;
      await api.post(url);
      fetchDocentes();
    } catch {
      setError('No se pudo cambiar el estado.');
    }
  };

  /* ---- Add docente ---- */
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');
    setAddFormSuccess('');
    setAddFormLoading(true);
    try {
      const res = await api.post('/docentes/', {
        usuario: {
          nombre: newNombre,
          apellido: newApellido,
          email: newEmail,
          password: newPassword,
        },
        especialidad: newEspecialidad,
      });
      setAddFormSuccess(
        `Docente “${res.data.usuario.nombre} ${res.data.usuario.apellido}” añadido.`
      );
      setNewNombre('');
      setNewApellido('');
      setNewEmail('');
      setNewPassword('');
      setNewEspecialidad('');
      fetchDocentes();
      setTimeout(() => {
        setShowAddModal(false);
        setAddFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setAddFormError(
        err?.response?.data?.detail ||
          JSON.stringify(err?.response?.data) ||
          'Error al añadir docente.'
      );
    } finally {
      setAddFormLoading(false);
    }
  };

  /* ---- Render ---- */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <p className="text-xl text-[#002855]">Cargando docentes...</p>
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
            Listado de Docentes
          </h1>
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddFormError('');
              setAddFormSuccess('');
            }}
            className="px-6 py-2 bg-[#ffc72c] text-[#002855] font-bold rounded-md hover:bg-[#e6b81e] transition"
          >
            + Añadir Docente
          </button>
        </div>

        {/* Tabla */}
        {docentes.length === 0 ? (
          <p className="text-gray-600">No hay docentes registrados.</p>
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
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {docentes.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#002855] hover:text-white transition ${
                      idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-4">
                      {d.usuario.nombre} {d.usuario.apellido}
                      {!d.usuario.is_active && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{d.usuario.email}</td>
                    <td className="px-6 py-4">{d.especialidad}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(d.id, d.usuario.is_active)}
                        className={`px-3 py-1 text-white text-xs font-semibold rounded-md transition ${
                          d.usuario.is_active
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {d.usuario.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Add Modal ---- */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Añadir Nuevo Docente"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-[#002855]">
              Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-[#002855]">
              Especialidad
            </label>
            <input
              type="text"
              value={newEspecialidad}
              onChange={(e) => setNewEspecialidad(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#002855]"
            />
          </div>

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
            {addFormLoading ? 'Guardando…' : 'Guardar Docente'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default DocentesView;