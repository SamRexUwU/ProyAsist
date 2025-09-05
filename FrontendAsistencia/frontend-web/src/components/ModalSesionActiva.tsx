import React from 'react';

interface ModalSesionActivaProps {
  isOpen: boolean;
  onClose: () => void;
  materia: string;
}

const ModalSesionActiva: React.FC<ModalSesionActivaProps> = ({ isOpen, onClose, materia }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Sesión en curso</h2>
        <p className="text-gray-700 mb-6">
          Se está llevando a cabo la clase de <strong>{materia}</strong>.<br />
          Por favor, abre la aplicación móvil para registrar tu asistencia.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ModalSesionActiva;
