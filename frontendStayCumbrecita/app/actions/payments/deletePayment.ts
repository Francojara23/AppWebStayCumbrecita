"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Elimina un pago existente
 * @param id ID del pago a eliminar
 * @returns Un mensaje de éxito o un error
 */
export async function deletePayment(id: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    if (!id) {
      return {
        success: false,
        message: "El ID del pago es requerido",
      }
    }

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        success: false,
        message: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/payments/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        message: errorData.message || "Error al eliminar el pago",
      }
    }

    return {
      success: true,
      message: "Pago eliminado correctamente",
    }
  } catch (error) {
    console.error("Error al eliminar el pago:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido al eliminar el pago",
    }
  }
}
