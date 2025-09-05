import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface CredencialQRData {
  id: number;
  estudiante: number;
  uuid: string;
  activo: boolean;
  estudiante_info: any; // Ajusta el tipo de dato si tienes el modelo de EstudianteSerializer
  qr_code_base64: string;
}

const GeneradorQR = ({ estudianteId }: { estudianteId: number }) => {
  const [qrInfo, setQrInfo] = useState<CredencialQRData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    // Generar el QR automáticamente cuando el componente se monta
    // para el estudiante seleccionado.
    const handleGenerarQR = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.post('/credenciales-qr/generar-para-estudiante/', {
          estudiante_id: estudianteId,
        });
        setQrInfo(response.data);
      } catch (err) {
        console.error('Error al generar QR:', err);
        setError('Error al generar el QR. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    handleGenerarQR();
  }, [estudianteId]);

  return (
    <div>
      {loading && <p className="text-blue-500">Generando QR...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {qrInfo && (
  <div className="flex flex-col items-center">
    <h4 className="text-lg font-semibold mb-2">Credencial QR de Asistencia</h4>

    {/* Decodificamos el campo correcto */}
    <pre className="text-xs bg-gray-100 p-2 rounded mb-2">
      {JSON.stringify(JSON.parse(atob(qrInfo.qr_payload)), null, 2)}
    </pre>

    <img
      src={qrInfo.qr_code_base64}
      alt={`QR para ${qrInfo.estudiante_info.usuario.nombre}`}
      className="w-64 h-64 border rounded-lg p-2 bg-gray-50"
    />
  </div>
)}
    </div>
  );
};

export default GeneradorQR;