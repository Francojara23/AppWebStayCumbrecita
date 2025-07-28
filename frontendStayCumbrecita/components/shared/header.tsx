"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  Search,
  Building2,
  LogIn,
  UserPlus,
  FileText,
  CreditCard,
  User,
  MessageCircle,
  LogOut,
  ChevronDown,
  Star,
  Bell,
  Settings,
} from "lucide-react"
import { SearchModal } from "@/components/search-modal"
import { logout } from "@/app/actions/auth/logout"
import { useUser } from "@/hooks/use-user"
import { useNotificacionesUsuario } from "@/hooks/use-api"

// Tipo para notificaciones del backend
interface BackendNotification {
  id: string
  titulo: string
  cuerpo: string
  tipo: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  data?: any
  leida: boolean
  canalEmail: boolean
  canalPush: boolean
  canalInApp: boolean
  readAt?: string
  createdAt: string
  updatedAt: string
}

export default function Header() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Obtener datos del usuario autenticado
  const { user, isAuthenticated, isAdmin, isTourist, isLoading } = useUser()
  
  // Obtener notificaciones del usuario solo si está autenticado
  const { data: notificacionesData } = useNotificacionesUsuario(user?.id)
  
  // Calcular el número de notificaciones no leídas
  const unreadCount = notificacionesData?.filter((notif: BackendNotification) => !notif.leida).length || 0

  // Check if we're in the tourist section
  const isTouristSection = pathname?.startsWith("/tourist")
  
  // Check if we're in the admin section
  const isAdminSection = pathname?.startsWith("/admin") || pathname?.startsWith("/adminABM")

  // Crear iniciales para el avatar
  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName) return "U"
    const first = firstName.charAt(0).toUpperCase()
    const last = lastName ? lastName.charAt(0).toUpperCase() : ""
    return first + last
  }

  // Determinar qué datos mostrar según el contexto
  const displayUser = user ? {
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    avatar: user.fotoUrl || undefined, // Usar la imagen real del usuario o undefined para mostrar iniciales
    notifications: unreadCount, // Número real de notificaciones no leídas
    initials: getUserInitials(user.firstName, user.lastName)
  } : null

  const touristNavItems = [
    { href: "/tourist", label: "Mis Reservas", icon: <FileText className="h-4 w-4 mr-2" /> },
    { href: "/tourist/pagos", label: "Mis Pagos", icon: <CreditCard className="h-4 w-4 mr-2" /> },
    { href: "/tourist/perfil", label: "Mi Perfil", icon: <User className="h-4 w-4 mr-2" /> },
    { href: "/tourist/consultas", label: "Mis Consultas", icon: <MessageCircle className="h-4 w-4 mr-2" /> },
    { href: "/tourist/opiniones", label: "Mis Opiniones", icon: <Star className="h-4 w-4 mr-2" /> },
    {
      href: "/tourist/notificaciones",
      label: "Notificaciones",
      icon: <Bell className="h-4 w-4 mr-2" />,
      badge: displayUser?.notifications && displayUser.notifications > 0 ? displayUser.notifications : undefined,
    },
  ]

  const adminNavItems = [
    { href: "/adminABM", label: "Gestión de Hospedajes", icon: <Building2 className="h-4 w-4 mr-2" /> },
    { href: "/adminABM/reservas", label: "Gestión de Reservas", icon: <FileText className="h-4 w-4 mr-2" /> },
    { href: "/adminABM/pagos", label: "Gestión de Pagos", icon: <CreditCard className="h-4 w-4 mr-2" /> },
    { href: "/adminABM/reporteria", label: "Reportes", icon: <FileText className="h-4 w-4 mr-2" /> },
    { href: "/adminABM/configuracion", label: "Configuración", icon: <Settings className="h-4 w-4 mr-2" /> },
    {
      href: "/adminABM/notificaciones",
      label: "Notificaciones",
      icon: <Bell className="h-4 w-4 mr-2" />,
      badge: displayUser?.notifications && displayUser.notifications > 0 ? displayUser.notifications : undefined,
    },
  ]

  const handleLogout = async () => {
    try {
      // Llamar al server action de logout
      await logout("/home")
      // No es necesario hacer nada más aquí, ya que el server action redirige
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Mostrar loading state si está cargando
  if (isLoading) {
    return (
      <header className="bg-[#CD6C22] text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <div className="flex items-center">
          <Link href="/home">
            <Image 
              src="/logos/logo-white.png" 
              alt="Capturecita Logo" 
              width={120} 
              height={50} 
              style={{ width: 'auto', height: '48px' }}
            />
          </Link>
        </div>
          <div className="animate-pulse">Cargando...</div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-[#CD6C22] text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/home">
            <Image 
              src="/logos/logo-white.png" 
              alt="Capturecita Logo" 
              width={120} 
              height={50} 
              style={{ width: 'auto', height: '48px' }}
            />
          </Link>
        </div>
        
        <div className="hidden md:flex space-x-6">
          <Link href="/home" className="flex items-center hover:underline">
            <Home className="h-4 w-4 mr-2" />
            Inicio
          </Link>
          <button onClick={() => setIsSearchModalOpen(true)} className="flex items-center hover:underline">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </button>
          <Link href="/search" className="flex items-center hover:underline">
            <Building2 className="h-4 w-4 mr-2" />
            Hoteles
          </Link>
        </div>
        <div className="flex space-x-4 items-center">
          {/* Sección de Turista */}
          {isAuthenticated && isTourist && displayUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 bg-transparent text-white hover:bg-white/20">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                    <AvatarFallback>{displayUser.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">{displayUser.name}</span>
                  </div>
                  {displayUser.notifications > 0 && (
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {displayUser.notifications}
                      </span>
                    </div>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[240px] w-auto max-w-[320px]">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none w-full">
                    <p className="font-medium truncate">{displayUser.name}</p>
                    <p className="text-xs text-gray-500 break-all">{displayUser.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {touristNavItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center">
                        {item.icon}
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center text-red-600 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sección de Admin */}
          {isAuthenticated && isAdmin && displayUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 bg-transparent text-white hover:bg-white/20">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                    <AvatarFallback>{displayUser.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">{displayUser.name}</span>
                    <span className="text-xs text-orange-200">Administrador</span>
                  </div>
                  {displayUser.notifications > 0 && (
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {displayUser.notifications}
                      </span>
                    </div>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[240px] w-auto max-w-[320px]">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none w-full">
                    <p className="font-medium truncate">{displayUser.name}</p>
                    <p className="text-xs text-gray-500 break-all">{displayUser.email}</p>
                    <p className="text-xs text-orange-600 font-medium">Administrador</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {adminNavItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center">
                        {item.icon}
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center text-red-600 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Botones de login/registro para usuarios no autenticados */}
          {!isAuthenticated && (
            <>
              <Link href="/auth/login/tourist">
                <Button
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-[#CD6C22] flex items-center"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/auth/register/tourist" className="hidden md:block">
                <Button className="bg-white text-[#CD6C22] hover:bg-gray-100 flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Registrarse
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </header>
  )
}
