"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Bell, Check, X, Trash2, Eye, EyeOff, Loader2, Hotel, Filter, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useNotifications } from "@/hooks/use-notifications"
import { getNotificationsByHospedajes, type NotificationByHospedajes } from "@/app/actions/notifications/getNotificationsByHospedajes"
import { markNotificationAsRead } from "@/app/actions/notifications/markNotificationAsRead"
import { markAllNotificationsAsRead } from "@/app/actions/notifications/markAllNotificationsAsRead"
import { getNotificationDetail, type NotificationDetail } from "@/app/actions/notifications/getNotificationDetail"

interface Notification {
  id: string
  type: "info" | "warning" | "success" | "error"
  title: string
  message: string
  read: boolean
  createdAt: string
  category: "reservation" | "payment" | "system" | "accommodation"
  hospedaje?: string
  hospedajeId?: string
}

// Mapear tipos del backend a tipos del frontend
const mapBackendTypeToFrontend = (backendType: string): "info" | "warning" | "success" | "error" => {
  switch (backendType?.toLowerCase()) {
    case 'reserva':
      return 'info'
    case 'pago':
      return 'success'
    case 'sistema':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'info'
  }
}

// Determinar categoría basado en el tipo o datos de la notificación
const getCategoryFromNotification = (notification: NotificationByHospedajes): "reservation" | "payment" | "system" | "accommodation" => {
  const type = notification.tipo?.toLowerCase()
  const data = notification.data
  
  if (type === 'reserva' || data?.reservaId || notification.titulo.toLowerCase().includes('reserva')) {
    return 'reservation'
  }
  if (type === 'pago' || data?.pagoId || notification.titulo.toLowerCase().includes('pago')) {
    return 'payment'
  }
  if (data?.hospedajeId || notification.titulo.toLowerCase().includes('hospedaje') || notification.titulo.toLowerCase().includes('hotel')) {
    return 'accommodation'
  }
  return 'system'
}

