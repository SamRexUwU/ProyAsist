// src/views/Administrador/VerAsistenciaAdministradorView.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';

interface Carrera {
  id: number;
  nombre: string;
  codigo: string;
}

interface Semestre {
  id: number;
  nombre: string;
  carrera: number;
}

interface Estudiante {
  id: number;
  codigo_institucional: string;
  usuario: {
    nombre: string;
    apellido: string;
  };
}

interface MateriaSemestre {
  id: number;
  gestion: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  materia: {
    id: number;
    nombre: string;
  };
}

interface SesionConAsistencia {
  id: number;
  sesion: {
    fecha: string;
    hora_inicio: string;
    tema: string;
    materia_semestre: { materia: { nombre: string } };
  };
  estado: 'Presente' | 'Presente con retraso' | 'Falta' | 'Falta justificada';
}

const VerAsistenciaAdministradorView: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [materias, setMaterias] = useState<MateriaSemestre[]>([]);
  const [asistencias, setAsistencias] = useState<SesionConAsistencia[]>([]);

  const [selectedCarreraId, setSelectedCarreraId] = useState<number | null>(null);
  const [selectedSemestreId, setSelectedSemestreId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);

  const [loadingCarreras, setLoadingCarreras] = useState(true);
  const [loadingSemestres, setLoadingSemestres] = useState(false);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carreras
  useEffect(() => {
    api.get('/carreras/')
      .then(res => setCarreras(res.data))
      .catch(() => setError('Error al cargar carreras'))
      .finally(() => setLoadingCarreras(false));
  }, []);

  // 2. Semestres
  useEffect(() => {
    if (!selectedCarreraId) return;
    setLoadingSemestres(true);
    api.get(`/semestres/?carrera_id=${selectedCarreraId}`)
      .then(res => setSemestres(res.data))
      .catch(() => setError('Error al cargar semestres'))
      .finally(() => setLoadingSemestres(false));
  }, [selectedCarreraId]);

  // 3. Estudiantes
  useEffect(() => {
    if (!selectedCarreraId || !selectedSemestreId) return;
    setLoadingEstudiantes(true);
    api.get(`/estudiantes/?carrera_id=${selectedCarreraId}&semestre_id=${selectedSemestreId}`)
      .then(res => setEstudiantes(res.data))
      .catch(() => setError('Error al cargar estudiantes'))
      .finally(() => setLoadingEstudiantes(false));
  }, [selectedCarreraId, selectedSemestreId]);

  // 4. Materias del estudiante (únicas)
  useEffect(() => {
    if (!selectedStudentId) return;
    setLoadingMaterias(true);
    api.get(`/materias-semestre/?estudiante_id=${selectedStudentId}`)
      .then(res => {
        // Filtrar materias únicas por materia.id
        const uniqueMaterias: MateriaSemestre[] = res.data.filter((ms: MateriaSemestre, index: number, self: MateriaSemestre[]) =>
          index === self.findIndex((m: MateriaSemestre) => m.materia.id === ms.materia.id)
        );
        setMaterias(uniqueMaterias);
      })
      .catch(() => setError('Error al cargar materias'))
      .finally(() => setLoadingMaterias(false));
  }, [selectedStudentId]);

  // 5. Asistencias (todas las sesiones)
  useEffect(() => {
    if (!selectedMateriaId) return;
    setLoadingAsistencias(true);
    api.get(`/estudiantes/historial-sesiones/?estudiante_id=${selectedStudentId}&materia_id=${selectedMateriaId}`)
      .then(res => setAsistencias(res.data))
      .catch(() => setError('Error al cargar sesiones'))
      .finally(() => setLoadingAsistencias(false));
  }, [selectedMateriaId]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Presente': return 'bg-green-100 text-green-800';
      case 'Presente con retraso': return 'bg-yellow-100 text-yellow-800';
      case 'Falta justificada': return 'bg-blue-100 text-blue-800';
      case 'Falta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel de Asistencia (Administrador)</h1>

      {error && <div className="p-4 mb-4 text-red-500 bg-red-50 border border-red-200 rounded">{error}</div>}

      <div className="mb-6">
        {/* Carrera */}
        <div className="mb-4">
          <label htmlFor="carrera-select" className="block text-sm font-medium text-[#002855] mb-1">Carrera</label>
          <select id="carrera-select" value={selectedCarreraId || ''} onChange={e => setSelectedCarreraId(Number(e.target.value))} disabled={loadingCarreras} className="border border-gray-300 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#002855]">
            <option value="">Seleccione una carrera</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>)}
          </select>
        </div>

        {/* Semestre */}
        <div className="mb-4">
          <label htmlFor="semestre-select" className="block text-sm font-medium text-[#002855] mb-1">Semestre</label>
          <select id="semestre-select" value={selectedSemestreId || ''} onChange={e => setSelectedSemestreId(Number(e.target.value))} disabled={!selectedCarreraId || loadingSemestres} className="border border-gray-300 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#002855]">
            <option value="">Seleccione un semestre</option>
            {semestres.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        {/* Estudiante */}
        <div className="mb-4">
          <label htmlFor="estudiante-select" className="block text-sm font-medium text-[#002855] mb-1">Estudiante</label>
          <select id="estudiante-select" value={selectedStudentId || ''} onChange={e => setSelectedStudentId(Number(e.target.value))} disabled={!selectedSemestreId || loadingEstudiantes} className="border border-gray-300 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#002855]">
            <option value="">Seleccione un estudiante</option>
            {estudiantes.map(e => <option key={e.id} value={e.id}>{e.usuario.nombre} {e.usuario.apellido} ({e.codigo_institucional})</option>)}
          </select>
        </div>

        {/* Materia */}
        <div className="mb-4">
          <label htmlFor="materia-select" className="block text-sm font-medium text-[#002855] mb-1">Materia</label>
          <select id="materia-select" value={selectedMateriaId || ''} onChange={e => setSelectedMateriaId(Number(e.target.value))} disabled={!selectedStudentId || loadingMaterias} className="border border-gray-300 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#002855]">
            <option value="">Seleccione una materia</option>
            {materias.map((m) => (
              <option key={m.materia.id} value={m.materia.id}>{m.materia.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedMateriaId && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Asistencia completa</h2>

          {loadingAsistencias ? <div className="text-center">Cargando…</div> : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th>Fecha</th>
                    <th>Materia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencias.map(a => (
                    <tr key={a.id}>
                      <td>{format(new Date(a.sesion.fecha), 'dd/MM/yyyy')}</td>
                      <td>{a.sesion?.materia_semestre?.materia?.nombre || 'N/A'}</td>
                      <td className={getEstadoColor(a.estado)}>{a.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VerAsistenciaAdministradorView;