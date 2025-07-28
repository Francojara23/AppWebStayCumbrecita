"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"
import { cookies } from "next/headers"

// Esquema de validación - ACTUALIZADO para coincidir con backend
const adminRegisterSchema = z
  .object({
    nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
    apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres" }),
    telefono: z.string().min(10, { message: "Ingresa un número de teléfono válido (10 dígitos)" }).max(10, { message: "El teléfono no puede tener más de 10 dígitos" }),
    email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
    dni: z.string().min(8, { message: "Ingresa un DNI válido (8 dígitos)" }).max(8, { message: "El DNI no puede tener más de 8 dígitos" }),
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

type AdminRegisterData = z.infer<typeof adminRegisterSchema>

/**
 * Server action para el registro de administradores
 * CORREGIDO: Ahora usa la estructura correcta del backend
 */
export async function adminRegister(formData: AdminRegisterData) {
  try {
    // Validar los datos con Zod
    const validatedData = adminRegisterSchema.parse(formData)

    // Preparar los datos para el registro - FORMATO CORREGIDO
    const registerData = {
      nombre: validatedData.nombre,
      apellido: validatedData.apellido,
      email: validatedData.email,
      password: validatedData.password,
      telefono: parseInt(validatedData.telefono),  // Convertir a number
      dni: parseInt(validatedData.dni),            // Convertir a number
      direccion: validatedData.direccion,
      tipoRegistro: 'ADMIN' as const,             // Requerido por backend
      // No enviamos nombreHotel ni tipoHotelId para admin
    }

    // Enviar solicitud de registro al backend - RUTA CORREGIDA
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
        error: errorData.message || "Error al registrar el administrador",
      }
    }

    const userData = await registerResponse.json()

    // Respuesta exitosa - NO se devuelve token en registro según backend
    return {
      success: true,
      message: userData.message || "Registro exitoso. Por favor verifica tu email.",
      user: userData.user,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Error de validación de Zod
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    console.error("Error en el registro de administrador:", error)
    return {
      success: false,
      error: "Ha ocurrido un error durante el registro",
    }
  }
}
