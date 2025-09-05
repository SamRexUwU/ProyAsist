// src/views/AdminView.tsx

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal'; 
import { useNavigate } from 'react-router-dom';

// Interfaz para Administrador
interface Admin {
  id: number; // id_Administrador
  usuario: { // Campos heredados del modelo User de Django
    id: number; // id_Usuario
    nombre: string;
    apellido: string;
    email: string;
  };
  cargo: string; // cargo
}

const AdminView: React.FC = () => { // <--- Nombre de la función y exportación
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Estado para controlar la visibilidad del modal de añadir administrador
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Estados para el formulario dentro del modal
  const [newNombre, setNewNombre] = useState<string>('');
  const [newApellido, setNewApellido] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newCargo, setNewCargo] = useState<string>('');
  const [addFormError, setAddFormError] = useState<string>('');
  const [addFormSuccess, setAddFormSuccess] = useState<string>('');
  const [addFormLoading, setAddFormLoading] = useState<boolean>(false);

  // Función para cargar los administradores
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get<Admin[]>('/administradores/'); // Asumo '/administradores/' para listar
      setAdmins(response.data);
    } catch (err) {
      console.error('Error al cargar administradores:', err);
      setError('No se pudieron cargar los administradores. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Manejador para el envío del formulario de añadir administrador
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddFormError('');
    setAddFormSuccess('');
    setAddFormLoading(true);

    try {
      const response = await api.post('/administradores/', { // Asumo '/administradores/' para añadir
        usuario: {
          nombre: newNombre,
          apellido: newApellido,
          email: newEmail,
          password: newPassword,
        },
        cargo: newCargo,
      });

      setAddFormSuccess(`Administrador "${response.data.usuario.nombre} ${response.data.usuario.apellido}" añadido exitosamente!`);
      // Limpiar el formulario
      setNewNombre('');
      setNewApellido('');
      setNewEmail('');
      setNewPassword('');
      setNewCargo('');
      // Recargar la lista de administradores
      fetchAdmins(); 
      // Cerrar el modal después de un breve retraso
      setTimeout(() => {
        setShowAddModal(false);
        setAddFormSuccess('');
      }, 1500);

    } catch (err) {
      console.error('Error al añadir administrador:', err);
      const axiosError = err as any;
      if (axiosError.response && axiosError.response.data) {
        const errorData = axiosError.response.data;
        if (errorData.cargo) setAddFormError(`Cargo: ${errorData.cargo[0]}`);
        else if (errorData.user) {
            const userErrors = errorData.user;
            if (userErrors.email) setAddFormError(`Email: ${userErrors.email[0]}`);
            else if (userErrors.username) setAddFormError(`Nombre de usuario: ${userErrors.username[0]}`);
            else if (userErrors.password) setAddFormError(`Contraseña: ${userErrors.password[0]}`);
            else setAddFormError(`Error en datos de usuario: ${JSON.stringify(userErrors)}`);
        }
        else if (errorData.detail) setAddFormError(errorData.detail);
        else setAddFormError('Error al añadir administrador. Verifica los datos.');
      } else {
        setError('Error de red o servidor. Intenta nuevamente.');
      }
    } finally {
      setAddFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-xl text-blue-700">Cargando administradores...</p>
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
            Listado de Administradores
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Añadir Administrador
          </button>
        </div>

        {admins.length === 0 ? (
          <p className="text-gray-600 text-lg">No hay administradores registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((admin) => (
              <div key={admin.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{admin.usuario.nombre} {admin.usuario.apellido}</h2>
                <p className="text-gray-600">Email: {admin.usuario.email}</p>
                <p className="text-gray-600">Cargo: {admin.cargo}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para añadir administrador */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Añadir Nuevo Administrador"
      >
        <form onSubmit={handleAddSubmit} className="space-y-5">
            <div>
              <label htmlFor="modal-admin-nombre" className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                type="text"
                id="modal-admin-nombre"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Carlos"
              />
            </div>
            <div>
              <label htmlFor="modal-admin-apellido" className="block text-sm font-medium text-gray-700">
                Apellido
              </label>
              <input
                type="text"
                id="modal-admin-apellido"
                value={newApellido}
                onChange={(e) => setNewApellido(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Ruiz"
              />
            </div>
            <div>
              <label htmlFor="modal-admin-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="modal-admin-email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="carlos.ruiz@admin.com"
              />
            </div>
            <div>
              <label htmlFor="modal-admin-password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type="password"
                id="modal-admin-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="modal-admin-cargo" className="block text-sm font-medium text-gray-700">
                Cargo
              </label>
              <input
                type="text"
                id="modal-admin-cargo"
                value={newCargo}
                onChange={(e) => setNewCargo(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Administrador de Sistema"
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
                'Guardar Administrador'
              )}
            </button>
          </form>
      </Modal>
    </div>
  );
};

export default AdminView; // <--- Nombre de la función y exportación