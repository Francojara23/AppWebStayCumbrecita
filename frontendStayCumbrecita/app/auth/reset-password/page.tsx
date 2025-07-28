"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Lock } from "lucide-react"
import { resetPassword } from "@/app/actions/auth/resetPassword"

// Esquema de validación
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get("token")
  const email = searchParams.get("email")
  const userType = searchParams.get("type") || "tourist"

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // Verificar que tenemos los parámetros necesarios
  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold mb-4">Enlace inválido</h1>
        <p className="mb-6">El enlace para restablecer tu contraseña es inválido o ha expirado.</p>
        <Button
          onClick={() => router.push(`/auth/forgot-password?type=${userType}`)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Solicitar nuevo enlace
        </Button>
      </div>
    )
  }

  const handleSubmit = async (data: ResetPasswordFormValues) => {
    if (isLoading) return

    try {
      setIsLoading(true)

      if (!token || !email || !userType) {
        toast.error("Faltan parámetros necesarios para restablecer la contraseña")
        return
      }

      // Llamar al server action para restablecer la contraseña
      const result = await resetPassword({
        token,
        passwordNueva: data.password,
      })

      if (result.success) {
        setIsSubmitted(true)
        toast.success(result.message || "Contraseña actualizada correctamente")
      } else {
        const errorMessage = typeof result.error === "string" 
          ? result.error 
          : "Error al restablecer la contraseña"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error al restablecer la contraseña:", error)
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
        <h1 className="text-2xl font-bold mb-4">¡Contraseña actualizada!</h1>
        <p className="mb-6">
          Tu contraseña ha sido actualizada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Button onClick={handleBackToLogin} className="bg-orange-600 hover:bg-orange-700">
          Ir a inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Restablecer contraseña</h1>
      <p className="text-center text-gray-600 mb-6">
        Ingresa tu nueva contraseña para la cuenta asociada a <strong>{email}</strong>
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input type="password" placeholder="********" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input type="password" placeholder="********" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </Button>
        </form>
      </Form>
    </>
  )
}