// Extraer información de hospedaje de los datos de la notificación
const extractHospedajeInfo = (notification: NotificationByHospedajes) => {
  const data = notification.data || {}
  
  // Intentar obtener el nombre del hospedaje desde diferentes campos
  const hospedaje = data.hospedaje || data.hotel || data.nombreHospedaje || null
  const hospedajeId = data.hospedajeId || data.hotelId || null
  
  return { hospedaje, hospedajeId }
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [hospedajeFilter, setHospedajeFilter] = useState<string>("all")
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Estados para el modal de detalles
  const [selectedNotificationForDetail, setSelectedNotificationForDetail] = useState<string | null>(null)
  const [notificationDetail, setNotificationDetail] = useState<NotificationDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Hook para obtener notificaciones reales (si está disponible)
  const { notifications: realNotifications, unreadCount } = useNotifications()

  // Función para cargar notificaciones desde el backend
  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await getNotificationsByHospedajes()
      
      if (!response.success) {
        setError(response.error || "Error al cargar notificaciones")
        return
      }

      if (response.data) {
        // Mapear las notificaciones del backend al formato del frontend
        const mappedNotifications: Notification[] = response.data.map((notification) => {
          const { hospedaje, hospedajeId } = extractHospedajeInfo(notification)
          
          return {
            id: notification.id,
            type: mapBackendTypeToFrontend(notification.tipo),
            title: notification.titulo,
            message: notification.cuerpo,
            read: notification.leida,
            createdAt: notification.createdAt,
            category: getCategoryFromNotification(notification),
            hospedaje: hospedaje || undefined,
            hospedajeId: hospedajeId || undefined
          }
        })
        
        setNotifications(mappedNotifications)
      } else {
        setNotifications([])
      }
    } catch (error) {
      setError("Error de conexión al cargar notificaciones")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // Obtener hospedajes únicos para el filtro
  const uniqueHospedajes = Array.from(
    new Set(
      notifications
        .map(n => n.hospedaje)
        .filter((hospedaje): hospedaje is string => Boolean(hospedaje))
    )
  ).sort()

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return "bg-blue-100 text-blue-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryIcon = (category: Notification["category"]) => {
    switch (category) {
      case "reservation":
        return "📅"
      case "payment":
        return "💳"
      case "system":
        return "⚙️"
      case "accommodation":
        return "🏨"
      default:
        return "📢"
    }
  }

  const getCategoryColor = (category: Notification["category"]) => {
    switch (category) {
      case "reservation":
        return "bg-blue-100 text-blue-800"
      case "payment":
        return "bg-green-100 text-green-800"
      case "system":
        return "bg-yellow-100 text-yellow-800"
      case "accommodation":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    // Filtro por estado de lectura
    if (filter === "unread" && notification.read) return false
    if (filter === "read" && !notification.read) return false
    
    // Filtro por hospedaje
    if (hospedajeFilter !== "all" && notification.hospedaje !== hospedajeFilter) return false
    
    return true
  })

  // Lógica de paginación
  const totalItems = filteredNotifications.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, hospedajeFilter])

  // Función para cambiar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll hacia arriba al cambiar página
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Función para cambiar items por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1) // Resetear a primera página
  }

  const handleMarkAsRead = async (id: string) => {
    setMarkingAsRead(id)
    try {
      const response = await markNotificationAsRead(id, true)
      
      if (response.success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          )
        )
        toast({
          title: "Notificación marcada como leída",
          description: "La notificación ha sido marcada como leída",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Error al marcar la notificación como leída",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al marcar la notificación",
        variant: "destructive"
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    setMarkingAsRead(id)
    try {
      const response = await markNotificationAsRead(id, false)
      
      if (response.success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id ? { ...notification, read: false } : notification
          )
        )
        toast({
          title: "Notificación marcada como no leída",
          description: "La notificación ha sido marcada como no leída",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Error al marcar la notificación como no leída",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al marcar la notificación",
        variant: "destructive"
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
    toast({
      title: "Notificación eliminada",
      description: "La notificación ha sido eliminada correctamente",
    })
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true)
    try {
      const response = await markAllNotificationsAsRead()
      
      if (response.success) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        )
        toast({
          title: "Todas las notificaciones marcadas como leídas",
          description: "Se han marcado todas las notificaciones como leídas",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Error al marcar todas las notificaciones como leídas",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al marcar las notificaciones",
        variant: "destructive"
      })
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedNotifications.length === 0) return
    
    setNotifications(prev =>
      prev.filter(notification => !selectedNotifications.includes(notification.id))
    )
    setSelectedNotifications([])
    toast({
      title: "Notificaciones eliminadas",
      description: `Se han eliminado ${selectedNotifications.length} notificaciones`,
    })
  }

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(notifId => notifId !== id)
        : [...prev, id]
    )
  }

  const handleClearFilters = () => {
    setFilter("all")
    setHospedajeFilter("all")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatId = (id: string) => {
    return id.substring(0, 8).toUpperCase()
  }

  // Función para abrir el modal de detalles
  const handleOpenDetailModal = async (notificationId: string) => {
    setSelectedNotificationForDetail(notificationId)
    setIsLoadingDetail(true)
    setNotificationDetail(null)
    
    try {
      const response = await getNotificationDetail(notificationId)
      
      if (response.success && response.data) {
        setNotificationDetail(response.data)
      } else {
        toast({
          title: "Error",
          description: response.error || "Error al cargar el detalle de la notificación",
          variant: "destructive"
        })
        setSelectedNotificationForDetail(null)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión al cargar el detalle",
        variant: "destructive"
      })
      setSelectedNotificationForDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Función para cerrar el modal de detalles
  const handleCloseDetailModal = () => {
    setSelectedNotificationForDetail(null)
    setNotificationDetail(null)
    setIsLoadingDetail(false)
  }

  if (isLoading) {
    return (
      <>
        <header className="border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <h1 className="text-xl font-medium text-orange-700">Notificaciones</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-4" />
            <p>Cargando notificaciones...</p>
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <header className="border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <h1 className="text-xl font-medium text-orange-700">Notificaciones</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="border border-red-200 rounded-md p-8 text-center bg-red-50">
              <Bell className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Error al cargar notificaciones
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button 
                onClick={loadNotifications}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </main>
      </>
    )
  }

  const unreadNotifications = notifications.filter(n => !n.read).length
  const hasActiveFilters = filter !== "all" || hospedajeFilter !== "all"

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-orange-700">
              Notificaciones
              {hospedajeFilter !== "all" && (
                <span className="text-base font-normal text-gray-600">
                  {" "}→ {hospedajeFilter}
                </span>
              )}
            </h1>
            {unreadNotifications > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {unreadNotifications} no leídas
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadNotifications === 0 || markingAllAsRead}
            >
              {markingAllAsRead ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {markingAllAsRead ? "Marcando..." : "Marcar todas como leídas"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Filtros */}
          <div className="border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Filtros de estado de lectura */}
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Todas ({notifications.length})
                </Button>
                <Button
                  variant={filter === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("unread")}
                >
                  No leídas ({unreadNotifications})
                </Button>
                <Button
                  variant={filter === "read" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("read")}
                >
                  Leídas ({notifications.length - unreadNotifications})
                </Button>

                {/* Separador */}
                <div className="h-6 w-px bg-gray-300" />

                {/* Filtro por hospedaje */}
                <div className="flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-gray-500" />
                  <Select value={hospedajeFilter} onValueChange={setHospedajeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por hospedaje" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los hospedajes</SelectItem>
                      {uniqueHospedajes.length > 0 ? (
                        uniqueHospedajes.map((hospedaje) => (
                          <SelectItem key={hospedaje} value={hospedaje}>
                            {hospedaje}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-hospedajes" disabled>
                          No hay hospedajes con notificaciones
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón limpiar filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {selectedNotifications.length > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {selectedNotifications.length} seleccionadas
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar seleccionadas
                  </Button>
                </div>
              )}
            </div>

            {/* Mostrar filtros activos */}
            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-blue-100">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Filter className="h-4 w-4" />
                  <span>Filtros activos:</span>
                  {filter !== "all" && (
                    <Badge variant="outline" className="bg-blue-50">
                      {filter === "unread" ? "No leídas" : "Leídas"}
                    </Badge>
                  )}
                  {hospedajeFilter !== "all" && (
                    <Badge variant="outline" className="bg-blue-50">
                      {hospedajeFilter}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Información de paginación y controles superiores */}
          {totalItems > 0 && (
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} notificaciones
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mostrar:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">por página</span>
                </div>
              </div>

              {/* Controles de paginación superiores */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber: number
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Lista de notificaciones */}
          <div className="space-y-4">
            {totalItems === 0 ? (
              <div className="border border-gray-200 rounded-md p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay notificaciones
                </h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters 
                    ? "No hay notificaciones que coincidan con los filtros seleccionados."
                    : filter === "all" 
                      ? "No tienes notificaciones en este momento."
                      : filter === "unread" 
                        ? "No tienes notificaciones sin leer."
                        : "No tienes notificaciones leídas."
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={handleClearFilters} variant="outline">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              paginatedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-md p-4 transition-colors ${
                    notification.read
                      ? "border-gray-200 bg-white"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-xl">
                          {getCategoryIcon(notification.category)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={getCategoryColor(notification.category)}
                        >
                          {notification.category === "reservation" && "Reserva"}
                          {notification.category === "payment" && "Pago"}
                          {notification.category === "system" && "Sistema"}
                          {notification.category === "accommodation" && "Hospedaje"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={getTypeColor(notification.type)}
                        >
                          {notification.type}
                        </Badge>
                        {notification.hospedaje && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <Hotel className="h-3 w-3 mr-1" />
                            {notification.hospedaje}
                          </Badge>
                        )}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-400">
                          ID: {formatId(notification.id)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailModal(notification.id)}
                            title="Ver detalles completos"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          
                          {notification.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsUnread(notification.id)}
                              disabled={markingAsRead === notification.id}
                              title="Marcar como no leída"
                            >
                              {markingAsRead === notification.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markingAsRead === notification.id}
                              title="Marcar como leída"
                            >
                              {markingAsRead === notification.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Controles de paginación inferiores */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNumber: number
                  if (totalPages <= 7) {
                    pageNumber = i + 1
                  } else if (currentPage <= 4) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + i
                  } else {
                    pageNumber = currentPage - 3 + i
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-10 h-8"
                    >
                      {pageNumber}
                    </Button>
                  )
                })}
                
                {totalPages > 7 && currentPage < totalPages - 3 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className="w-10 h-8"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="ml-4 text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalles de notificación */}
      <Dialog open={selectedNotificationForDetail !== null} onOpenChange={handleCloseDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {notificationDetail?.titulo || "Detalle de Notificación"}
            </DialogTitle>
            <DialogDescription>
              {notificationDetail && (
                <span className="text-sm text-gray-600">
                  {formatDate(notificationDetail.createdAt)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-4" />
                <p>Cargando detalles...</p>
              </div>
            ) : notificationDetail ? (
              <div className="space-y-4">
                {/* Contenido detallado */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Detalles Completos</h4>
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {notificationDetail.cuerpoDetallado}
                  </div>
                </div>

                {/* Información adicional si está disponible */}
                {notificationDetail.data && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {notificationDetail.data.codigoReserva && (
                        <div>
                          <span className="font-medium text-gray-600">Código de Reserva:</span>
                          <p className="text-gray-900">{notificationDetail.data.codigoReserva}</p>
                        </div>
                      )}
                      {notificationDetail.data.hospedaje && (
                        <div>
                          <span className="font-medium text-gray-600">Hospedaje:</span>
                          <p className="text-gray-900">{notificationDetail.data.hospedaje}</p>
                        </div>
                      )}
                      {notificationDetail.data.habitacion && (
                        <div>
                          <span className="font-medium text-gray-600">Habitación:</span>
                          <p className="text-gray-900">{notificationDetail.data.habitacion}</p>
                        </div>
                      )}
                      {notificationDetail.data.nombreHuesped && (
                        <div>
                          <span className="font-medium text-gray-600">Huésped:</span>
                          <p className="text-gray-900">{notificationDetail.data.nombreHuesped}</p>
                        </div>
                      )}
                      {notificationDetail.data.emailHuesped && (
                        <div>
                          <span className="font-medium text-gray-600">Email:</span>
                          <p className="text-gray-900">{notificationDetail.data.emailHuesped}</p>
                        </div>
                      )}
                      {notificationDetail.data.monto && (
                        <div>
                          <span className="font-medium text-gray-600">Monto:</span>
                          <p className="text-gray-900">
                            ${notificationDetail.data.monto.toLocaleString('es-AR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones del modal */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseDetailModal}>
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No se pudieron cargar los detalles de la notificación.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 