import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import SessionConfirmationModal from '../components/SessionConfirmationModal';
import ListaEstudiantesModal from '../components/ListaEstudiantesModal';
import moment from 'moment';

// Interfaz para la información de la materia asignada al docente
interface Estudiante {
  id: number;
  codigo_institucional: string;
  usuario__nombre: string;
  usuario__apellido: string;
}


interface MateriaDocente {
    id: number;
    materia_nombre: string;
    carrera_nombre: string;
    semestre_nombre: string;
    gestion: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    estudiantes: Estudiante[]; 
}

// Interfaz para los datos de la sesión creada (respuesta del backend)
interface SesionCreada {
    id: number;
    materia_semestre: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    tema: string;
}



const MisMateriasDocenteView: React.FC = () => {
    const [materias, setMaterias] = useState<MateriaDocente[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [createdSession, setCreatedSession] = useState<SesionCreada | null>(null);
    const [isExistingSession, setIsExistingSession] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(moment());

    const [showEstudiantesModal, setShowEstudiantesModal] = useState(false);
    const [selectedEstudiantes, setSelectedEstudiantes] = useState<Estudiante[]>([]);

    // Estado para controlar sesiones ya creadas o en proceso para evitar llamadas repetidas
    const [sesionesProcesadas, setSesionesProcesadas] = useState<{[key: number]: boolean}>({});

    // Estado para verificar si hoy es un día especial
    const [isDiaEspecial, setIsDiaEspecial] = useState(false);

    useEffect(() => {
        const fetchMisMaterias = async () => {
            try {
                setLoading(true);
                const response = await api.get<MateriaDocente[]>('mis-materias-con-estudiantes/');
                setMaterias(response.data);
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    console.error('No autenticado, redirigiendo a login:', err);
                    navigate('/login');
                } else {
                    console.error('Error al cargar las materias:', err);
                    setError('No se pudieron cargar tus materias. Por favor, intenta de nuevo.');
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchDiaEspecial = async () => {
            try {
                const fecha = moment().format('YYYY-MM-DD');
                const response = await api.get(`/dias-especiales/verificar-fecha/?fecha=${fecha}`);
                setIsDiaEspecial(response.data.es_dia_especial);
            } catch (err) {
                console.error('Error al verificar día especial:', err);
            }
        };

        fetchMisMaterias();
        fetchDiaEspecial();
    }, [navigate]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment());
        }, 1000); // Actualizar cada segundo para mayor precisión

        return () => clearInterval(timer);
    }, []);

    // Nuevo useEffect para crear sesión automáticamente cuando la clase está activa
    useEffect(() => {
        materias.forEach(materia => {
            const diaActual = currentTime.format('dddd');
            const diasMap: { [key: string]: string } = {
                'Lunes': 'Monday', 'Martes': 'Tuesday', 'Miércoles': 'Wednesday',
                'Jueves': 'Thursday', 'Viernes': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday'
            };
            const diaMateriaEnIngles = diasMap[materia.dia_semana];
            const horaActual = currentTime;
            const horaInicioMateria = moment(materia.hora_inicio, 'HH:mm');
            const horaFinMateria = moment(materia.hora_fin, 'HH:mm');

            const isActive = diaMateriaEnIngles === diaActual && horaActual.isBetween(horaInicioMateria, horaFinMateria, undefined, '[)');

            if (isActive && !sesionesProcesadas[materia.id] && !isDiaEspecial) {
                // Marcar como procesada para evitar llamadas repetidas
                setSesionesProcesadas(prev => ({ ...prev, [materia.id]: true }));
                // Intentar crear sesión automáticamente
                handleCrearSesion(materia);
            }
        });
    }, [materias, currentTime]);

    const getMateriaStatus = (materia: MateriaDocente): { isActive: boolean; message: string; timeUntilActive?: string } => {
        if (isDiaEspecial) {
            return {
                isActive: false,
                message: 'Día especial - No se puede iniciar sesión'
            };
        }

        const diaActual = currentTime.format('dddd');
        const diaMateria = materia.dia_semana;

        const diasMap: { [key: string]: string } = {
            'Lunes': 'Monday', 'Martes': 'Tuesday', 'Miércoles': 'Wednesday',
            'Jueves': 'Thursday', 'Viernes': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday'
        };

        const diaMateriaEnIngles = diasMap[diaMateria];

        if (diaMateriaEnIngles !== diaActual) {
            // Calcular cuántos días faltan hasta el próximo día de la materia
            const diasSemana = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const diaActualIndex = diasSemana.indexOf(diaActual);
            const diaMateriaIndex = diasSemana.indexOf(diaMateriaEnIngles);
            
            let diasFaltantes = diaMateriaIndex - diaActualIndex;
            if (diasFaltantes <= 0) {
                diasFaltantes += 7; // Siguiente semana
            }
            
            return {
                isActive: false,
                message: `La materia no está programada para hoy. Próxima clase en ${diasFaltantes} día${diasFaltantes > 1 ? 's' : ''}.`
            };
        }

        const horaActual = currentTime;
        const horaInicioMateria = moment(materia.hora_inicio, 'HH:mm');
        const horaFinMateria = moment(materia.hora_fin, 'HH:mm');

        if (horaActual.isBefore(horaInicioMateria)) {
            const tiempoRestante = moment.duration(horaInicioMateria.diff(horaActual));
            const minutos = Math.floor(tiempoRestante.asMinutes());
            const horas = Math.floor(minutos / 60);
            const minutosRestantes = minutos % 60;
            
            let timeUntilActive = '';
            if (horas > 0) {
                timeUntilActive = `${horas}h ${minutosRestantes}m`;
            } else {
                timeUntilActive = `${minutosRestantes}m`;
            }
            
            return {
                isActive: false,
                message: `La clase comenzará en ${timeUntilActive}`,
                timeUntilActive
            };
        }

        if (horaActual.isAfter(horaFinMateria)) {
            return {
                isActive: false,
                message: 'La clase ya terminó para hoy'
            };
        }

        return {
            isActive: true,
            message: 'Clase en curso - Puedes iniciar sesión'
        };
    };

    const handleCrearSesion = async (materia: MateriaDocente) => {
        const fecha = moment().format('YYYY-MM-DD');

        // IMPORTANTE: Resetear todos los estados del modal antes de la llamada
        setErrorMessage(null);
        setCreatedSession(null);
        setIsExistingSession(false);

        try {
            const response = await api.post<SesionCreada>('/sesiones-clase/', {
                materia_semestre: materia.id,
                fecha: fecha,
                tema: `Clase de ${materia.materia_nombre} del ${fecha}`
            });

            setCreatedSession(response.data);
            setIsExistingSession(false);
            setIsModalOpen(true);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 400) {
                if (err.response?.data?.detail) {
                    setErrorMessage(err.response.data.detail);
                    setIsModalOpen(true);
                } else if (err.response?.data?.non_field_errors?.includes("The fields materia_semestre, fecha must make a unique set.")) {
                    console.warn('La sesión para esta materia y fecha ya existe. Obteniendo datos...');
                    try {
                        const existingSessionResponse = await api.get<SesionCreada[]>('/sesiones-clase/', {
                            params: { materia_semestre: materia.id, fecha: fecha }
                        });
                        if (existingSessionResponse.data.length > 0) {
                            // Si se encuentra la sesión, se setean los datos y se abre el modal.
                            setCreatedSession(existingSessionResponse.data[0]);
                            setIsExistingSession(true);
                            setErrorMessage(null); // Asegurarse de que no haya un mensaje de error
                            setIsModalOpen(true);
                        } else {
                            toast.error('Error: La sesión ya existe, pero no se pudo encontrar.');
                            setErrorMessage('Error: La sesión ya existe, pero no se pudo encontrar.');
                            setIsModalOpen(true);
                        }
                    } catch (fetchErr) {
                        console.error('Error al obtener la sesión existente:', fetchErr);
                        toast.error('Ocurrió un problema al obtener la sesión existente.');
                        setErrorMessage('Ocurrió un problema al obtener la sesión existente.');
                        setIsModalOpen(true);
                    }
                }
            } else if (axios.isAxiosError(err) && err.response?.status === 401) {
                console.error('No autenticado, redirigiendo a login:', err);
                navigate('/login');
            } else {
                console.error('Error al crear la sesión:', err);
                toast.error('Error al crear la sesión. Por favor, revisa los permisos.');
                setErrorMessage('Error al crear la sesión. Por favor, revisa los permisos.');
                setIsModalOpen(true);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCreatedSession(null);
        setErrorMessage(null);
        setIsExistingSession(false);
    };

    const handleVerEstudiantes = (estudiantes: Estudiante[]) => {
        setSelectedEstudiantes(estudiantes);
        setShowEstudiantesModal(true);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-blue-50"><p className="text-xl text-blue-700">Cargando tus materias...</p></div>;
    }

    if (error) {
        return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4"><p className="text-xl text-red-700 mb-4">{error}</p><button onClick={() => navigate('/home')} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Volver al Inicio</button></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="container mx-auto mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-extrabold text-blue-800">Mis Materias Asignadas</h1>
                    <div className="text-right">
                        <div className="text-sm text-gray-600">Hora actual</div>
                        <div className="text-lg font-semibold text-blue-600">
                            {currentTime.format('HH:mm:ss')}
                        </div>
                        <div className="text-xs text-gray-500">
                            {currentTime.format('dddd, DD [de] MMMM [de] YYYY')}
                        </div>
                    </div>
                </div>
                {materias.length === 0 ? (
                    <p className="text-gray-600 text-lg">No tienes materias asignadas.</p>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materia</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrera</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semestre</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gestión</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Día</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiantes Inscritos</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {materias.map((materia) => {
                                    const status = getMateriaStatus(materia);
                                    return (
                                        <tr key={materia.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{materia.materia_nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{materia.carrera_nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{materia.semestre_nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{materia.gestion}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{materia.dia_semana}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex flex-col">
                                                    <span>{materia.hora_inicio.substring(0, 5)} - {materia.hora_fin.substring(0, 5)}</span>
                                                    <div className="flex items-center mt-1">
                                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                                            status.isActive ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}></div>
                                                        <span className={`text-xs ${
                                                            status.isActive ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                            {status.isActive ? 'Activa' : 'Inactiva'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex flex-col items-start space-y-2">
                                                    <button
                                                        onClick={() => handleCrearSesion(materia)}
                                                        disabled={!status.isActive}
                                                        className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                                                            status.isActive
                                                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                        title={status.message}
                                                    >
                                                        {status.isActive ? 'Clase en curso' : 'Clase no activa'}
                                                    </button>
                                                    {!status.isActive && (
                                                        <div className="text-xs text-gray-500 max-w-xs">
                                                            <div>{status.message}</div>
                                                            {status.timeUntilActive && (
                                                                <div className="text-blue-600 font-medium mt-1">
                                                                    ⏰ {status.timeUntilActive}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                              <button
                                                onClick={() => handleVerEstudiantes(materia.estudiantes)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                              >
                                                Ver lista
                                              </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <SessionConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                sessionData={createdSession}
                isExisting={isExistingSession}
                errorMessage={errorMessage}
            />
            <ListaEstudiantesModal
                isOpen={showEstudiantesModal}
                onClose={() => setShowEstudiantesModal(false)}
                estudiantes={selectedEstudiantes}
/>
        </div>
    );
};

export default MisMateriasDocenteView;
