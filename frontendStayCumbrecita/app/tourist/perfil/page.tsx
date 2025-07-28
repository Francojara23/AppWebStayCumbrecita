"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionBanner } from "@/components/tourist/section-banner"
import { getProfile } from "@/app/actions/auth/getProfile"
import { updateProfile } from "@/app/actions/auth/updateProfile"
import { changePassword } from "@/app/actions/auth/changePassword"
import { ChangePhotoModal } from "@/components/tourist/change-photo-modal"
import GooglePlacesAutocomplete from "@/components/ui/google-places-autocomplete"

export default function PerfilPage() {
  // Estado para la información personal
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    phone: "",
    address: "",
    birthdate: "",
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const response = await getProfile()
        
        if (response.success && response.user) {
          const user = response.user
          setPersonalInfo({
            firstName: user.nombre || "",
            lastName: user.apellido || "",
            dni: user.dni?.toString() || "",
            email: user.email || "",
            phone: user.telefono?.toString() || "",
            address: user.direccion || "",
            birthdate: user.fechaNacimiento ? new Date(user.fechaNacimiento).toLocaleDateString() : "",
          })
          setProfileImageUrl(user.fotoUrl || null)
        } else {
          toast({
            title: "Error",
            description: response.error || "No se pudo cargar el perfil",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error cargando perfil:", error)
        toast({
          title: "Error",
          description: "Error de conexión al cargar el perfil",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Estado para las contraseñas
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    repeat: "",
  })

  // Estado para los campos editables
  const [editableFields, setEditableFields] = useState({
    firstName: false,
    lastName: false,
    dni: false,
    email: false,
    phone: false,
    address: false,
    birthdate: false,
    currentPassword: false,
    newPassword: false,
    repeatPassword: false,
  })

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

  // Función para alternar la edición de un campo
  const toggleFieldEdit = (field: keyof typeof editableFields) => {
    setEditableFields({
      ...editableFields,
      [field]: !editableFields[field],
    })
  }

  // Función para abrir el modal de cambio de foto
  const handleChangePhoto = () => {
    setIsPhotoModalOpen(true)
  }

  // Función para manejar la actualización de la imagen
  const handleImageUpdated = (newImageUrl: string) => {
    setProfileImageUrl(newImageUrl)
  }

  // Función para guardar los cambios
  const handleSave = async () => {
    try {
      setIsSaving(true)

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

        if (!passwords.current) {
          toast({
            title: "Error",
            description: "Debes ingresar tu contraseña actual",
            variant: "destructive",
          })
          return
        }

        // Cambiar contraseña
        const passwordResponse = await changePassword({
          passwordActual: passwords.current,
          passwordNueva: passwords.new
        })

        if (!passwordResponse.success) {
          toast({
            title: "Error",
            description: passwordResponse.error || "No se pudo cambiar la contraseña",
            variant: "destructive",
          })
          return
        }
      }

      // Actualizar perfil
      const profileData = {
        nombre: personalInfo.firstName,
        apellido: personalInfo.lastName,
        telefono: personalInfo.phone ? personalInfo.phone.replace(/\D/g, '') : undefined,
        direccion: personalInfo.address || undefined,
      }

      const profileResponse = await updateProfile(profileData)

      if (!profileResponse.success) {
        toast({
          title: "Error",
          description: profileResponse.error || "No se pudo actualizar el perfil",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Datos guardados",
        description: "Los cambios han sido guardados exitosamente",
      })

      // Resetear todos los campos editables
      setEditableFields({
        firstName: false,
        lastName: false,
        dni: false,
        email: false,
        phone: false,
        address: false,
        birthdate: false,
        currentPassword: false,
        newPassword: false,
        repeatPassword: false,
      })

      // Limpiar contraseñas
      setPasswords({
        current: "",
        new: "",
        repeat: "",
      })

    } catch (error) {
      console.error("Error guardando cambios:", error)
      toast({
        title: "Error",
        description: "Error de conexión al guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SectionBanner 
          title="Mi Perfil" 
          description="Gestiona tu información personal y preferencias"
          imageSrc="/bannerTuristaImagen.jpg"
          imageAlt="Banner de perfil de usuario"
        />
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner 
        title="Mi Perfil" 
        description="Gestiona tu información personal y preferencias"
        imageSrc="/bannerTuristaImagen.jpg"
        imageAlt="Banner de perfil de usuario"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage 
                    src={profileImageUrl || "/placeholder.svg?height=128&width=128"} 
                    alt={`${personalInfo.firstName} ${personalInfo.lastName}`} 
                  />
                  <AvatarFallback>
                    {personalInfo.firstName.charAt(0)}{personalInfo.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{personalInfo.email}</p>
                <Button variant="outline" size="sm" className="w-full" onClick={handleChangePhoto}>
                  Cambiar foto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="personal">
            <TabsList className="mb-6">
              <TabsTrigger value="personal">Información Personal</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
              <TabsTrigger value="preferences">Preferencias</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>Actualiza tu información personal y de contacto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <Input
                        value={personalInfo.firstName}
                        onChange={(e) => handlePersonalInfoChange("firstName", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.firstName}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("firstName")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Nombre</p>
                    </div>

                    <div className="relative">
                      <Input
                        value={personalInfo.lastName}
                        onChange={(e) => handlePersonalInfoChange("lastName", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.lastName}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("lastName")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Apellido</p>
                    </div>

                    <div className="relative">
                      <Input
                        value={personalInfo.email}
                        onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.email}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("email")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Email</p>
                    </div>

                    <div className="relative">
                      <Input
                        value={personalInfo.phone}
                        onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.phone}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("phone")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Teléfono</p>
                    </div>

                    <div className="relative">
                      <Input
                        value={personalInfo.dni}
                        onChange={(e) => handlePersonalInfoChange("dni", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.dni}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Shield className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("dni")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">DNI</p>
                    </div>

                    <div className="relative">
                      <Input
                        value={personalInfo.birthdate}
                        onChange={(e) => handlePersonalInfoChange("birthdate", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.birthdate}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("birthdate")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Fecha de nacimiento</p>
                    </div>

                    <div className="relative md:col-span-2">
                      <GooglePlacesAutocomplete
                        value={personalInfo.address}
                        onChange={(value) => handlePersonalInfoChange("address", value)}
                        className="pl-10"
                        disabled={!editableFields.address}
                        placeholder="Ingresa tu dirección"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 z-10"
                        onClick={() => toggleFieldEdit("address")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Dirección</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Actualiza tu contraseña y configura las opciones de seguridad</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <Input
                        type="password"
                        value={passwords.current}
                        onChange={(e) => handlePasswordChange("current", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.currentPassword}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                          className="text-gray-400"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("currentPassword")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Contraseña actual</p>
                    </div>

                    <div className="relative">
                      <Input
                        type="password"
                        placeholder="Nueva contraseña"
                        value={passwords.new}
                        onChange={(e) => handlePasswordChange("new", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.newPassword}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                          className="text-gray-400"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("newPassword")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Nueva contraseña</p>
                    </div>

                    <div className="relative md:col-span-2 md:w-1/2">
                      <Input
                        type="password"
                        placeholder="Repetir contraseña"
                        value={passwords.repeat}
                        onChange={(e) => handlePasswordChange("repeat", e.target.value)}
                        className="pl-10"
                        disabled={!editableFields.repeatPassword}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                          className="text-gray-400"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => toggleFieldEdit("repeatPassword")}
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Repetir nueva contraseña</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? "Actualizando..." : "Actualizar Contraseña"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias</CardTitle>
                  <CardDescription>Configura tus preferencias de notificaciones y comunicación</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Próximamente...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal para cambiar foto */}
      <ChangePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onImageUpdated={handleImageUpdated}
        currentImageUrl={profileImageUrl || undefined}
      />
    </div>
  )
}
