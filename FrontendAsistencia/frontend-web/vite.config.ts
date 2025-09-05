import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()],
  server: {
    host: true, // Esto es equivalente a usar `npm run dev -- --host`
    allowedHosts: [
      // Añade aquí la URL de ngrok que te dio el error
      '7fa2324e3b32.ngrok-free.app',
      // Si la URL de ngrok cambia, tendrás que actualizarla aquí.
      // O, para mayor comodidad en desarrollo, puedes usar un comodín:
      // 'ngrok-free.app'
      // ['*'] // Para permitir cualquier host (menos seguro, pero útil para desarrollo)
    ],
  },
}
)
