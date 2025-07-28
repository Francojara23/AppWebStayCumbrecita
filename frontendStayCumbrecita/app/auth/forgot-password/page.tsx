"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import ForgotPasswordForm from "@/components/auth/forgot-password-form"
import { forgotPassword } from "@/app/actions/auth/forgotPassword"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = searchParams.get("type") || "tourist"

  const handleSubmit = async (email: string) => {
    try {
      setIsLoading(true)

      // Llamar al server action de recuperación de contraseña
      const result = await forgotPassword({
        email,
      })

      if (result.success) {
        setSubmittedEmail(email)
        setIsSubmitted(true)
        toast.success(result.message || "Instrucciones enviadas a tu correo electrónico")
      } else {
        const errorMessage = typeof result.error === "string" 
          ? result.error 
          : "Error al procesar la solicitud"

        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error en recuperación de contraseña:", error)
      toast.error("Ha ocurrido un error. Por favor, inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push(`/auth/login/${userType}`)
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold mb-4">Revisa tu correo</h1>
        <p className="mb-6">
          Hemos enviado instrucciones para restablecer tu contraseña a <strong>{submittedEmail}</strong>
        </p>
        <Button onClick={handleBackToLogin} className="bg-orange-600 hover:bg-orange-700">
          Volver a inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Recuperar contraseña</h1>
      <p className="text-center text-gray-600 mb-6">
        Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
      </p>

      <ForgotPasswordForm onSubmit={handleSubmit} />

      <div className="text-center mt-6">
        <p className="text-sm">
          <Link href={`/auth/login/${userType}`} className="text-orange-700 hover:underline font-medium">
            ← Volver a inicio de sesión
          </Link>
        </p>
      </div>
    </>
  )
}
