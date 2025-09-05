export interface LoginResponse {
  token: string;
  user_id: number;
  email: string;
  // Puedes añadir más campos si tu API de login devuelve más datos del usuario
}

// Puedes añadir otras interfaces relacionadas con auth aquí, por ejemplo:
// export interface User {
//   id: number;
//   email: string;
//   // ...
// }