"use server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "./getCurrentUser"

/**
 * Server action para verificar si el usuario está autenticado
 * Redirige a la página de login si no hay sesión
 *
 * @param redirectTo - URL a la que redirigir si no hay sesión
 * @returns Objeto con la información del usuario actual
 */
export async function checkAuth(redirectTo = "/auth/login/tourist") {
  const response = await getCurrentUser()

  if (!response.success || !response.data) {
    if (response.shouldRedirectToHome) {
      redirect("/home")
    } else {
      redirect(redirectTo)
    }
  }

  return response
}

/**
 * Server action para verificar si el usuario es administrador
 * Redirige a la página de login de administrador si no hay sesión o el usuario no es administrador
 *
 * @param redirectTo - URL a la que redirigir si no hay sesión o el usuario no es administrador
 * @returns Objeto con la información del usuario administrador
 */
export async function checkAdminAuth(redirectTo = "/auth/login/admin") {
  const response = await getCurrentUser()

  if (!response.success || !response.data) {
    if (response.shouldRedirectToHome) {
      redirect("/home")
    } else {
      redirect(redirectTo)
    }
  }

  // Verificar si el usuario tiene rol de administrador
  const userRoles = response.data.roles || []
  const hasAdminRole = userRoles.some(role => 
    ["ADMIN", "SUPER-ADMIN", "PROPIETARIO"].includes(role.nombre)
  )

  if (!hasAdminRole) {
    redirect(redirectTo)
  }

  return response
}
