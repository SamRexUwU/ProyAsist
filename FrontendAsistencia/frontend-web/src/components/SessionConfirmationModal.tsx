

 import React from 'react'; 

 interface SesionCreada { 
    id: number; 
    materia_semestre: number; 
    fecha: string; 
    hora_inicio: string; 
    hora_fin: string; 
    tema: string; 
 } 

 interface SessionConfirmationModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    sessionData: SesionCreada | null; 
    isExisting: boolean; 
    errorMessage: string | null; 
 } 

 const SessionConfirmationModal: React.FC<SessionConfirmationModalProps> = ({  
    isOpen,  
    onClose,  
    sessionData,  
    isExisting, 
    errorMessage 
 }) => { 
    if (!isOpen) { 
        return null; 
    } 

    if (errorMessage) { 
        return ( 
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"> 
                <div className="relative bg-white p-8 rounded-lg shadow-xl max-w-sm w-full"> 
                    <h3 className="text-2xl font-bold mb-4 text-red-600">❌ Error al Crear Sesión</h3> 
                    <p className="text-gray-700 text-base">{errorMessage}</p> 
                    <div className="mt-6 text-right"> 
                        <button  
                            onClick={onClose}  
                            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition" 
                        > 
                            Cerrar 
                        </button> 
                    </div> 
                </div> 
            </div> 
        ); 
    } 

    return ( 
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"> 
            <div className="relative bg-white p-8 rounded-lg shadow-xl max-w-sm w-full"> 
                <h3 className={`text-2xl font-bold mb-4 ${isExisting ? 'text-yellow-700' : 'text-green-700'}`}> 
                    {isExisting ? 'Sesión Ya Existente ⚠️' : 'Sesión Iniciada Exitosamente ✅'} 
                </h3> 
                <div className="space-y-3 text-gray-700"> 
                    <p><strong>ID de Sesión:</strong> {sessionData?.id}</p> 
                    <p><strong>Fecha:</strong> {sessionData?.fecha}</p> 
                    <p><strong>Hora de Inicio:</strong> {sessionData?.hora_inicio.substring(0, 5)}</p> 
                    <p><strong>Hora de Finalización:</strong> {sessionData?.hora_fin.substring(0, 5)}</p> 
                    <p><strong>Tema:</strong> {sessionData?.tema}</p> 
                </div> 
                <div className="mt-6 text-right"> 
                    <button  
                        onClick={onClose}  
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition" 
                    > 
                        Cerrar 
                    </button> 
                </div> 
            </div> 
        </div> 
    ); 
 }; 

 export default SessionConfirmationModal;