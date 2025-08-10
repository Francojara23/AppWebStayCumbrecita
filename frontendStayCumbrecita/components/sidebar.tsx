"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  BarChart,
  Home,
  Users,
  MessageCircle,
  Calendar,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Pencil,
  Bell,
  QrCode,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"
import { getCurrentUser, type GetCurrentUserResponse } from "@/app/actions/auth/getCurrentUser"
import { logout } from "@/app/actions/auth/logout"
import { ChangePhotoModal } from "@/components/tourist/change-photo-modal"
import { Loader2 } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  hasChildren?: boolean
  expanded?: boolean
  indent?: boolean
  href?: string
  isCollapsed?: boolean
}

function NavItem({ icon, label, active, onClick, hasChildren, expanded, indent, href, isCollapsed }: NavItemProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center w-full py-2 text-sm font-medium rounded-md",
        active ? "bg-orange-100 text-orange-600" : "text-gray-700 hover:bg-gray-100",
        isCollapsed ? "justify-center px-2" : "px-3",
        indent && !isCollapsed && "pl-10",
      )}
      title={isCollapsed ? label : undefined}
    >
      <div className={cn(!isCollapsed && "mr-3")}>{icon}</div>
      {!isCollapsed && <span className="flex-1 text-left">{label}</span>}
      {hasChildren &&
        !isCollapsed &&
        (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
    </button>
  )
}

