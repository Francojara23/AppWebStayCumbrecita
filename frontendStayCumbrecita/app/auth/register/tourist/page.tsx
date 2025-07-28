"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import TouristRegisterForm from "@/components/auth/tourist-register-form"
import { touristRegister } from "@/app/actions/auth/touristRegister"

export default function TouristRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleTouristRegister = async (data: {
    firstName: string
    lastName: string
    phone: string
    email: string
    address: string
    password: string
    confirmPassword: string
  }) => {
    try {
      setIsLoading(true)

      // Transformar datos del formulario al formato esperado por la server action
      const transformedData = {
        nombre: data.firstName,
        apellido: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        telefono: data.phone,
        direccion: data.address,
        dni: "", // Los turistas pueden no tener DNI
      }

      const result = await touristRegister(transformedData)

      if (result.success) {
        toast.success("Registro exitoso. Por favor, verifica tu email para activar tu cuenta.")
        router.push("/auth/login/tourist")
      } else {
        toast.error(result.error || "Error al registrar usuario")
      }
    } catch (error) {
      console.error("Error en el registro:", error)
      toast.error("Ha ocurrido un error durante el registro")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Crear cuenta</h1>

      <TouristRegisterForm onSubmit={handleTouristRegister} />

      <div className="text-center mt-6">
        <p className="text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/login/tourist" className="text-orange-700 hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </>
  )
}
