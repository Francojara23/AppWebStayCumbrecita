"use server"

import { cookies } from "next/headers"
import { AdminLoginSchema, type AdminLoginInput } from "@/lib/schemas/auth"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para el login de administradores
 * CORREGIDO: Ahora usa la ruta correcta del backend /auth/login
 *
 * @param formData - Datos del formulario de login
 * @returns Objeto con el resultado de la operación
 */
export async function adminLogin(formData: AdminLoginInput) {
  try {
    // Validar los datos de entrada
    const validatedFields = AdminLoginSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors,
      }
    }

    const { email, password } = validatedFields.data

    // Realizar la solicitud de login al backend - RUTA CORREGIDA
    try {
      const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          password
        }),
        cache: "no-store",
      })

      if (!loginResponse.ok) {
        // Intentar obtener el mensaje de error del backend
        try {
          const errorData = await loginResponse.json()
          return {
            success: false,
            error: errorData.message || errorData.error || "Error de autenticación",
          }
        } catch (e) {
          // Si no se puede parsear la respuesta, usar el código de estado HTTP
          return {
            success: false,
            error: `Error de autenticación (${loginResponse.status})`,
          }
        }
      }

      // Parsear la respuesta exitosa - ESTRUCTURA CORREGIDA
      const apiResponse = await loginResponse.json()

      // Verificar que el usuario tenga roles de administrador
      const userRoles = apiResponse.user.roles?.map((r: any) => r.nombre) || []
      const isAdmin = userRoles.includes('PROPIETARIO') || userRoles.includes('EMPLEADO') || userRoles.includes('SUPER-ADMIN')
      
      if (!isAdmin) {
        return {
          success: false,
          error: "No tienes permisos de administrador",
        }
      }

      // Guardar el token JWT en una cookie segura
      const cookieStore = await cookies()
      cookieStore.set({
        name: "auth_token",
        value: apiResponse.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: "/",
      })

      // Guardar información básica del usuario en una cookie no-httpOnly para acceso desde el cliente
      cookieStore.set({
        name: "user_info",
        value: JSON.stringify({
          id: apiResponse.user.id,
          firstName: apiResponse.user.nombre,     // Mapear nombre a firstName para compatibilidad
          lastName: apiResponse.user.apellido,    // Mapear apellido a lastName para compatibilidad
          email: apiResponse.user.email,
          role: 'ADMIN',                          // Siempre ADMIN para administradores
          fotoUrl: apiResponse.user.fotoUrl,      // Incluir imagen de perfil
          originalRole: userRoles[0] || 'ADMIN',  // Guardar el rol original del backend
        }),
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: "/",
      })

      return {
        success: true,
        user: apiResponse.user,
      }
    } catch (error) {
      console.error("Error al comunicarse con el backend:", error)
      return {
        success: false,
        error: "Error de conexión con el servidor. Por favor, inténtelo de nuevo más tarde.",
      }
    }
  } catch (error) {
    console.error("Error en adminLogin:", error)
    return {
      success: false,
      error: "Ha ocurrido un error durante el inicio de sesión. Por favor, inténtelo de nuevo.",
    }
  }
}
