"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación - ACTUALIZADO para registro de turista (con dirección)
const touristRegisterSchema = z
  .object({
    nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
    apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres" }),
    telefono: z.string().min(10, { message: "Ingresa un número de teléfono válido (10 dígitos)" }).max(10),
    email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
    dni: z.string().min(8, { message: "Ingresa un DNI válido (8 dígitos)" }).max(8),
    direccion: z.string().min(5, { message: "Ingresa una dirección válida" }),
    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
      .regex(/^[a-zA-Z0-9]+$/, {
        message: "La contraseña debe ser alfanumérica",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type TouristRegisterData = z.infer<typeof touristRegisterSchema>

/**
 * Server action para el registro de turistas
 * Los turistas ahora incluyen dirección como campo requerido
 */
export async function touristRegister(formData: TouristRegisterData) {
  try {
    // Validar los datos con Zod
    const validatedData = touristRegisterSchema.parse(formData)

    // Preparar los datos para el registro - CON DIRECCIÓN para turistas
    const registerData = {
      nombre: validatedData.nombre,
      apellido: validatedData.apellido,
      email: validatedData.email,
      password: validatedData.password,
      telefono: parseInt(validatedData.telefono),  // Convertir a number
      dni: parseInt(validatedData.dni),            // Convertir a number
      direccion: validatedData.direccion,          // Incluir dirección
      tipoRegistro: 'TURISTA' as const,           // Requerido por backend
    }

    // Enviar solicitud de registro al backend
    const registerResponse = await fetch(`${getApiUrl()}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
      cache: "no-store",
    })

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json()
      return {
        success: false,
        error: errorData.message || "Error al registrar el turista",
      }
    }

    const userData = await registerResponse.json()

    return {
      success: true,
      message: userData.message || "Registro exitoso. Por favor verifica tu email.",
      user: userData.user,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    console.error("Error en el registro de turista:", error)
    return {
      success: false,
      error: "Ha ocurrido un error durante el registro",
    }
  }
}
