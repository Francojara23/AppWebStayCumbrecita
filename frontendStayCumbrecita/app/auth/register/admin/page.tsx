"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AdminRegisterForm from "@/components/auth/admin-register-form"
import { adminRegister } from "@/app/actions/auth/adminRegister"

export default function AdminRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAdminRegister = async (data: {
    firstName: string
    lastName: string
    phone: string
    email: string
    dni: string
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
        dni: data.dni,
        direccion: data.address,
      }

      const result = await adminRegister(transformedData)

      if (result.success) {
        toast.success("Registro exitoso. Por favor, verifica tu email para activar tu cuenta.")
        router.push("/auth/login/admin")
      } else {
        toast.error(result.error || "Error al registrar administrador")
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

      <AdminRegisterForm onSubmit={handleAdminRegister} />

      <div className="text-center mt-6">
        <p className="text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/login/admin" className="text-orange-700 hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </>
  )
}
