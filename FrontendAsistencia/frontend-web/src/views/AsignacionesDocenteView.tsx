import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmationModal from '../components/ConfirmationModal'; // <-- Tu modal de confirmación

// --- INTERFACES (CRUCIAL: Asegúrate que coincidan con la SALIDA de tus serializers) ---
// Las interfaces se mantienen igual
interface UsuarioInfo {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
}

interface DocenteInfo {
    id: number;
    usuario: UsuarioInfo;
    especialidad: string;
}

interface CarreraInfo {
    id: number;
    nombre: string;
}

interface SemestreInfo {
    id: number;
    nombre: string;
    carrera: number; // ID de la carrera (FK)
    carrera_nombre?: string; // Nombre de la carrera si tu SemestreSerializer lo incluye
}

interface MateriaInfo { // Usando tu nombre Materia
    id: number;
    nombre: string;
    descripcion: string;
    isAssigned?: boolean;
}

interface MateriaSemestreDetail {
    id: number;
    semestre: number;
    gestion: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    materia_nombre?: string;
    semestre_nombre?: string;
    carrera_semestre?: string;
    nombre_materia_a_crear_o_seleccionar?: string;
}

interface DocenteMateriaSemestreRegistro {
    id: number;
    docente: number;
    materia_semestre: MateriaSemestreDetail;
    docente_info?: DocenteInfo;
    materia_semestre_info?: MateriaSemestreDetail;
}

