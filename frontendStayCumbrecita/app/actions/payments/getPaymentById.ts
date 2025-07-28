"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { PaymentSchema, Payment } from "./getPayments"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Obtiene el detalle de un pago específico
 * @param id ID del pago
 * @returns Detalle del pago o un error
 */
export async function getPaymentById(id: string): Promise<{
  data: Payment | null
  error: string | null
}> {
  try {
    if (!id) {
      return {
        data: null,
        error: "El ID del pago es requerido",
      }
    }

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        data: null,
        error: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/payments/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        data: null,
        error: errorData.message || "Error al obtener el pago",
      }
    }

    const paymentData = await response.json()
    const validatedData = PaymentSchema.parse(paymentData)

    return {
      data: validatedData,
      error: null,
    }
  } catch (error) {
    console.error("Error al obtener el pago:", error)

    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al obtener el pago",
    }
  }
}
