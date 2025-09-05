// src/views/Docente/VerAsistenciaView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

interface MateriaDocente {
  id: number;
  materia_nombre: string;
  carrera_nombre: string;
  semestre_nombre: string;
  gestion: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estudiantes: {
    id: number;
    codigo_institucional: string;
    usuario__nombre: string;
    usuario__apellido: string;
  }[];
}

interface EstudianteAsistencia {
  id: number;
  nombre_completo: string;
  codigo_institucional: string;
  estado: string;
  ubicacion: string;
}

interface SesionClase {
  id: number;
  materia_semestre: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tema?: string;
}

const VerAsistenciaView: React.FC = () => {
  const [materias, setMaterias] = useState<MateriaDocente[]>([]);
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [loading, setLoading] = useState(false);
  const [generandoReporte, setGenerandoReporte] = useState(false);

  // Estados para los filtros
  const [selectedCarrera, setSelectedCarrera] = useState<string>('');
  const [selectedSemestre, setSelectedSemestre] = useState<string>('');
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedSesion, setSelectedSesion] = useState<number | null>(null);

  const [asistencias, setAsistencias] = useState<EstudianteAsistencia[]>([]);

  // Cargar materias del docente al montar el componente
  useEffect(() => {
    const cargarMaterias = async () => {
      setLoading(true);
      try {
        const res = await api.get<MateriaDocente[]>('/mis-materias-con-estudiantes/');
        console.log('Materias cargadas:', res.data);
        setMaterias(res.data);
      } catch (err) {
        console.error('Error al obtener materias:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarMaterias();
  }, []);

  // Obtener carreras únicas
  const carreras = React.useMemo(() => {
    const carrerasUnicas = Array.from(
      new Set(materias.map(m => m.carrera_nombre))
    ).sort();
    console.log('Carreras únicas:', carrerasUnicas);
    return carrerasUnicas;
  }, [materias]);

  // Obtener semestres únicos para la carrera seleccionada
  const semestres = React.useMemo(() => {
    if (!selectedCarrera) return [];
    
    const semestresUnicos = Array.from(
      new Set(
        materias
          .filter(m => m.carrera_nombre === selectedCarrera)
          .map(m => m.semestre_nombre)
      )
    ).sort();
    console.log('Semestres para carrera', selectedCarrera, ':', semestresUnicos);
    return semestresUnicos;
  }, [materias, selectedCarrera]);

  // Obtener materias filtradas
  const materiasFiltradas = React.useMemo(() => {
    if (!selectedCarrera || !selectedSemestre) return [];
    
    const filtered = materias.filter(
      m => m.carrera_nombre === selectedCarrera && m.semestre_nombre === selectedSemestre
    );
    console.log('Materias filtradas:', filtered);
    return filtered;
  }, [materias, selectedCarrera, selectedSemestre]);

  // Cargar sesiones cuando se selecciona una materia
  useEffect(() => {
    if (!selectedMateria) {
      setSesiones([]);
      setSelectedSesion(null);
      return;
    }

    const cargarSesiones = async () => {
      try {
        // Buscar sesiones de la materia seleccionada
        const res = await api.get<SesionClase[]>(`/sesiones-clase/?materia_semestre=${selectedMateria}`);
        console.log('Sesiones cargadas:', res.data);
        setSesiones(res.data);
      } catch (err) {
        console.error('Error al cargar sesiones:', err);
        setSesiones([]);
      }
    };

    cargarSesiones();
  }, [selectedMateria]);

  // Handlers para los cambios de filtros
  const handleCarreraChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCarrera = e.target.value;
    console.log('Carrera seleccionada:', newCarrera);
    setSelectedCarrera(newCarrera);
    setSelectedSemestre('');
    setSelectedMateria(null);
    setSelectedSesion(null);
    setAsistencias([]);
  }, []);

  const handleSemestreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSemestre = e.target.value;
    console.log('Semestre seleccionado:', newSemestre);
    setSelectedSemestre(newSemestre);
    setSelectedMateria(null);
    setSelectedSesion(null);
    setAsistencias([]);
  }, []);

  const handleMateriaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMateria = Number(e.target.value) || null;
    console.log('Materia seleccionada:', newMateria);
    setSelectedMateria(newMateria);
    setSelectedSesion(null);
    setAsistencias([]);
  }, []);

  const handleSesionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSesion = Number(e.target.value) || null;
    console.log('Sesión seleccionada:', newSesion);
    setSelectedSesion(newSesion);
    setAsistencias([]);
  }, []);

  // Buscar asistencias para la sesión seleccionada
  const handleBuscarAsistencias = async () => {
    if (!selectedSesion) {
      alert('Por favor selecciona una sesión');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<EstudianteAsistencia[]>(`/sesiones-clase/${selectedSesion}/estudiantes-asistencia/`);
      console.log('Asistencias cargadas:', res.data);
      setAsistencias(res.data);
    } catch (err) {
      console.error('Error al obtener asistencias:', err);
      alert('Error al obtener las asistencias');
      setAsistencias([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar y descargar el reporte
  const handleGenerarReporte = async () => {
    if (!selectedSesion) {
      alert('Por favor selecciona una sesión');
      return;
    }

    if (asistencias.length === 0) {
      alert('No hay asistencias para generar el reporte');
      return;
    }

    setGenerandoReporte(true);
    try {
      const response = await api.post('/generar-reporte-asistencia/', {
        sesion_id: selectedSesion
      }, {
        responseType: 'blob' // Importante para descargar archivos
      });

      // Crear un enlace temporal para descargar el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'reporte_asistencia.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Reporte generado y descargado exitosamente');
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte. Por favor, inténtalo de nuevo.');
    } finally {
      setGenerandoReporte(false);
    }
  };

  if (loading && materias.length === 0) {
    return <div className="p-6">Cargando materias...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Asistencia por Materia</h1>
    
      {/* DEBUG INFO */}
      {/*<div className="mb-4 p-4 bg-gray-100 rounded text-sm">
        <p><strong>Debug Info:</strong></p>
        <p>Total materias: {materias.length}</p>
        <p>Carrera seleccionada: {selectedCarrera || 'Ninguna'}</p>
        <p>Semestre seleccionado: {selectedSemestre || 'Ninguno'}</p>
        <p>Materia seleccionada: {selectedMateria || 'Ninguna'}</p>
        <p>Sesión seleccionada: {selectedSesion || 'Ninguna'}</p>
      </div>*/}
       
      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Carrera */}
        <div>
          <label className="block text-sm font-medium mb-1">Carrera:</label>
          <select
            value={selectedCarrera}
            onChange={handleCarreraChange}
            className="w-full p-2 border rounded"
            disabled={loading}
          >
            <option value="">Seleccione una carrera</option>
            {carreras.map((carrera, index) => (
              <option key={`carrera-${index}`} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
        </div>

        {/* Semestre */}
        <div>
          <label className="block text-sm font-medium mb-1">Semestre:</label>
          <select
            value={selectedSemestre}
            onChange={handleSemestreChange}
            disabled={!selectedCarrera || loading}
            className="w-full p-2 border rounded disabled:bg-gray-200"
          >
            <option value="">Seleccione un semestre</option>
            {semestres.map((semestre, index) => (
              <option key={`semestre-${index}`} value={semestre}>
                {semestre}
              </option>
            ))}
          </select>
        </div>

        {/* Materia */}
        <div>
          <label className="block text-sm font-medium mb-1">Materia:</label>
          <select
            value={selectedMateria || ''}
            onChange={handleMateriaChange}
            disabled={!selectedSemestre || loading}
            className="w-full p-2 border rounded disabled:bg-gray-200"
          >
            <option value="">Seleccione una materia</option>
            {materiasFiltradas.map((materia) => (
              <option key={`materia-${materia.id}`} value={materia.id}>
                {materia.materia_nombre} - {materia.dia_semana} {materia.hora_inicio}
              </option>
            ))}
          </select>
        </div>

        {/* Sesión */}
        <div>
          <label className="block text-sm font-medium mb-1">Sesión:</label>
          <select
            value={selectedSesion || ''}
            onChange={handleSesionChange}
            disabled={!selectedMateria || loading}
            className="w-full p-2 border rounded disabled:bg-gray-200"
          >
            <option value="">Seleccione una sesión</option>
            {sesiones.map((sesion) => (
              <option key={`sesion-${sesion.id}`} value={sesion.id}>
                {sesion.fecha} - {sesion.hora_inicio} a {sesion.hora_fin}
                {sesion.tema && ` (${sesion.tema})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOTÓN BUSCAR */}
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded disabled:bg-gray-400"
        onClick={handleBuscarAsistencias}
        disabled={!selectedSesion || loading}
      >
        {loading ? 'Buscando...' : 'Buscar Asistencias'}
      </button>

      {/* TABLA RESULTADOS */}
      {asistencias.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Asistencia - Total: {asistencias.length} estudiantes
            </h2>
            
            {/* Botón para generar reporte */}
            <button
              onClick={handleGenerarReporte}
              disabled={generandoReporte}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded disabled:bg-gray-400 flex items-center gap-2"
            >
              {generandoReporte ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Subir Reporte
                </>
              )}
            </button>
          </div>

          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2 border text-left">Nombre</th>
                <th className="px-4 py-2 border text-left">Código</th>
                <th className="px-4 py-2 border text-left">Estado</th>
                <th className="px-4 py-2 border text-left">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map((est) => (
                <tr
                  key={`estudiante-${est.id}`}
                  className={
                    est.estado === 'Presente'
                      ? 'bg-green-100'
                      : est.estado === 'Presente con retraso'
                      ? 'bg-yellow-100'
                      : est.estado === 'Falta justificada'
                      ? 'bg-blue-100'
                      : 'bg-red-100'
                  }
                >
                  <td className="border px-4 py-2">{est.nombre_completo}</td>
                  <td className="border px-4 py-2">{est.codigo_institucional}</td>
                  <td className="border px-4 py-2 font-semibold">{est.estado}</td>
                  <td className="border px-4 py-2">{est.ubicacion}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-100 p-2 rounded text-center">
              <div className="font-semibold">Presentes</div>
              <div>{asistencias.filter(a => a.estado === 'Presente').length}</div>
            </div>
            <div className="bg-yellow-100 p-2 rounded text-center">
              <div className="font-semibold">Con Retraso</div>
              <div>{asistencias.filter(a => a.estado === 'Presente con retraso').length}</div>
            </div>
            <div className="bg-blue-100 p-2 rounded text-center">
              <div className="font-semibold">Falta Justificada</div>
              <div>{asistencias.filter(a => a.estado === 'Falta justificada').length}</div>
            </div>
            <div className="bg-red-100 p-2 rounded text-center">
              <div className="font-semibold">Faltas</div>
              <div>{asistencias.filter(a => a.estado === 'Falta').length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerAsistenciaView;