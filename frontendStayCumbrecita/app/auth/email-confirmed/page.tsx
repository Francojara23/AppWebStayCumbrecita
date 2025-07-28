"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EmailConfirmedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [countdown, setCountdown] = useState(5)

  // Obtener el tipo de usuario (turista o administrador) de los parámetros de URL
  // Si es "tourist" va a /auth/login/tourist, cualquier otro valor va a /auth/login/admin
  const userType = searchParams.get("type") || "TURISTA"
  const verified = searchParams.get("verified")

  // Mostrar toast de confirmación si viene de verificación
  useEffect(() => {
    if (verified === "true") {
      toast({
        title: "¡Email verificado exitosamente!",
        description: "Tu cuenta ha sido activada. Ahora puedes iniciar sesión.",
      })
    }
  }, [verified, toast])

  // Efecto para el contador de redirección automática
  useEffect(() => {
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
      } else {
        // Redirigir al login correspondiente según el tipo de usuario
        const loginPath = userType === "admin" ? "/auth/login/admin" : "/auth/login/tourist"
        router.push(loginPath)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, router, userType])

  // Función para manejar el clic en el botón de inicio de sesión
  const handleLoginClick = () => {
    const loginPath = userType === "admin" ? "/auth/login/admin" : "/auth/login/tourist"

    toast({
      title: "¡Redirigiendo al inicio de sesión!",
      description: "Por favor, inicia sesión con tus credenciales verificadas.",
    })

    router.push(loginPath)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-[#CD6C22] mb-4">¡Email confirmado con éxito!</h1>

        <p className="text-gray-600 mb-6">
          Tu dirección de correo electrónico ha sido verificada correctamente. Ahora puedes iniciar sesión y disfrutar
          de todas las funcionalidades de nuestra plataforma.
        </p>

        <Button onClick={handleLoginClick} className="w-full bg-[#CD6C22] hover:bg-[#B35A1B] mb-4">
          Iniciar sesión <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-sm text-gray-500">
          Serás redirigido automáticamente en <span className="font-medium">{countdown}</span> segundos...
        </p>
      </Card>
    </div>
  )
}
