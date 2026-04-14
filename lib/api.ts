export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.innovoservicios.cl';

/**
 * Cliente de API base para manejar peticiones hacia el backend.
 * Configurado con la URL base y soporte para credenciales e interceptores básicos.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    // Aquí puedes incluir Authorization directamente si tienes el token a mano
    // 'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
    // Permite que las cookies/credenciales se envíen al backend
    credentials: 'omit',
  };

  // Se añaden explícitamente las credenciales si no se definieron como omit
  // en los casos que necesites cookies activas para sesiones (cross-site requiere soporte explícito y HTTPS)
  config.credentials = 'include';

  try {
    const response = await fetch(url, config);

    // Opcional: manejar respuestas no exitosas globalmente
    // if (!response.ok) {
    //   throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
    // }

    return response;
  } catch (error) {
    console.error(`Error realizando fetch a ${endpoint}:`, error);
    throw error;
  }
}
