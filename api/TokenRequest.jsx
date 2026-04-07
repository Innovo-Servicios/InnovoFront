import { URL } from "../config/config";

export const ValidarToken = async (token) => {
  try {
    const response = await fetch(`${URL}/token/validartoken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({ token}),

    });
  
    if (!response.ok) {
      throw new Error('Error al validar Token');
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    return null;
  }
};
