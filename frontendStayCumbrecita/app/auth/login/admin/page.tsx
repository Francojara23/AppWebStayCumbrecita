"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import LoginForm, { type LoginFormValues } from "@/components/auth/login-form"
import { adminLogin } from "@/app/actions/auth/adminLogin"

export default function AdminLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (values: LoginFormValues) => {
    if (isLoading) return

    try {
      setIsLoading(true)

      // Verificar que tenemos los valores necesarios
      if (!values.email || !values.password) {
        toast.error("Por favor, complete todos los campos")
        return
      }

      const result = await adminLogin({
        email: values.email,
        password: values.password,
      })

      if (result.success) {
        toast.success("Inicio de sesión exitoso")
        router.push("/adminABM")
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

      <LoginForm onSubmit={handleLogin} userType="admin" />

      <div className="text-center space-y-2 mt-6">
        <p className="text-sm">
          ¿No tienes una cuenta?{" "}
          <Link href="/auth/register/admin" className="text-orange-700 hover:underline font-medium">
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
