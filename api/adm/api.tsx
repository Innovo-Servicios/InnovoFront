"use client";
import { URL } from "../../config/config";
export const crearTrabajador = async (rut: string, nombre: string, cargo: string, correo: string, clave: string) => {
    const res = await fetch(`${URL}/trabajador/crearTrabajador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rut, nombre, cargo, correo, clave }),
    });
    return res;
  };
  export const uploadAsignacion = async (file: File, token: string) => {
    // Validar que el archivo sea un Excel
    const validExtensions = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    if (!validExtensions.includes(file.type)) {
        throw new Error("Archivo invalido");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${URL}/asignacion/uploadAsignacion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return res;
    
};

export const getVistaAsignaciones = async (
  token: string,
  fechaInicio: string,
  fechaFin: string
) => {
  const res = await fetch(`${URL}/asignacion/vistaAsignaciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fechaInicio, fechaFin }),
  });

  return res;
};
