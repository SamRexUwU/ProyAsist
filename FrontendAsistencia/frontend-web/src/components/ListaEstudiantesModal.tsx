// src/components/ListaEstudiantesModal.tsx
import React from 'react';
import Modal from './Modal'; // tu Modal base

interface Estudiante {
  id: number;
  codigo_institucional: string;
  usuario__nombre: string;
  usuario__apellido: string;
}

interface ListaEstudiantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  estudiantes: Estudiante[];
}

const ListaEstudiantesModal: React.FC<ListaEstudiantesModalProps> = ({
  isOpen,
  onClose,
  estudiantes,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lista de Estudiantes">
      {estudiantes.length === 0 ? (
        <p className="text-gray-500">No hay estudiantes para mostrar.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {estudiantes.map((e) => (
            <li
              key={e.id}
              className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md"
            >
              <span className="font-medium text-gray-800">
                {e.usuario__nombre} {e.usuario__apellido}
              </span>
              <span className="text-sm text-gray-600">{e.codigo_institucional}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default ListaEstudiantesModal;