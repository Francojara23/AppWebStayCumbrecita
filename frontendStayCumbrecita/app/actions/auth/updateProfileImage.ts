"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

export interface UpdateProfileImageResponse {
  success: boolean
  imageUrl?: string
  error?: string
}

/**
 * Actualiza la imagen de perfil del usuario
 */
export async function updateProfileImage(formData: FormData): Promise<UpdateProfileImageResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    // Crear FormData para enviar al backend
    const backendFormData = new FormData()
    const imageFile = formData.get("image") as File
    
    if (!imageFile) {
      return {
        success: false,
        error: "No se seleccionó ninguna imagen"
      }
    }

    // Validar que sea una imagen
    if (!imageFile.type.startsWith("image/")) {
      return {
        success: false,
        error: "El archivo debe ser una imagen"
      }
    }

    // Validar tamaño (máximo 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: "La imagen no puede ser mayor a 5MB"
      }
    }

    backendFormData.append("file", imageFile)

    const response = await fetch(`${getApiUrl()}/auth/meImagenUpdate`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: backendFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al actualizar la imagen"
      }
    }

    const data = await response.json()

    // Actualizar la cookie user_info con la nueva imagen
    try {
      const userInfo = cookieStore.get("user_info")?.value
      if (userInfo) {
        const userData = JSON.parse(decodeURIComponent(userInfo))
        userData.fotoUrl = data.fotoUrl || data.imageUrl
        
        cookieStore.set({
          name: "user_info",
          value: JSON.stringify(userData),
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 semana
          path: "/",
        })
      }
    } catch (e) {
      console.warn("No se pudo actualizar la cookie user_info:", e)
    }

    return {
      success: true,
      imageUrl: data.fotoUrl || data.imageUrl
    }
  } catch (error) {
    console.error("Error en updateProfileImage:", error)
    return {
      success: false,
      error: "Error de conexión con el servidor"
    }
  }
} 