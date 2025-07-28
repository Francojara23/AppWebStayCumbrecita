"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

interface UploadDocumentParams {
  hospedajeId: string
  file: File
  nombre: string
  descripcion?: string
  tipoDocumento?: string
}

export async function uploadDocument({
  hospedajeId,
  file,
  nombre,
  descripcion,
  tipoDocumento,
}: UploadDocumentParams) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "Token de autenticación no encontrado. Por favor inicia sesión.",
      }
    }

    // Crear FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nombre', nombre.trim())
    
    if (descripcion?.trim()) {
      formData.append('descripcion', descripcion.trim())
    }
    
    if (tipoDocumento) {
      formData.append('tipoDocumento', tipoDocumento)
    }

    // Realizar la petición al backend
    const response = await fetch(`${getApiUrl()}/hospedajes/${hospedajeId}/documentos`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || 'Error al subir el documento',
      }
    }

    const result = await response.json()

    return {
      success: true,
      message: 'Documento subido exitosamente',
      data: result,
    }

  } catch (error) {
    console.error('Error en uploadDocument:', error)
    return {
      success: false,
      error: 'Ha ocurrido un error inesperado al subir el documento',
    }
  }
} 