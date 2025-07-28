"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { AtSign, Loader2 } from "lucide-react"

// Esquema de validación
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>
}

export default function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
    if (isLoading) return

    try {
      setIsLoading(true)
      // Asegurarnos de que onSubmit es una función antes de llamarla
      if (typeof onSubmit === "function") {
        await onSubmit(data.email)
      } else {
        console.error("onSubmit no es una función")
      }
    } catch (error) {
      console.error("Error en el formulario:", error)
      // El error se maneja en el componente padre
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
                  <Input placeholder="correo@ejemplo.com" className="pl-10" {...field} />
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
              Enviando...
            </>
          ) : (
            "Enviar instrucciones"
          )}
        </Button>
      </form>
    </Form>
  )
}
