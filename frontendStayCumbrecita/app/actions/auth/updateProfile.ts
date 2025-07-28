"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para actualizar perfil
const updateProfileSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }).optional(),
  apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres" }).optional(),
  email: z.string().email({ message: "Email inválido" }).optional(),
  telefono: z.string().min(10, { message: "Teléfono debe tener 10 dígitos" }).max(10).optional(),
  direccion: z.string().min(5, { message: "Dirección debe tener al menos 5 caracteres" }).optional(),
})

type UpdateProfileData = z.infer<typeof updateProfileSchema>

/**
 * Server action para actualizar el perfil del usuario autenticado
 */
export async function updateProfile(formData: UpdateProfileData) {
  try {
    // Validar los datos
    const validatedData = updateProfileSchema.parse(formData)

    // Filtrar campos vacíos y convertir telefono a number si existe
    const updateData: any = {}
    
    if (validatedData.nombre) updateData.nombre = validatedData.nombre
    if (validatedData.apellido) updateData.apellido = validatedData.apellido
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.telefono) updateData.telefono = parseInt(validatedData.telefono)
    if (validatedData.direccion) updateData.direccion = validatedData.direccion

    // Obtener el token de autenticación
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth_token")?.value

    if (!authToken) {
      return {
        success: false,
        error: "No estás autenticado",
      }
    }

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateData),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al actualizar el perfil",
      }
    }

    const result = await response.json()

    // Actualizar la cookie user_info si el email o nombre cambiaron
    if (updateData.nombre || updateData.apellido || updateData.email) {
      const userInfo = cookieStore.get("user_info")?.value
      if (userInfo) {
        try {
          const currentUserInfo = JSON.parse(userInfo)
          const updatedUserInfo = {
            ...currentUserInfo,
            firstName: updateData.nombre || currentUserInfo.firstName,
            lastName: updateData.apellido || currentUserInfo.lastName,
            email: updateData.email || currentUserInfo.email,
          }

          cookieStore.set({
            name: "user_info",
            value: JSON.stringify(updatedUserInfo),
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 semana
            path: "/",
          })
        } catch (e) {
          console.warn("No se pudo actualizar la cookie user_info:", e)
        }
      }
    }

    return {
      success: true,
      message: result.message || "Perfil actualizado exitosamente",
      user: result.user,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    console.error("Error en updateProfile:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al actualizar el perfil",
    }
  }
} 