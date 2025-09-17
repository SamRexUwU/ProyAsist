import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiaEspecial {
  id: number;
  fecha: string;
  tipo: 'FERIADO' | 'SIN_CLASES' | 'SUSPENSION';
  descripcion: string;
  afecta_asistencia: boolean;
  creado_por_info?: {
    id: number;
    nombre_completo: string;
  };
  fecha_creacion: string;
}

const DiasEspecialesView: React.FC = () => {
  const [diasEspeciales, setDiasEspeciales] = useState<DiaEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDia, setEditingDia] = useState<DiaEspecial | null>(null);
  const [formData, setFormData] = useState<{
    fecha: string;
    tipo: 'FERIADO' | 'SIN_CLASES' | 'SUSPENSION';
    descripcion: string;
    afecta_asistencia: boolean;
  }>({
    fecha: '',
    tipo: 'FERIADO',
    descripcion: '',
    afecta_asistencia: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDiasEspeciales();
  }, []);

  const fetchDiasEspeciales = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get('http://localhost:8000/api/dias-especiales/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiasEspeciales(response.data);
    } catch (error) {
      console.error('Error al cargar días especiales:', error);
      setError('Error al cargar los días especiales');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('authToken');
      const data = {
        ...formData,
        fecha: formData.fecha // Send date as-is, it's already in YYYY-MM-DD format
      };

      if (editingDia) {
        await axios.put(`http://localhost:8000/api/dias-especiales/${editingDia.id}/`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:8000/api/dias-especiales/', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowForm(false);
      setEditingDia(null);
      setFormData({ fecha: '', tipo: 'FERIADO', descripcion: '', afecta_asistencia: true });
      fetchDiasEspeciales();
    } catch (error) {
      console.error('Error al guardar día especial:', error);
      const axiosError = error as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Error al guardar el día especial');
    }
  };

  const handleEdit = (dia: DiaEspecial) => {
    setEditingDia(dia);
    setFormData({
      fecha: dia.fecha,
      tipo: dia.tipo,
      descripcion: dia.descripcion,
      afecta_asistencia: dia.afecta_asistencia
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este día especial?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(`http://localhost:8000/api/dias-especiales/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDiasEspeciales();
    } catch (error) {
      console.error('Error al eliminar día especial:', error);
      setError('Error al eliminar el día especial');
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'FERIADO': return 'bg-red-100 text-red-800';
      case 'SIN_CLASES': return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENSION': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoDisplay = (tipo: string) => {
    switch (tipo) {
      case 'FERIADO': return 'Feriado';
      case 'SIN_CLASES': return 'Día sin clases';
      case 'SUSPENSION': return 'Suspensión';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Días Especiales</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Agregar Día Especial
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingDia ? 'Editar Día Especial' : 'Nuevo Día Especial'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value as 'FERIADO' | 'SIN_CLASES' | 'SUSPENSION'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="FERIADO">Feriado</option>
                  <option value="SIN_CLASES">Día sin clases</option>
                  <option value="SUSPENSION">Suspensión de actividades</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Día del Trabajo"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.afecta_asistencia}
                    onChange={(e) => setFormData({...formData, afecta_asistencia: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Afecta asistencia (previene registro de asistencia)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDia(null);
                  setFormData({ fecha: '', tipo: 'FERIADO', descripcion: '', afecta_asistencia: true });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingDia ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de días especiales */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lista de Días Especiales</h2>
        </div>

        {diasEspeciales.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No hay días especiales registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Afecta Asistencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {diasEspeciales.map((dia) => (
                  <tr key={dia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(new Date(dia.fecha), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(dia.tipo)}`}>
                        {getTipoDisplay(dia.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {dia.descripcion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dia.afecta_asistencia ? (
                        <span className="text-red-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-green-600">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dia.creado_por_info?.nombre_completo || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(dia)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(dia.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiasEspecialesView;
