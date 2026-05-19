'use client'

import { useState } from 'react'
import { Button, Input } from "@heroui/react"
import {URL} from '../../config/config'
import { useAuth } from '@/app/AuthContext'
export default function ExcelUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const { authenticatedFetch } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setUploadStatus('Por favor, selecciona un archivo Excel (.xlsx)')
      return
    }

    setIsUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await authenticatedFetch(URL + '/excel/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setUploadStatus('Archivo subido exitosamente')
        setFile(null)
      } else {
        setUploadStatus('Error al subir el archivo')
      }
    } catch (error) {
      setUploadStatus('Error de conexión')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        label="Seleccionar archivo Excel"
        description="Solo se permiten archivos .xlsx"
      />
      <Button
        type="submit"
        color="primary"
        isLoading={isUploading}
        disabled={!file || isUploading}
      >
        {isUploading ? 'Subiendo...' : 'Subir Excel'}
      </Button>
      {uploadStatus && (
        <p className={uploadStatus.includes('Error') ? 'text-danger' : 'text-success'}>
          {uploadStatus}
        </p>
      )}
    </form>
  )
}
