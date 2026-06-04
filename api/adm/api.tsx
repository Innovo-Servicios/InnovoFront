"use client";
import { URL } from "../../config/config";
type Fetcher = typeof fetch;

export const crearTrabajador = async (
  rut: string,
  nombre: string,
  cargo: string,
  correo: string,
  clave: string,
  fetcher: Fetcher = fetch
) => {
    const res = await fetcher(`${URL}/trabajador/crearTrabajador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rut, nombre, cargo, correo, clave }),
    });
    return res;
  };
  export const uploadAsignacion = async (file: File, token: string, fetcher: Fetcher = fetch) => {
    // Validar que el archivo sea un Excel
    const validExtensions = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    if (!validExtensions.includes(file.type)) {
        throw new Error("Archivo invalido");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetcher(`${URL}/asignacion/uploadAsignacion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return res;
    
};

export const getATEsAdm = async (
  token: string,
  fechaInicio?: string,
  fechaFin?: string,
  fetcher: Fetcher = fetch
) => {
  const body: Record<string, unknown> = { token };
  if (fechaInicio && fechaFin) body.fecha = { inicio: fechaInicio, fin: fechaFin };
  const res = await fetcher(`${URL}/middleware/obtenerATE_Adm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res;
};

export const getVistaAsignaciones = async (
  token: string,
  fechaInicio: string,
  fechaFin: string,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/vistaAsignaciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fechaInicio, fechaFin }),
  });

  return res;
};

export const getAssignmentCreatorCatalog = async (
  token: string,
  empresa?: string,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/creador/catalogo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ empresa }),
  });

  return res;
};

export const getAssignmentCreatorTemplate = async (
  token: string,
  empresa: string,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/creador/plantilla`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ empresa }),
  });

  return res;
};

export const saveAssignmentCreatorTemplate = async (
  token: string,
  empresa: string,
  plantilla: unknown,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/creador/plantilla`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ empresa, plantilla }),
  });

  return res;
};

export const previewAssignmentCreator = async (
  token: string,
  payload: unknown,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/creador/previsualizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return res;
};

export const confirmAssignmentCreator = async (
  token: string,
  payload: unknown,
  fetcher: Fetcher = fetch
) => {
  const res = await fetcher(`${URL}/asignacion/creador/confirmar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return res;
};
