// src/components/QrScanner.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const QrScanner: React.FC = () => {
  const { authState } = useAuth();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Solo inicializamos el escáner si el usuario está autenticado
    if (!authState.isAuthenticated) return;

    // Configuración para el escáner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      disableFlip: false,
    };

    const scanner = new Html5QrcodeScanner('qr-reader', config, false);
    scannerRef.current = scanner;

    const onScanSuccess = async (decodedText: string) => {
      // Evita reaccionar a múltiples escaneos del mismo QR
      if (scanResult === decodedText) return;
      setScanResult(decodedText);
      
      setMessage('QR escaneado, registrando asistencia...');
      setError(null);
      setLoading(true);
      
      try {
        // Asumimos que el QR decodifica la ID de la sesión de clase
        const sessionId = parseInt(decodedText);
        if (isNaN(sessionId)) {
            setError('Formato de QR no válido. Debe ser un número.');
            setLoading(false);
            return;
        }

        // Llamada a la API para registrar la asistencia
        // La URL ahora apunta a la nueva acción personalizada del ViewSet
        const response = await api.post('/registros_asistencia/registrar-qr/', { sesion_id: sessionId });
        const { materia_nombre, estado } = response.data;
        setMessage(`Asistencia registrada con éxito en la materia "${materia_nombre}". Estado: ${estado}`);
      } catch (err: any) {
        console.error('Error al registrar asistencia:', err);
        const errorMessage = err.response?.data?.detail || 'Error al registrar la asistencia. La sesión no es válida, ya se ha registrado o no es tu turno.';
        setError(errorMessage);
        setMessage(null);
      } finally {
        setLoading(false);
        // Detener el escáner después de un escaneo exitoso o fallido
        scanner.clear().catch(stopErr => console.error("Error al detener el escáner:", stopErr));
      }
    };

    const onScanError = (errorMessage: any) => {
      // Ignora errores comunes y solo muestra el mensaje si es grave
      // console.error('Error de escaneo:', errorMessage);
    };

    // Renderiza el escáner
    scanner.render(onScanSuccess, onScanError);

    // Función de limpieza para detener el escáner cuando el componente se desmonte
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.log('Escáner ya detenido', e));
      }
    };
  }, [authState.isAuthenticated, scanResult]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-100 min-h-screen">
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">Escáner de Asistencia QR</h1>
        
        {/* Contenedor del escáner */}
        <div id="qr-reader" className="w-full"></div>

        {/* Mensajes de estado */}
        {loading && (
          <p className="text-center text-blue-500 mt-4">Procesando...</p>
        )}
        {message && (
          <p className="text-center text-green-600 font-medium mt-4">{message}</p>
        )}
        {error && (
          <p className="text-center text-red-600 font-medium mt-4">{error}</p>
        )}

      </div>
    </div>
  );
};

export default QrScanner;
