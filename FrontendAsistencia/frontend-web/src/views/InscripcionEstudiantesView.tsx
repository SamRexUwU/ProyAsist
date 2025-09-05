import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import axios from 'axios';
import Modal from '../components/Modal';

// ------------------------------------
// 1. INTERFACES DE DATOS (basadas en tus serializadores)
// ------------------------------------
// Definimos la estructura de los datos que recibimos de la API
// Esto es fundamental para tener autocompletado y seguridad de tipos en TypeScript.

interface UsuarioInfo {
    id: number;
    username: string;
    email: string;
    nombre: string;
    apellido: string;
}

interface CarreraInfo {
    id: number;
    nombre: string;
}

interface SemestreInfo {
    id: number;
    nombre: string;
    carrera: number;
    carrera_nombre: string;
}

interface EstudianteInfo {
    id: number;
    codigo_institucional: string;
    usuario: UsuarioInfo;
    carrera: number | null; // ID de la carrera
    semestre_actual: number | null; // ID del semestre
    carrera_nombre: string | null;
    semestre_nombre: string | null;
}

// ------------------------------------
// 2. COMPONENTE PRINCIPAL
// ------------------------------------
const InscripcionEstudiantesView: React.FC = () => {
    // --- ESTADOS ---
    const [estudiantes, setEstudiantes] = useState<EstudianteInfo[]>([]);
    const [carreras, setCarreras] = useState<CarreraInfo[]>([]);
    const [semestres, setSemestres] = useState<SemestreInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- ESTADOS PARA FILTRAR Y SELECCIONAR ---
    const [selectedCarreraId, setSelectedCarreraId] = useState<number | null>(null);
    const [selectedSemestreId, setSelectedSemestreId] = useState<number | null>(null);

    // --- ESTADOS PARA EL MODAL DE INSCRIPCIÓN ---
    const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
    const [estudianteToEnroll, setEstudianteToEnroll] = useState<EstudianteInfo | null>(null);
    const [modalCarreraId, setModalCarreraId] = useState<number | null>(null);
    const [modalSemestreId, setModalSemestreId] = useState<number | null>(null);
    const [modalError, setModalError] = useState<string>('');
    const [modalSuccess, setModalSuccess] = useState<string>('');
    const [modalLoading, setModalLoading] = useState<boolean>(false);

    // ------------------------------------
    // 3. FUNCIONES DE CARGA DE DATOS DESDE LA API
    // ------------------------------------
    const fetchEstudiantes = useCallback(async () => {
        try {
            const response = await api.get<EstudianteInfo[]>('/estudiantes/');
            setEstudiantes(response.data);
        } catch (err) {
            console.error('Error fetching estudiantes:', err);
            setError('No se pudieron cargar los estudiantes.');
        }
    }, []);

    const fetchCarreras = useCallback(async () => {
        try {
            const response = await api.get<CarreraInfo[]>('/carreras/');
            setCarreras(response.data);
        } catch (err) {
            console.error('Error fetching carreras:', err);
            setError('No se pudieron cargar las carreras.');
        }
    }, []);

    const fetchSemestresByCarrera = useCallback(async (carreraId: number) => {
        try {
            const response = await api.get<SemestreInfo[]>(`/semestres/?carrera=${carreraId}`);
            setSemestres(response.data);
        } catch (err) {
            console.error('Error fetching semestres:', err);
            setSemestres([]);
        }
    }, []);

    // --- useEffects para cargar datos iniciales ---
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([
                fetchEstudiantes(),
                fetchCarreras(),
            ]);
            setLoading(false);
        };
        loadInitialData();
    }, [fetchEstudiantes, fetchCarreras]);

    // --- useEffect para cargar semestres cuando se selecciona una carrera ---
    useEffect(() => {
        if (selectedCarreraId) {
            fetchSemestresByCarrera(selectedCarreraId);
        } else {
            setSemestres([]);
            setSelectedSemestreId(null);
        }
    }, [selectedCarreraId, fetchSemestresByCarrera]);

    // ------------------------------------
    // 4. LÓGICA DE INSCRIPCIÓN Y MANEJO DE MODAL
    // ------------------------------------

    // Abre el modal para inscribir a un estudiante
    const handleEnrollClick = (estudiante: EstudianteInfo) => {
        setEstudianteToEnroll(estudiante);
        setModalCarreraId(estudiante.carrera);
        setModalSemestreId(estudiante.semestre_actual);
        setModalError('');
        setModalSuccess('');
        setShowEnrollModal(true);
    };

    // Envía la solicitud de actualización al backend
    const handleEnrollSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!estudianteToEnroll || modalCarreraId === null || modalSemestreId === null) return;

        setModalLoading(true);
        setModalError('');
        setModalSuccess('');

        try {
            const dataToUpdate = {
                carrera: modalCarreraId,
                semestre_actual: modalSemestreId,
            };
            const response = await api.patch(`/estudiantes/${estudianteToEnroll.id}/`, dataToUpdate);

            // Actualizamos la lista de estudiantes en el frontend sin recargar todo
            setEstudiantes(prevEstudiantes =>
                prevEstudiantes.map(est =>
                    est.id === response.data.id ? response.data : est
                )
            );

            setModalSuccess(`Estudiante "${response.data.usuario.nombre} ${response.data.usuario.apellido}" inscrito correctamente!`);
            
            setTimeout(() => {
                setShowEnrollModal(false);
                setEstudianteToEnroll(null);
                setModalSuccess('');
            }, 1500);

        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                console.error('Error al inscribir estudiante:', err.response.data);
                setModalError('Error al inscribir: ' + JSON.stringify(err.response.data));
            } else {
                console.error('Error inesperado:', err);
                setModalError('Error inesperado al inscribir al estudiante.');
            }
        } finally {
            setModalLoading(false);
        }
    };

    // ------------------------------------
    // 5. FILTRADO Y RENDERIZADO
    // ------------------------------------

    // Filtramos los estudiantes en el frontend
    const filteredEstudiantes = useMemo(() => {
        return estudiantes.filter(estudiante => {
            const matchesCarrera = !selectedCarreraId || estudiante.carrera === selectedCarreraId;
            const matchesSemestre = !selectedSemestreId || estudiante.semestre_actual === selectedSemestreId;
            return matchesCarrera && matchesSemestre;
        });
    }, [estudiantes, selectedCarreraId, selectedSemestreId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50">
                <p className="text-xl text-blue-700">Cargando datos de estudiantes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <p className="text-xl text-red-700">{error}</p>
            </div>
        );
    }

    // --- RENDERIZADO DE LA VISTA ---
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="container mx-auto mt-8">
                <h1 className="text-4xl font-extrabold text-blue-800 mb-6">
                    Inscripción de Estudiantes
                </h1>
                
                {/* --- SECCIÓN DE FILTROS --- */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-grow">
                        <label htmlFor="filter-carrera" className="block text-sm font-medium text-gray-700">
                            Filtrar por Carrera
                        </label>
                        <select
                            id="filter-carrera"
                            value={selectedCarreraId || ''}
                            onChange={(e) => setSelectedCarreraId(Number(e.target.value) || null)}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todas las Carreras</option>
                            {carreras.map((carrera) => (
                                <option key={carrera.id} value={carrera.id}>
                                    {carrera.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex-grow">
                        <label htmlFor="filter-semestre" className="block text-sm font-medium text-gray-700">
                            Filtrar por Semestre
                        </label>
                        <select
                            id="filter-semestre"
                            value={selectedSemestreId || ''}
                            onChange={(e) => setSelectedSemestreId(Number(e.target.value) || null)}
                            disabled={!selectedCarreraId}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200"
                        >
                            <option value="">Todos los Semestres</option>
                            {semestres.map((semestre) => (
                                <option key={semestre.id} value={semestre.id}>
                                    {semestre.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* --- LISTADO DE ESTUDIANTES --- */}
                {filteredEstudiantes.length === 0 ? (
                    <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600 text-lg">
                        No hay estudiantes para los filtros seleccionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Código
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre del Estudiante
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Carrera Actual
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Semestre Actual
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEstudiantes.map((estudiante) => (
                                    <tr key={estudiante.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {estudiante.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {estudiante.codigo_institucional}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {estudiante.usuario.nombre} {estudiante.usuario.apellido}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {estudiante.carrera_nombre || 'No asignada'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {estudiante.semestre_nombre || 'No asignado'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleEnrollClick(estudiante)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Inscribir / Actualizar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- MODAL DE INSCRIPCIÓN --- */}
            <Modal
                isOpen={showEnrollModal}
                onClose={() => setShowEnrollModal(false)}
                title="Inscribir Estudiante a Carrera y Semestre"
            >
                <form onSubmit={handleEnrollSubmit} className="space-y-5">
                    {estudianteToEnroll && (
                        <div className="bg-blue-50 p-4 rounded-md">
                            <p className="text-sm font-medium text-blue-700">
                                **Estudiante:** {estudianteToEnroll.usuario.nombre} {estudianteToEnroll.usuario.apellido}
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                                Código: {estudianteToEnroll.codigo_institucional}
                            </p>
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="modal-carrera-select" className="block text-sm font-medium text-gray-700">
                            Seleccionar Carrera
                        </label>
                        <select
                            id="modal-carrera-select"
                            value={modalCarreraId || ''}
                            onChange={(e) => {
                                setModalCarreraId(Number(e.target.value));
                                setModalSemestreId(null); // Resetea el semestre al cambiar de carrera
                            }}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="" disabled>Selecciona una carrera</option>
                            {carreras.map((carrera) => (
                                <option key={carrera.id} value={carrera.id}>
                                    {carrera.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="modal-semestre-select" className="block text-sm font-medium text-gray-700">
                            Seleccionar Semestre
                        </label>
                        <select
                            id="modal-semestre-select"
                            value={modalSemestreId || ''}
                            onChange={(e) => setModalSemestreId(Number(e.target.value))}
                            required
                            disabled={!modalCarreraId}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-200"
                        >
                            <option value="" disabled>
                                {modalCarreraId ? 'Selecciona un semestre' : 'Selecciona una carrera primero'}
                            </option>
                            {semestres.filter(s => s.carrera === modalCarreraId).map((semestre) => (
                                <option key={semestre.id} value={semestre.id}>
                                    {semestre.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {modalError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                            {modalError}
                        </div>
                    )}
                    {modalSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
                            {modalSuccess}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={modalLoading}
                        className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium transition ${
                            modalLoading
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {modalLoading ? (
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
                            'Guardar Inscripción'
                        )}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default InscripcionEstudiantesView;