export default function Sidebar() {
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["Hospedajes"])
  const [currentUser, setCurrentUser] = useState<GetCurrentUserResponse["data"] | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const router = useRouter()
  
  // Hook para verificar permisos del usuario
  const { hasAdminAccess, isLoading: permissionsLoading } = useUserPermissions()

  // Handle logo click to redirect to home
  const handleLogoClick = () => {
    router.push("/home")
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout("/home")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      // En caso de error, redirigir manualmente
      router.push("/home")
    }
  }

  // Handle change photo
  const handleChangePhoto = () => {
    setIsPhotoModalOpen(true)
  }

  // Handle image updated
  const handleImageUpdated = (newImageUrl: string) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        fotoUrl: newImageUrl
      })
    }
  }

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoadingUser(true)
        const response = await getCurrentUser()
        
        if (response.success && response.data) {
          setCurrentUser(response.data)
        } else if (response.shouldRedirectToHome) {
          // Redirigir a home si hay error de autorización
          console.log("Redirigiendo a home debido a error de autorización:", response.error)
          router.push("/home")
          return
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
        // En caso de error inesperado, también redirigir a home
        router.push("/home")
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  // Save collapsed state to localStorage
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem("sidebarCollapsed")
    if (savedCollapsedState !== null) {
      setIsCollapsed(savedCollapsedState === "true")
    }
  }, [])

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    localStorage.setItem("sidebarCollapsed", String(newCollapsedState))
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const toggleExpanded = (item: string) => {
    setExpandedItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
  }

  const isExpanded = (item: string) => expandedItems.includes(item)

  const isActive = (path: string) => {
    return pathname?.includes(path)
  }

  // Special check for the main adminABM page (Registrados)
  const isRegistradosActive = () => {
    return pathname === "/adminABM" || pathname === "/adminABM/"
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser?.nombre) return "U"
    const fullName = `${currentUser.nombre} ${currentUser.apellido || ""}`.trim()
    const nameParts = fullName.split(" ")
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }

  // Get user role display
  const getUserRole = () => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return "Usuario"
    const role = currentUser.roles[0].nombre
    switch (role) {
      case "PROPIETARIO":
        return "Propietario"
      case "ADMIN":
        return "Administrador"
      case "EMPLEADO":
        return "Empleado"
      case "SUPER-ADMIN":
        return "Super Admin"
      default:
        return "Usuario"
    }
  }

  // Get user full name
  const getUserFullName = () => {
    if (!currentUser?.nombre) return "Usuario"
    return `${currentUser.nombre} ${currentUser.apellido || ""}`.trim()
  }

  // Componente para el contenido del sidebar (reutilizado en mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto mt-5 px-2 space-y-1">
        {/* Reportería - Solo para usuarios con acceso administrativo */}
        {hasAdminAccess && (
          <NavItem
            icon={<BarChart className="h-5 w-5" />}
            label="Reportería"
            active={isActive("/reporteria")}
            href="/adminABM/reporteria"
            isCollapsed={false}
          />
        )}
        
        {/* Hospedajes - Solo para usuarios con acceso administrativo */}
        {hasAdminAccess && (
          <NavItem
            icon={<Home className="h-5 w-5" />}
            label="Hospedajes"
            active={
              isActive("/adminABM") &&
              !isActive("/empleados") &&
              !isActive("/chatbot") &&
              !isActive("/publicidad") &&
              !isActive("/reservas") &&
              !isActive("/configuracion")
            }
            onClick={() => toggleExpanded("Hospedajes")}
            hasChildren={true}
            expanded={isExpanded("Hospedajes")}
            isCollapsed={false}
          />
        )}

        {/* Submenu de Hospedajes - Solo para usuarios con acceso administrativo */}
        {hasAdminAccess && isExpanded("Hospedajes") && (
          <div className="mt-1 space-y-1 transition-all duration-200 ease-in-out">
            <NavItem
              icon={<Home className="h-5 w-5 text-orange-600" />}
              label="Registrados"
              active={isRegistradosActive()}
              href="/adminABM"
              indent
              isCollapsed={false}
            />
            <NavItem
              icon={<MessageCircle className="h-5 w-5" />}
              label="Chatbot"
              active={isActive("/chatbot")}
              href="/adminABM/chatbot"
              indent
              isCollapsed={false}
            />
            <NavItem
              icon={<Users className="h-5 w-5" />}
              label="Empleados"
              active={isActive("/empleados")}
              href="/adminABM/empleados"
              indent
              isCollapsed={false}
            />
            <NavItem
              icon={<BarChart className="h-5 w-5" />}
              label="Publicidad"
              active={isActive("/publicidad")}
              href="/adminABM/publicidad"
              indent
              isCollapsed={false}
            />
            {/* Reservas - Visible para todos los empleados */}
            <NavItem
              icon={<Calendar className="h-5 w-5" />}
              label="Reservas"
              active={isActive("/reservas")}
              href="/adminABM/reservas"
              indent
              isCollapsed={false}
            />
            {/* Pagos - Visible para todos los empleados */}
            <NavItem
              icon={<CreditCard className="h-5 w-5" />}
              label="Pagos"
              active={isActive("/pagos")}
              href="/adminABM/pagos"
              indent
              isCollapsed={false}
            />
          </div>
        )}

        {/* Para usuarios SIN acceso administrativo, mostrar solo las rutas básicas */}
        {!hasAdminAccess && !permissionsLoading && (
          <>
            <NavItem
              icon={<Home className="h-5 w-5" />}
              label="Hospedajes"
              active={isRegistradosActive()}
              href="/adminABM"
              isCollapsed={false}
            />
            <NavItem
              icon={<Calendar className="h-5 w-5" />}
              label="Reservas"
              active={isActive("/reservas")}
              href="/adminABM/reservas"
              isCollapsed={false}
            />
            <NavItem
              icon={<CreditCard className="h-5 w-5" />}
              label="Pagos"
              active={isActive("/pagos")}
              href="/adminABM/pagos"
              isCollapsed={false}
            />
          </>
        )}

        {/* Configuración - Visible para todos */}
        <NavItem
          icon={<Settings className="h-5 w-5" />}
          label="Configuración"
          active={isActive("/configuracion")}
          href="/adminABM/configuracion"
          isCollapsed={false}
        />
        
        {/* Notificaciones - Solo para usuarios con acceso administrativo */}
        {hasAdminAccess && (
          <NavItem
            icon={<Bell className="h-5 w-5" />}
            label="Notificaciones"
            active={isActive("/notificaciones")}
            href="/adminABM/notificaciones"
            isCollapsed={false}
          />
        )}
      </nav>

      <div className="mt-auto p-4 border-t border-gray-100">
        {isLoadingUser ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-xs text-center text-gray-500 mb-2">{getUserRole()}</div>
            <div className="flex flex-col items-center">
              <div className="relative group" onClick={handleChangePhoto}>
                <Avatar className="h-16 w-16 mb-2 border-2 border-white cursor-pointer">
                  <AvatarImage src={currentUser?.fotoUrl || "/placeholder.svg?height=64&width=64"} alt={currentUser?.nombre || "Usuario"} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                  <Pencil className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-sm font-medium">{getUserFullName()}</div>
              <div className="text-xs text-gray-500 mb-3">{currentUser?.email || "Sin email"}</div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-orange-600 border-orange-600 w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isMobile && (
        <div className="fixed top-0 left-0 z-50 w-full bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Image
            src="/logos/logo-black.png"
            alt="Capturecita Logo"
            width={100}
            height={40}
            className="h-8 w-auto cursor-pointer"
            onClick={handleLogoClick}
          />
          <Button variant="ghost" size="sm" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={toggleSidebar}></div>
          <div className="relative bg-white h-full w-64 flex flex-col">
            <div className="p-4 flex justify-between items-center border-b">
              <Image
                src="/logos/logo-black.png"
                alt="Capturecita Logo"
                width={100}
                height={40}
                className="h-8 w-auto cursor-pointer"
                onClick={handleLogoClick}
              />
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto"><SidebarContent /></div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex md:flex-col md:border-r md:border-gray-200 bg-white transition-all duration-300 h-screen",
          isMobile ? "pt-16" : "",
          isCollapsed ? "md:w-16" : "md:w-64",
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn("p-4 flex", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center justify-center cursor-pointer" onClick={handleLogoClick}>
                <Image 
                  src="/logos/logo-black.png" 
                  alt="Capturecita Logo" 
                  width={120} 
                  height={50} 
                  className="h-12 w-auto" 
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className={cn("p-1 h-8 w-8", isCollapsed && "mx-auto")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className={cn("flex-1 overflow-y-auto mt-5 px-2 space-y-1", isCollapsed && "px-1")}>
            {/* Reportería - Solo para usuarios con acceso administrativo */}
            {hasAdminAccess && (
              <NavItem
                icon={<BarChart className="h-5 w-5" />}
                label="Reportería"
                active={isActive("/reporteria")}
                href="/adminABM/reporteria"
                isCollapsed={isCollapsed}
              />
            )}
            
            {/* Hospedajes - Solo para usuarios con acceso administrativo */}
            {hasAdminAccess && (
              <NavItem
                icon={<Home className="h-5 w-5" />}
                label="Hospedajes"
                active={
                  isActive("/adminABM") &&
                  !isActive("/empleados") &&
                  !isActive("/chatbot") &&
                  !isActive("/publicidad") &&
                  !isActive("/reservas") &&
                  !isActive("/configuracion")
                }
                onClick={() => !isCollapsed && toggleExpanded("Hospedajes")}
                hasChildren={!isCollapsed}
                expanded={isExpanded("Hospedajes")}
                isCollapsed={isCollapsed}
                href={isCollapsed ? "/adminABM" : undefined}
              />
            )}

            {/* Submenu de Hospedajes - Solo para usuarios con acceso administrativo */}
            {hasAdminAccess && isExpanded("Hospedajes") && !isCollapsed && (
              <div className="mt-1 space-y-1 transition-all duration-200 ease-in-out">
                <NavItem
                  icon={<Home className="h-5 w-5 text-orange-600" />}
                  label="Registrados"
                  active={isRegistradosActive()}
                  href="/adminABM"
                  indent
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="Chatbot"
                  active={isActive("/chatbot")}
                  href="/adminABM/chatbot"
                  indent
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<Users className="h-5 w-5" />}
                  label="Empleados"
                  active={isActive("/empleados")}
                  href="/adminABM/empleados"
                  indent
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<BarChart className="h-5 w-5" />}
                  label="Publicidad"
                  active={isActive("/publicidad")}
                  href="/adminABM/publicidad"
                  indent
                  isCollapsed={isCollapsed}
                />
                {/* Reservas - Visible para todos los empleados */}
                <NavItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Reservas"
                  active={isActive("/reservas")}
                  href="/adminABM/reservas"
                  indent
                  isCollapsed={isCollapsed}
                />
                {/* Check-in - Para empleados de recepción */}
                <NavItem
                  icon={<QrCode className="h-5 w-5" />}
                  label="Check-in"
                  active={isActive("/checkin")}
                  href="/adminABM/checkin"
                  indent
                  isCollapsed={isCollapsed}
                />
                {/* Pagos - Visible para todos los empleados */}
                <NavItem
                  icon={<CreditCard className="h-5 w-5" />}
                  label="Pagos"
                  active={isActive("/pagos")}
                  href="/adminABM/pagos"
                  indent
                  isCollapsed={isCollapsed}
                />
              </div>
            )}

            {/* Para usuarios SIN acceso administrativo, mostrar solo las rutas básicas */}
            {!hasAdminAccess && !permissionsLoading && (
              <>
                <NavItem
                  icon={<Home className="h-5 w-5" />}
                  label="Hospedajes"
                  active={isRegistradosActive()}
                  href="/adminABM"
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Reservas"
                  active={isActive("/reservas")}
                  href="/adminABM/reservas"
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<CreditCard className="h-5 w-5" />}
                  label="Pagos"
                  active={isActive("/pagos")}
                  href="/adminABM/pagos"
                  isCollapsed={isCollapsed}
                />
              </>
            )}

            {/* Configuración - Visible para todos */}
            <NavItem
              icon={<Settings className="h-5 w-5" />}
              label="Configuración"
              active={isActive("/configuracion")}
              href="/adminABM/configuracion"
              isCollapsed={isCollapsed}
            />
            
            {/* Notificaciones - Solo para usuarios con acceso administrativo */}
            {hasAdminAccess && (
              <NavItem
                icon={<Bell className="h-5 w-5" />}
                label="Notificaciones"
                active={isActive("/notificaciones")}
                href="/adminABM/notificaciones"
                isCollapsed={isCollapsed}
              />
            )}
          </nav>
          
          <div className={cn("mt-auto p-4 border-t border-gray-100", isCollapsed && "p-2")}>
            {isLoadingUser ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : isCollapsed ? (
              <div className="flex flex-col items-center">
                <div className="relative group" onClick={handleChangePhoto}>
                  <Avatar className="h-10 w-10 mb-2 border-2 border-white cursor-pointer">
                    <AvatarImage src={currentUser?.fotoUrl || "/placeholder.svg?height=40&width=40"} alt={currentUser?.nombre || "Usuario"} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    <Pencil className="h-4 w-4 text-white" />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-orange-600 mt-2"
                  title="Cerrar sesión"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-xs text-center text-gray-500 mb-2">{getUserRole()}</div>
                <div className="flex flex-col items-center">
                  <div className="relative group" onClick={handleChangePhoto}>
                    <Avatar className="h-16 w-16 mb-2 border-2 border-white cursor-pointer">
                      <AvatarImage src={currentUser?.fotoUrl || "/placeholder.svg?height=64&width=64"} alt={currentUser?.nombre || "Usuario"} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                      <Pencil className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="text-sm font-medium">{getUserFullName()}</div>
                  <div className="text-xs text-gray-500 mb-3">{currentUser?.email || "Sin email"}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-orange-600 border-orange-600 w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para cambiar foto */}
      <ChangePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onImageUpdated={handleImageUpdated}
        currentImageUrl={currentUser?.fotoUrl || undefined}
      />
    </>
  )
}