const AsignacionesDocenteView: React.FC = () => {
    const [asignacionesMaterias, setAsignacionesMaterias] = useState<DocenteMateriaSemestreRegistro[]>([]);
    const [carreras, setCarreras] = useState<CarreraInfo[]>([]);
    const [semestres, setSemestres] = useState<SemestreInfo[]>([]);
    const [docentes, setDocentes] = useState<DocenteInfo[]>([]);
    const [materiasDisponibles, setMateriasDisponibles] = useState<MateriaInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Estados para el modal de AÑADIR
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
    const [selectedCarreraId, setSelectedCarreraId] = useState<number | null>(null);
    const [selectedSemestreId, setSelectedSemestreId] = useState<number | null>(null);
    const [newGestion, setNewGestion] = useState<string>('');
    const [newDiaSemana, setNewDiaSemana] = useState<string>('');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [newHoraInicio, setNewHoraInicio] = useState<string>('');
    const [newHoraFin, setNewHoraFin] = useState<string>('');
    const [selectedDocenteId, setSelectedDocenteId] = useState<number | null>(null);
    const [addFormError, setAddFormError] = useState<string>('');
    const [addFormSuccess, setAddFormSuccess] = useState<string>('');
    const [addFormLoading, setAddFormLoading] = useState<boolean>(false);

    // Estados para el modal de ACTUALIZAR
    const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
    const [asignacionToUpdate, setAsignacionToUpdate] = useState<DocenteMateriaSemestreRegistro | null>(null);
    const [updateFormError, setUpdateFormError] = useState<string>('');
    const [updateFormSuccess, setUpdateFormSuccess] = useState<string>('');
    const [updateFormLoading, setUpdateFormLoading] = useState<boolean>(false);

    // ESTADOS MODIFICADOS: para el modal de CONFIRMACIÓN
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [asignacionToDelete, setAsignacionToDelete] = useState<number | null>(null);

    // Estados para el filtro
    const [filteredAsignaciones, setFilteredAsignaciones] = useState<DocenteMateriaSemestreRegistro[]>([]);
    const [filterCarreraId, setFilterCarreraId] = useState<number | ''>('');
    const [filterSemestreId, setFilterSemestreId] = useState<number | ''>('');
    const [filterSemestres, setFilterSemestres] = useState<SemestreInfo[]>([]);

    // --- Funciones de carga de datos ---
    const fetchAsignacionesMaterias = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get<DocenteMateriaSemestreRegistro[]>('/docentes-materias-semestre/');
            setAsignacionesMaterias(response.data);
        } catch (err) {
            console.error('Error al cargar asignaciones de materias:', err);
            setError('No se pudieron cargar las asignaciones de materias. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCarreras = useCallback(async () => {
        try {
            const response = await api.get<CarreraInfo[]>('/carreras/');
            setCarreras(response.data);
        } catch (err) {
            console.error('Error al cargar carreras:', err);
        }
    }, []);

    const fetchDocentes = useCallback(async () => {
        try {
            const response = await api.get<DocenteInfo[]>('/docentes/');
            setDocentes(response.data);
        } catch (err) {
            console.error('Error al cargar docentes:', err);
        }
    }, []);

    const fetchSemestresByCarrera = useCallback(async (carreraId: number) => {
        try {
            const response = await api.get<SemestreInfo[]>(`/semestres/?carrera_id=${carreraId}`);
            setSemestres(response.data);
            return response.data;
        } catch (err) {
            console.error('Error al cargar semestres:', err);
            setSemestres([]);
            return [];
        }
    }, []);

    const fetchMateriasDisponibles = useCallback(async () => {
        try {
            // Fetch materias disponibles from backend, which now excludes assigned materias
            const response = await api.get<MateriaInfo[]>('/materias/');
            setMateriasDisponibles(response.data);
        } catch (err) {
            console.error('Error al cargar materias disponibles:', err);
        }
    }, []);

    const fetchFilterSemestres = useCallback(async (carreraId: number) => {
        try {
            const response = await api.get<SemestreInfo[]>(`/semestres/?carrera_id=${carreraId}`);
            setFilterSemestres(response.data);
        } catch (err) {
            console.error('Error al cargar semestres para filtro:', err);
            setFilterSemestres([]);
        }
    }, []);



    useEffect(() => {
        fetchAsignacionesMaterias();
        fetchMateriasDisponibles();
        fetchCarreras();
        fetchDocentes();
    }, [fetchAsignacionesMaterias, fetchMateriasDisponibles, fetchCarreras, fetchDocentes]);

    useEffect(() => {
        if (selectedCarreraId) {
            fetchSemestresByCarrera(selectedCarreraId);
            setSelectedSemestreId(null);
        } else {
            setSemestres([]);
            setSelectedSemestreId(null);
        }
    }, [selectedCarreraId, fetchSemestresByCarrera]);

    // Inicializar filteredAsignaciones
    useEffect(() => {
        setFilteredAsignaciones(asignacionesMaterias);
    }, [asignacionesMaterias]);

    // Filtrado por carrera y semestre
    useEffect(() => {
        let filtered = asignacionesMaterias;
        if (filterCarreraId) {
            filtered = filtered.filter(asignacion => {
                const carrera = carreras.find(c => c.nombre === asignacion.materia_semestre_info?.carrera_semestre);
                return carrera?.id === filterCarreraId;
            });
        }
        if (filterSemestreId) {
            filtered = filtered.filter(asignacion => asignacion.materia_semestre_info?.semestre_nombre === filterSemestres.find(s => s.id === filterSemestreId)?.nombre);
        }
        setFilteredAsignaciones(filtered);
    }, [filterCarreraId, filterSemestreId, asignacionesMaterias, carreras, filterSemestres]);

    // Actualizar filterSemestres cuando cambia filterCarreraId
    useEffect(() => {
        if (filterCarreraId) {
            fetchFilterSemestres(filterCarreraId);
        } else {
            setFilterSemestres([]);
        }
    }, [filterCarreraId, fetchFilterSemestres]);

    // --- Manejo de la lógica de AÑADIR ---
    const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAddFormError('');
        setAddFormSuccess('');
        setAddFormLoading(true);

        if (!selectedMateriaId || !selectedCarreraId || !selectedSemestreId || !selectedDocenteId ||
            !newGestion || selectedDays.length === 0 || !newHoraInicio || !newHoraFin) {
            setAddFormError('Todos los campos son obligatorios.');
            setAddFormLoading(false);
            return;
        }

        const materiaSeleccionada = materiasDisponibles.find(m => m.id === selectedMateriaId);

        if (!materiaSeleccionada) {
            setAddFormError('Materia seleccionada no encontrada. Por favor, recarga la página.');
            setAddFormLoading(false);
            return;
        }

        // Se elimina la restricción que bloquea asignar la misma materia a diferentes docentes
        // Ya no se verifica si la materia está asignada a otro docente

        try {
            const promises = selectedDays.map(async (dia) => {
                const dataToSend = {
                    docente: selectedDocenteId,
                    materia_semestre: {
                        nombre_materia_a_crear_o_seleccionar: materiaSeleccionada.nombre,
                        semestre: selectedSemestreId,
                        gestion: newGestion,
                        dia_semana: dia,
                        hora_inicio: newHoraInicio,
                        hora_fin: newHoraFin,
                        id: 0
                    },
                };
                return api.post('/docentes-materias-semestre/', dataToSend);
            });

            const responses = await Promise.all(promises);

            const successfulResponses = responses.filter(response => response.status === 201);
            const failedResponses = responses.filter(response => response.status !== 201);

            if (successfulResponses.length > 0) {
                setAddFormSuccess(`${successfulResponses.length} asignación(es) añadida(s) exitosamente!`);
                fetchAsignacionesMaterias();
            }

            if (failedResponses.length > 0) {
                // Try to extract backend error message for display
                const backendErrors = failedResponses.map(r => r.data?.detail || JSON.stringify(r.data)).join('; ');
                setAddFormError(`Error al añadir asignación(es): ${backendErrors}`);
            }

            if (successfulResponses.length > 0) {
                setSelectedMateriaId(null);
                setSelectedCarreraId(null);
                setSelectedSemestreId(null);
                setSelectedDocenteId(null);
                setNewGestion('');
                setSelectedDays([]);
                setNewHoraInicio('');
                setNewHoraFin('');
                setSemestres([]);

                setTimeout(() => {
                    setShowAddModal(false);
                    setAddFormSuccess('');
                }, 1500);
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                console.error('Error al añadir asignación:', err.response.data);
                const errorData = err.response.data;
                if (errorData.materia_semestre && errorData.materia_semestre.nombre_materia_a_crear_o_seleccionar) {
                    setAddFormError(`Error en el campo de materia: ${errorData.materia_semestre.nombre_materia_a_crear_o_seleccionar.join(', ')}`);
                } else {
                    setAddFormError('Error al añadir asignación: ' + JSON.stringify(errorData));
                }
            } else {
                console.error('Error inesperado:', err);
                setAddFormError('Error inesperado al añadir asignación.');
            }
        } finally {
            setAddFormLoading(false);
        }
    };

    // --- Lógica para ACTUALIZAR ---
    const handleUpdateClick = async (asignacion: DocenteMateriaSemestreRegistro) => {
        setAsignacionToUpdate(asignacion);
        if (asignacion.materia_semestre_info) {
            const carrera = carreras.find(c => c.nombre === asignacion.materia_semestre_info?.carrera_semestre);
            if (carrera) {
                setSelectedCarreraId(carrera.id);
                const semestresFetched = await fetchSemestresByCarrera(carrera.id);
                const semestre = semestresFetched.find(s => s.nombre === asignacion.materia_semestre_info?.semestre_nombre);
                if (semestre) setSelectedSemestreId(semestre.id);
            }
            setNewGestion(asignacion.materia_semestre_info?.gestion || '');
            setNewDiaSemana(asignacion.materia_semestre_info?.dia_semana || '');
            setNewHoraInicio(asignacion.materia_semestre_info?.hora_inicio?.substring(0, 5) || '');
            setNewHoraFin(asignacion.materia_semestre_info?.hora_fin?.substring(0, 5) || '');
            setSelectedDocenteId(asignacion.docente_info?.id || null);
        }
        setUpdateFormError('');
        setUpdateFormSuccess('');
        setShowUpdateModal(true);
    };

    const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUpdateFormError('');
        setUpdateFormSuccess('');
        setUpdateFormLoading(true);

        if (!asignacionToUpdate) {
            setUpdateFormError('Error: No se ha seleccionado una asignación para actualizar.');
            setUpdateFormLoading(false);
            return;
        }

        try {
            const dataToUpdate = {
                docente: selectedDocenteId,
                materia_semestre: {
                    semestre: selectedSemestreId,
                    gestion: newGestion,
                    dia_semana: newDiaSemana,
                    hora_inicio: newHoraInicio,
                    hora_fin: newHoraFin,
                },
            };
            const response = await api.patch(`/docentes-materias-semestre/${asignacionToUpdate.id}/`, dataToUpdate);

            setUpdateFormSuccess(`Asignación de "${response.data.materia_semestre_info.materia_nombre}" actualizada exitosamente!`);
            fetchAsignacionesMaterias();

            setTimeout(() => {
                setShowUpdateModal(false);
                setUpdateFormSuccess('');
            }, 1500);

        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                console.error('Error al actualizar la asignación:', err.response.data);
                setUpdateFormError('Error al actualizar: ' + JSON.stringify(err.response.data));
            } else {
                console.error('Error inesperado:', err);
                setUpdateFormError('Error inesperado al actualizar la asignación.');
            }
        } finally {
            setUpdateFormLoading(false);
        }
    };

    // --- Lógica MODIFICADA para ELIMINAR ---
    const handleDeleteClick = (asignacionId: number) => {
        // Guarda el ID y abre el modal de confirmación
        setAsignacionToDelete(asignacionId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        // Esta función se ejecuta solo cuando el usuario confirma en el modal
        if (!asignacionToDelete) return;

        try {
            await api.delete(`/docentes-materias-semestre/${asignacionToDelete}/`);
            fetchAsignacionesMaterias(); // Recarga la lista para que el registro eliminado desaparezca
            alert('Asignación eliminada exitosamente.');
        } catch (err) {
            console.error('Error al eliminar la asignación:', err);
            alert('Error al eliminar la asignación. Por favor, intenta de nuevo.');
        } finally {
            setShowDeleteModal(false); // Cierra el modal de confirmación
            setAsignacionToDelete(null); // Limpia el ID guardado
        }
    };



    // --- Renderizado de la vista ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50">
                <p className="text-xl text-blue-700">Cargando asignaciones...</p>
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
        <div className="min-h-screen bg-[#f8f9fa] p-8 font-sans">
            <div className="container mx-auto mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-[#002855]">
                        Listado de Asignaciones de Materias
                    </h1>
                    <button
                        onClick={() => {
                            setShowAddModal(true);
                            setAddFormError('');
                            setAddFormSuccess('');
                            setSelectedMateriaId(null);
                            setSelectedCarreraId(null);
                            setSelectedSemestreId(null);
                            setSelectedDocenteId(null);
                            setNewGestion('');
                            setSelectedDays([]);
                            setNewHoraInicio('');
                            setNewHoraFin('');
                            setSemestres([]);
                        }}
                        className="px-6 py-2 bg-[#28a745] text-white rounded-md hover:bg-[#218838] transition flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg "><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Añadir Asignación de Materia
                    </button>
                </div>

                <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold mb-4">Filtros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="filter-carrera" className="block text-sm font-medium text-gray-700">
                                Carrera
                            </label>
                            <select
                                id="filter-carrera"
                                value={filterCarreraId}
                                onChange={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : '';
                                    setFilterCarreraId(value);
                                    setFilterSemestreId(''); // Reset semestre when carrera changes
                                }}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">Todas las carreras</option>
                                {carreras.map((carrera) => (
                                    <option key={carrera.id} value={carrera.id}>
                                        {carrera.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-semestre" className="block text-sm font-medium text-gray-700">
                                Semestre
                            </label>
                            <select
                                id="filter-semestre"
                                value={filterSemestreId}
                                onChange={(e) => setFilterSemestreId(e.target.value ? Number(e.target.value) : '')}
                                disabled={!filterCarreraId || filterSemestres.length === 0}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">Todos los semestres</option>
                                {filterSemestres.map((semestre) => (
                                    <option key={semestre.id} value={semestre.id}>
                                        {semestre.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {filteredAsignaciones.length === 0 ? (
                    <p className="text-gray-600 text-lg">No hay asignaciones de materias registradas.</p>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID Asignación
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Materia
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Carrera
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Semestre
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Docente
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Gestión
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Día
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hora Inicio
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hora Fin
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredAsignaciones.map((asignacion) => (
                                    <tr key={asignacion.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {asignacion.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.materia_nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.carrera_semestre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.semestre_nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.docente_info?.usuario.nombre} {asignacion.docente_info?.usuario.apellido || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.gestion || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.dia_semana || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.hora_inicio?.substring(0, 5) || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {asignacion.materia_semestre_info?.hora_fin?.substring(0, 5) || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleUpdateClick(asignacion)}
                                                className="text-[#007bff] hover:text-[#0056b3] mr-4"
                                            >
                                                Actualizar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(asignacion.id)}
                                                className="text-[#dc3545] hover:text-[#c82333]"
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

            {/* Modal para Añadir Asignación */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Añadir Nueva Asignación de Materia"
            >
                <form onSubmit={handleAddSubmit} className="space-y-5">
                    {/* ... Contenido del formulario de añadir (sin cambios) ... */}
                    {/* Selección de Materia */}
                    <div>
                        <label htmlFor="modal-materia-select" className="block text-sm font-medium text-gray-700">
                            Materia
                        </label>
                        <select
                            id="modal-materia-select"
                            value={selectedMateriaId || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setSelectedMateriaId(id);
                            }}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="" disabled>Selecciona una materia</option>
                            {materiasDisponibles.map((materia) => (
                                <option key={materia.id} value={materia.id}>
                                    {materia.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Selección de Carrera */}
                    <div>
                        <label htmlFor="modal-materia-carrera" className="block text-sm font-medium text-gray-700">
                            Carrera
                        </label>
                        <select
                            id="modal-materia-carrera"
                            value={selectedCarreraId || ''}
                            onChange={(e) => setSelectedCarreraId(Number(e.target.value))}
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
                    {/* Selección de Semestre (dependiente de Carrera) */}
                    <div>
                        <label htmlFor="modal-materia-semestre" className="block text-sm font-medium text-gray-700">
                            Semestre
                        </label>
                        <select
                            id="modal-materia-semestre"
                            value={selectedSemestreId || ''}
                            onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
                            required
                            disabled={!selectedCarreraId || semestres.length === 0}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="" disabled>
                                {selectedCarreraId ? (semestres.length === 0 ? 'Cargando semestres o no hay semestres para esta carrera' : 'Selecciona un semestre') : 'Selecciona una carrera primero'}
                            </option>
                            {semestres.map((semestre) => (
                                <option key={semestre.id} value={semestre.id}>
                                    {semestre.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Selección de Docente */}
                    <div>
                        <label htmlFor="modal-materia-docente" className="block text-sm font-medium text-gray-700">
                            Docente Asignado
                        </label>
                        <select
                            id="modal-materia-docente"
                            value={selectedDocenteId || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setSelectedDocenteId(id);
                            }}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="" disabled>Selecciona un docente</option>
                            {docentes.map((docente) => (
                                <option key={docente.id} value={docente.id}>
                                    {docente.usuario.nombre} {docente.usuario.apellido}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Campos de la Oferta de Materia-Semestre */}
                    <div>
                        <label htmlFor="modal-gestion" className="block text-sm font-medium text-gray-700">
                            Gestión (Ej: 2025/1, II-2024)
                        </label>
                        <input
                            type="text"
                            id="modal-gestion"
                            value={newGestion}
                            onChange={(e) => setNewGestion(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: 2025/1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Días de la Semana
                        </label>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => (
                                <label key={dia} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedDays.includes(dia)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedDays([...selectedDays, dia]);
                                            } else {
                                                setSelectedDays(selectedDays.filter(d => d !== dia));
                                            }
                                        }}
                                        className="mr-2"
                                    />
                                    {dia}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="modal-hora-inicio" className="block text-sm font-medium text-gray-700">
                            Hora de Inicio
                        </label>
                        <input
                            type="time"
                            id="modal-hora-inicio"
                            value={newHoraInicio}
                            onChange={(e) => setNewHoraInicio(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="modal-hora-fin" className="block text-sm font-medium text-gray-700">
                            Hora de Fin
                        </label>
                        <input
                            type="time"
                            id="modal-hora-fin"
                            value={newHoraFin}
                            onChange={(e) => setNewHoraFin(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                                ? 'bg-[#6c757d] cursor-not-allowed'
                                : 'bg-[#007bff] hover:bg-[#0056b3]'
                        }`}
                    >
                        {addFormLoading ? (
                            <svg
                                className="animate-spin h-5 w-5 mr-2 text-white"
                                xmlns="http://www.w3.org/2000/svg "
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
                            'Guardar Asignación'
                        )}
                    </button>
                </form>
            </Modal>

            {/* Modal para Actualizar Asignación */}
            <Modal
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                title="Actualizar Asignación de Materia"
            >
                <form onSubmit={handleUpdateSubmit} className="space-y-5">
                    {/* ... Contenido del formulario de actualizar (sin cambios) ... */}
                    {asignacionToUpdate && (
                        <>
                            <div className="bg-blue-50 p-4 rounded-md">
                                <p className="text-sm font-medium text-blue-700">
                                    **Asignación:** {asignacionToUpdate.materia_semestre_info?.materia_nombre || 'N/A'} - {asignacionToUpdate.docente_info?.usuario.nombre || ''} {asignacionToUpdate.docente_info?.usuario.apellido || ''}
                                </p>
                            </div>
                            {/* Selección de Docente */}
                            <div>
                                <label htmlFor="modal-update-docente" className="block text-sm font-medium text-gray-700">
                                    Docente Asignado
                                </label>
                                <select
                                    id="modal-update-docente"
                                    value={selectedDocenteId || ''}
                                    onChange={(e) => setSelectedDocenteId(Number(e.target.value))}
                                    required
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="" disabled>Selecciona un docente</option>
                                    {docentes.map((docente) => (
                                        <option key={docente.id} value={docente.id}>
                                            {docente.usuario.nombre} {docente.usuario.apellido}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="modal-update-gestion" className="block text-sm font-medium text-gray-700">
                                    Gestión (Ej: 2025/1, II-2024)
                                </label>
                                <input
                                    type="text"
                                    id="modal-update-gestion"
                                    value={newGestion}
                                    onChange={(e) => setNewGestion(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: 2025/1"
                                />
                            </div>
                            <div>
                                <label htmlFor="modal-update-dia-semana" className="block text-sm font-medium text-gray-700">
                                    Día de la Semana
                                </label>
                                <select
                                    id="modal-update-dia-semana"
                                    value={newDiaSemana}
                                    onChange={(e) => setNewDiaSemana(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="" disabled>Selecciona un día</option>
                                    <option value="Lunes">Lunes</option>
                                    <option value="Martes">Martes</option>
                                    <option value="Miércoles">Miércoles</option>
                                    <option value="Jueves">Jueves</option>
                                    <option value="Viernes">Viernes</option>
                                    <option value="Sábado">Sábado</option>
                                    <option value="Domingo">Domingo</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="modal-update-hora-inicio" className="block text-sm font-medium text-gray-700">
                                    Hora de Inicio
                                </label>
                                <input
                                    type="time"
                                    id="modal-update-hora-inicio"
                                    value={newHoraInicio}
                                    onChange={(e) => setNewHoraInicio(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="modal-update-hora-fin" className="block text-sm font-medium text-gray-700">
                                    Hora de Fin
                                </label>
                                <input
                                    type="time"
                                    id="modal-update-hora-fin"
                                    value={newHoraFin}
                                    onChange={(e) => setNewHoraFin(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </>
                    )}
                    {updateFormError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                            {updateFormError}
                        </div>
                    )}
                    {updateFormSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
                            {updateFormSuccess}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={updateFormLoading}
                        className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium transition ${
                            updateFormLoading
                                ? 'bg-[#6c757d] cursor-not-allowed'
                                : 'bg-[#007bff] hover:bg-[#0056b3]'
                        }`}
                    >
                        {updateFormLoading ? (
                            <svg
                                className="animate-spin h-5 w-5 mr-2 text-white"
                                xmlns="http://www.w3.org/2000/svg "
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
                            'Guardar Cambios'
                        )}
                    </button>
                </form>
            </Modal>
            
            {/* --- Nuevo Modal de Confirmación para eliminar --- */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que deseas eliminar esta asignación? Esta acción no se puede deshacer."
            />
        </div>
    );
};

export default AsignacionesDocenteView; 