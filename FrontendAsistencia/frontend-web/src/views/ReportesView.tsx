import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Reporte {
  id: number;
  tipo_reporte: string;
  fecha_generacion: string;
  generado_por: string;
  parametros: {
    sesion_id?: number;
    fecha_sesion?: string;
    materia?: string;
    carrera?: string;
    semestre?: string;
    total_estudiantes?: number;
  };
}

const ReportesView: React.FC = () => {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/listar-reportes-admin/');
      setReportes(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center mt-4 text-gray-600">Cargando reportes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <button
          onClick={cargarReportes}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes del Sistema</h1>
        <p className="text-gray-600">
          Aquí puedes ver todos los reportes generados por los docentes del sistema.
        </p>
      </div>

      {reportes.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aún no se han generado reportes en el sistema.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reportes.map((reporte) => (
              <li key={reporte.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg
                            className="h-6 w-6 text-blue-600"
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
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {reporte.tipo_reporte}
                        </div>
                        <div className="text-sm text-gray-500">
                          Generado por: {reporte.generado_por}
                        </div>
                        {reporte.parametros.materia && (
                          <div className="text-sm text-gray-500">
                            {reporte.parametros.materia} - {reporte.parametros.carrera} ({reporte.parametros.semestre})
                          </div>
                        )}
                        {reporte.parametros.fecha_sesion && (
                          <div className="text-sm text-gray-500">
                            Sesión del: {new Date(reporte.parametros.fecha_sesion).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {reporte.parametros.total_estudiantes && (
                          <div className="text-sm text-gray-500">
                            Total estudiantes: {reporte.parametros.total_estudiantes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {formatearFecha(reporte.fecha_generacion)}
                      </div>
                      <div className="text-xs text-gray-400">
                        ID: {reporte.id}
                      </div>
                      <button
            onClick={async () => {
              try {
                const res = await api.get(`/descargar-reporte/${reporte.id}/`, {
                  responseType: 'blob',
                });
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte_${reporte.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
                alert('Error al descargar el reporte');
              }
            }}
            className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Descargar PDF
          </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={cargarReportes}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded"
        >
          Actualizar Lista
        </button>
      </div>
    </div>
  );
};

export default ReportesView;

