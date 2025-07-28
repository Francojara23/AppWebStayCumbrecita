"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

export interface Review {
  id: string
  hospedaje: {
    id: string
    nombre: string
    imagenes?: Array<{ url: string }>
  }
  reserva: {
    id: string
  }
  calificacion: number | null
  comentario: string | null
  fechaOpinion: string
  visible: boolean
  respuestaPropietario: string | null
  fechaRespuesta: string | null
}

export interface CompletedReservation {
  id: string
  hospedaje: {
    id: string
    nombre: string
    imagenes?: Array<{ url: string }>
  }
  fechaCheckIn: string
  fechaCheckOut: string
  habitaciones: Array<{
    nombre: string
  }>
  cantidadPersonas: number
  estado: string
}

/**
 * Obtiene las opiniones del usuario autenticado
 */
export async function getUserReviews() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/opiniones/mis-opiniones`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al obtener las opiniones")
    }

    return await response.json()
  } catch (error) {
    console.error("Error en getUserReviews:", error)
    throw error
  }
}

/**
 * Obtiene las reservas completadas del usuario (para poder opinar)
 */
export async function getUserCompletedReservations(usuarioId: string) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/reservas/usuario/${usuarioId}/completadas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al obtener las reservas completadas")
    }

    return await response.json()
  } catch (error) {
    console.error("Error en getUserCompletedReservations:", error)
    throw error
  }
}

// Función createReview movida a createReview.ts para evitar duplicados

// Funciones updateReview y deleteReview movidas a sus respectivos archivos para evitar duplicados
