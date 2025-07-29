"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { AtSign, Lock, Loader2 } from "lucide-react"

// Esquema de validación
const loginSchema = z.object({
  email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "La contraseña debe contener al menos una mayúscula, una minúscula y un número",
    }),
})

export type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  userType: "tourist" | "admin"
}

export default function LoginForm({ onSubmit, userType }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const handleSubmit = async (data: LoginFormValues) => {
    if (isLoading) return

    try {
      setIsLoading(true)

      // Verificar que onSubmit es una función
      if (typeof onSubmit !== "function") {
        console.error("onSubmit no es una función:", onSubmit)
        toast.error("Error en la configuración del formulario")
        return
      }

      await onSubmit(data)
    } catch (error) {
      console.error("Error al procesar el formulario:", error)
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder={userType === "tourist" ? "demo@example.com" : "admin@example.com"} className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input type="password" placeholder="Password1" className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-[#CD6C22] hover:bg-orange-700" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </form>
    </Form>
  )
}
