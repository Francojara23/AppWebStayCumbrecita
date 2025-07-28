"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import LoginForm, { type LoginFormValues } from "@/components/auth/login-form"
import { touristLogin } from "@/app/actions/auth/touristLogin"

export default function TouristLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  
  // Obtener callbackUrl de los parámetros de la URL
  const callbackUrl = searchParams.get('callbackUrl')

  const handleLogin = async (values: LoginFormValues) => {
    if (isLoading) return

    try {
      setIsLoading(true)

      // Verificar que tenemos los valores necesarios
      if (!values.email || !values.password) {
        toast.error("Por favor, complete todos los campos")
        return
      }

      const result = await touristLogin({
        email: values.email,
        password: values.password,
      })

      if (result.success) {
        toast.success("Inicio de sesión exitoso")
        
        // Redirigir al callbackUrl si existe, sino a home
        const redirectUrl = callbackUrl ? decodeURIComponent(callbackUrl) : "/home"
        console.log('🔍 Login exitoso, redirigiendo a:', redirectUrl)
        router.push(redirectUrl)
        router.refresh() // Actualiza los componentes del servidor para reflejar el nuevo estado de autenticación
      } else {
        if (typeof result.error === "string") {
          toast.error(result.error)
        } else if (result.error && typeof result.error === "object") {
          // Si es un objeto de errores de validación
          const errorValues = Object.values(result.error)
          const firstError = Array.isArray(errorValues[0]) ? errorValues[0][0] : errorValues[0]
          if (firstError && typeof firstError === "string") {
            toast.error(firstError)
          } else {
            toast.error("Credenciales incorrectas")
          }
        } else {
          toast.error("Credenciales incorrectas")
        }
      }
    } catch (error) {
      console.error("Error en inicio de sesión:", error)
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Iniciar sesión</h1>

      <LoginForm onSubmit={handleLogin} userType="tourist" />

      <div className="text-center space-y-2 mt-6">
        <p className="text-sm">
          ¿No tienes una cuenta?{" "}
          <Link href="/auth/register/tourist" className="text-orange-700 hover:underline font-medium">
            Regístrate
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/auth/forgot-password" className="text-orange-700 hover:underline font-medium">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </>
  )
}
