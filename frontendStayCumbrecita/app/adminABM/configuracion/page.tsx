"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Pencil, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getCurrentUser, type GetCurrentUserResponse } from "@/app/actions/auth/getCurrentUser"
import GooglePlacesAutocomplete from "@/components/ui/google-places-autocomplete"



export default function ConfiguracionPage() {
  const [currentUser, setCurrentUser] = useState<GetCurrentUserResponse["data"] | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Estado para la información personal
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
  })

  // Estado para las contraseñas
  const [passwords, setPasswords] = useState({
    current: "********",
    new: "",
    repeat: "",
  })



  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoadingUser(true)
        const response = await getCurrentUser()
        
        if (response.success && response.data) {
          setCurrentUser(response.data)
          
          // Update personal info with user data
          setPersonalInfo({
            firstName: response.data.nombre || "",
            lastName: response.data.apellido || "",
            phone: response.data.telefono || "",
            email: response.data.email || "",
            address: response.data.direccion || "",
          })


        } else if (response.shouldRedirectToHome) {
          // Redirigir a home si hay error de autorización
          console.log("Redirigiendo a home debido a error de autorización:", response.error)
          window.location.href = "/home"
          return
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
        // En caso de error inesperado, también redirigir a home
        window.location.href = "/home"
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [])

  // Función para manejar cambios en la información personal
  const handlePersonalInfoChange = (field: string, value: string) => {
    setPersonalInfo({
      ...personalInfo,
      [field]: value,
    })
  }

  // Función para manejar cambios en las contraseñas
  const handlePasswordChange = (field: string, value: string) => {
    setPasswords({
      ...passwords,
      [field]: value,
    })
  }



  // Función para guardar los cambios
  const handleSave = () => {
    // Validar contraseñas si se están cambiando
    if (passwords.new || passwords.repeat) {
      if (passwords.new !== passwords.repeat) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        })
        return
      }
    }

    // En una implementación real, aquí se enviarían los datos a una API
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido guardados exitosamente",
    })
  }

  if (isLoadingUser) {
    return (
      <>
        <header className="border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <h1 className="text-xl font-medium text-orange-700">Configuración</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-4" />
            <p>Cargando datos del usuario...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="text-xl font-medium text-orange-700">Configuración</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="border border-blue-200 rounded-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Información personal</h2>
              <p className="text-xs text-red-500">*Esta vista es solo accesible a dueños de hospedajes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Input
                  value={personalInfo.firstName}
                  onChange={(e) => handlePersonalInfoChange("firstName", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative">
                <Input
                  value={personalInfo.lastName}
                  onChange={(e) => handlePersonalInfoChange("lastName", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative">
                <Input
                  value={personalInfo.phone}
                  onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative">
                <Input
                  value={personalInfo.email}
                  onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative md:col-span-2">
                <GooglePlacesAutocomplete
                  value={personalInfo.address}
                  onChange={(value) => handlePersonalInfoChange("address", value)}
                  className="pl-10"
                  placeholder="Ingresa tu dirección"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3 z-10">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            <h2 className="text-lg font-medium mb-4">Contraseña</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => handlePasswordChange("current", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative">
                <Input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={passwords.new}
                  onChange={(e) => handlePasswordChange("new", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative md:col-span-2 md:w-1/2">
                <Input
                  type="password"
                  placeholder="Repetir contraseña"
                  value={passwords.repeat}
                  onChange={(e) => handlePasswordChange("repeat", e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                </div>
                <button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>



            <div className="flex justify-end space-x-4">
              <Button variant="outline">Cancelar</Button>
              <Button className="bg-gray-400 hover:bg-gray-500 text-white" onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
