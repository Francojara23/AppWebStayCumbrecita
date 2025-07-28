"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { verifyEmail } from "@/app/actions/auth/verifyEmail"
import { useToast } from "@/hooks/use-toast"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      toast({
        title: "Token no válido",
        description: "El enlace de verificación no es válido o ha expirado.",
        variant: "destructive",
      })
      router.push("/auth/login/tourist")
      return
    }

    // Procesar la verificación del email
    const processVerification = async () => {
      try {
        const result = await verifyEmail({ token })

        if (result.success) {
          // Redirigir a la página de confirmación exitosa con el tipo de usuario
          const userType = result.userType || "TURISTA"
          router.push(`/auth/email-confirmed?verified=true&type=${userType}`)
        } else {
          toast({
            title: "Error de verificación",
            description: result.error || "No se pudo verificar tu email. El token puede haber expirado.",
            variant: "destructive",
          })
          // En caso de error, redirigir al login de turista por defecto
          router.push("/auth/login/tourist")
        }
      } catch (error) {
        console.error("Error al verificar email:", error)
        toast({
          title: "Error",
          description: "Ha ocurrido un error al verificar tu email.",
          variant: "destructive",
        })
        router.push("/auth/login/tourist")
      } finally {
        setIsVerifying(false)
      }
    }

    processVerification()
  }, [searchParams, router, toast])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#CD6C22]" />
        <h1 className="text-xl font-semibold mb-2">Verificando tu email...</h1>
        <p className="text-gray-600">Por favor espera mientras procesamos tu verificación.</p>
      </div>
    </div>
  )
} 