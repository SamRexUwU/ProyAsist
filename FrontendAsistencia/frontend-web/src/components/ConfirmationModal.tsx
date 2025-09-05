import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
}) => {
    if (!isOpen) return null;

    return (
        <div
            // Usamos el mismo estilo de fondo que tu Modal.tsx
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose} // Cerrar al hacer clic fuera del modal
        >
            <div
                // Usamos el mismo estilo de contenedor para un diseño consistente
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md md:max-w-lg lg:max-w-xl transform transition-all duration-300 scale-100 opacity-100"
                onClick={(e) => e.stopPropagation()} // Evitar que el clic dentro del modal lo cierre
            >
                {/* Encabezado del modal similar al de tu Modal.tsx */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        aria-label="Cerrar"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                
                {/* Contenido del modal */}
                <div>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mr-4">
                            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="mt-2 text-left">
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pie de página con botones de acción */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onClose}
                    >
                        No, cancelar
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 bg-red-600 rounded-md text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={onConfirm}
                    >
                        Sí, eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;