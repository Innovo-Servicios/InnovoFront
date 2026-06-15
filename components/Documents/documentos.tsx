"use client";

import { useState, useEffect } from "react";
import { Button, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { URL } from "../../config/config";
import { useAuth } from "@/app/AuthContext";
export default function DocumentForm() {
  const [file, setFile] = useState<File | null>(null);
  const [objetivo, setObjetivo] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string>("nose1234");
  const { token, authenticatedFetch } = useAuth();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (token) {
      if (!file) {
        setUploadStatus("Por favor, selecciona un archivo válido.");
        return;
      }

      if (!objetivo) {
        setUploadStatus("Por favor, ingresa un Rut válido.");
        return;
      }

      setIsUploading(true);
      setUploadStatus(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("objetivo", objetivo);
      formData.append("token", token);
      formData.append("tipo", tipo);
      try {
        const response = await authenticatedFetch(`${URL}/documento/crearDocumento`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          setUploadStatus("Documento creado exitosamente.");
          setFile(null);
          setObjetivo("");
        } else {
          const error = await response.text();
          setUploadStatus(`Error al crear el documento: ${error}`);
        }
      } catch (error) {
        console.error("Error de conexión:", error);
        setUploadStatus("Error de conexión.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <Input
          type="file"
          onChange={handleFileChange}
          label="Seleccionar archivo"
          description="Solo se permiten Excel, imágenes, PDFs y documentos de texto."
          accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
        />

        <Input
          type="text"
          value={objetivo}
          onValueChange={setObjetivo}
          label="Rut del trabajador"
          placeholder="Ej: 12345678-9"
        />

        <Button
          type="submit"
          color={isUploading ? "default" : "primary"}
          isLoading={isUploading}
          isDisabled={!file || !objetivo || isUploading}
        >
          {isUploading ? "Subiendo..." : "Crear Documento"}
        </Button>

        {uploadStatus && (
          <Textarea
            isReadOnly
            variant="bordered"
            color={uploadStatus.includes("Error") ? "danger" : "success"}
            value={uploadStatus}
          />
        )}
      </div>
    </form>
  );
}
