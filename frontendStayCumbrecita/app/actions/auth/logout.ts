"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Server action para cerrar sesión
 * Elimina las cookies de autenticación y redirige a la página de inicio
 *
 * @param redirectTo - URL a la que redirigir después de cerrar sesión
 */
export async function logout(redirectTo = "/home") {
  // Eliminar las cookies de autenticación
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
  cookieStore.delete("user_info")

  // Redirigir a la página especificada
  redirect(redirectTo)
}
