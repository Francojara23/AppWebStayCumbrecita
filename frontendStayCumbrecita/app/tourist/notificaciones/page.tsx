"use client"

import { useState, useEffect } from "react"
import { SectionBanner } from "@/components/tourist/section-banner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Bell, CheckCircle, AlertCircle, Info, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { 
  useNotificacionesUsuario, 
  useMarcarNotificacionLeida, 
  useMarcarTodasNotificacionesLeidas,
  useEliminarNotificacion 
} from "@/hooks/use-api"

// Tipo para el backend
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

// Tipo para la UI (compatible con el componente existente)
interface UINotification {
  id: string
  title: string
  message: string
  date: Date
  type: "info" | "success" | "warning"
  read: boolean
  details?: string
}

export default function NotificacionesPage() {
  // Usar el hook useUser para obtener el usuario autenticado
  const { user } = useUser()

  // Hook para obtener notificaciones del backend
  const { data: notificacionesData, isLoading, error } = useNotificacionesUsuario(user?.id)

  // Hooks para mutations de notificaciones
  const marcarNotificacionLeida = useMarcarNotificacionLeida()
  const marcarTodasLeidas = useMarcarTodasNotificacionesLeidas()
  const eliminarNotificacion = useEliminarNotificacion()

  // Función para formatear los datos de la notificación de manera legible
  const formatNotificationData = (data: any): string => {
    if (!data || typeof data !== 'object') {
      return ''
    }

    // Función helper para formatear fechas
    const formatDate = (dateString: string) => {
      try {
        return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es })
      } catch {
        return dateString
      }
    }

    // Función helper para formatear montos
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(amount)
    }

    let formattedDetails = ''

    // Formatear información de reserva
    if (data.reservaId) {
      formattedDetails += '📋 DETALLES DE LA RESERVA\n\n'
      
      if (data.hospedaje) {
        formattedDetails += `🏨 Hospedaje: ${data.hospedaje}\n`
      }
      
      if (data.habitacion) {
        formattedDetails += `🛏️ Habitación: ${data.habitacion}\n`
      }
      
      if (data.fechaInicio && data.fechaFin) {
        formattedDetails += `📅 Fechas: ${formatDate(data.fechaInicio)} - ${formatDate(data.fechaFin)}\n`
      }
      
      if (data.cantidadHuespedes) {
        formattedDetails += `👥 Huéspedes: ${data.cantidadHuespedes} ${data.cantidadHuespedes === 1 ? 'persona' : 'personas'}\n`
      }
      
      if (data.monto) {
        formattedDetails += `💰 Monto: ${formatAmount(data.monto)}\n`
      }
      
      formattedDetails += `🆔 ID de Reserva: ${data.reservaId.substring(0, 8).toUpperCase()}\n`
      
      // Agregar información del QR si está disponible
      if (data.mensajeQr) {
        formattedDetails += `\n${data.mensajeQr}\n`
      } else if (data.codigoQrUrl) {
        // Si hay QR pero no mensaje específico, agregar mensaje genérico
        formattedDetails += `\n📱 Tu código QR para check-in fue enviado por email. Preséntalo en la recepción el día de tu llegada.\n`
      }
    }

    // Formatear información de pago
    if (data.pagoId) {
      formattedDetails += '\n💳 INFORMACIÓN DE PAGO\n\n'
      
      if (data.monto) {
        formattedDetails += `💰 Monto: ${formatAmount(data.monto)}\n`
      }
      
      if (data.metodoPago) {
        formattedDetails += `💳 Método: ${data.metodoPago}\n`
      }
      
      if (data.estado) {
        formattedDetails += `📊 Estado: ${data.estado}\n`
      }
      
      formattedDetails += `🆔 ID de Pago: ${data.pagoId.substring(0, 8).toUpperCase()}\n`
    }

    // Si no es información de reserva ni pago, formatear campos genéricos
    if (!data.reservaId && !data.pagoId) {
      const fieldLabels: Record<string, string> = {
        hospedaje: '🏨 Hospedaje',
        habitacion: '🛏️ Habitación',
        fechaInicio: '📅 Fecha de inicio',
        fechaFin: '📅 Fecha de fin',
        monto: '💰 Monto',
        cantidadHuespedes: '👥 Huéspedes',
        estado: '📊 Estado',
        metodoPago: '💳 Método de pago'
      }

      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const label = fieldLabels[key] || key
          let formattedValue = value

          // Formatear valores específicos
          if (key === 'monto' && typeof value === 'number') {
            formattedValue = formatAmount(value)
          } else if ((key === 'fechaInicio' || key === 'fechaFin') && typeof value === 'string') {
            formattedValue = formatDate(value)
          } else if (key === 'cantidadHuespedes') {
            formattedValue = `${value} ${value === 1 ? 'persona' : 'personas'}`
          }

          formattedDetails += `${label}: ${formattedValue}\n`
        }
      })
    }

    return formattedDetails.trim()
  }

  // Función para transformar datos del backend a formato UI
  const transformBackendNotification = (backendNotif: BackendNotification): UINotification => {
    // Mapear tipos del backend a tipos de la UI
    const typeMap: Record<string, "info" | "success" | "warning"> = {
      "INFO": "info",
      "SUCCESS": "success", 
      "WARNING": "warning",
      "ERROR": "warning" // Tratamos ERROR como warning en la UI
    }

    // Formatear los detalles de manera legible
    const formattedDetails = backendNotif.data ? formatNotificationData(backendNotif.data) : backendNotif.cuerpo

    return {
      id: backendNotif.id,
      title: backendNotif.titulo,
      message: backendNotif.cuerpo,
      date: new Date(backendNotif.createdAt),
      type: typeMap[backendNotif.tipo] || "info",
      read: backendNotif.leida,
      details: formattedDetails || backendNotif.cuerpo
    }
  }

  // Procesar notificaciones para el formato UI
  const notifications: UINotification[] = notificacionesData?.map(transformBackendNotification) || []

  // Mostrar error si hay
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive"
      })
    }
  }, [error])

  // Datos hardcodeados como fallback (se pueden eliminar después)
  const fallbackNotifications: UINotification[] = [
    {
      id: "notif-1",
      title: "Reserva confirmada",
      message: "Tu reserva #RES-001 en Hotel Las Cascadas ha sido confirmada. ¡Disfruta tu estadía!",
      date: new Date("2024-04-28"),
      type: "success",
      read: false,
      details:
        "Tu reserva #RES-001 en Hotel Las Cascadas ha sido confirmada para el período del 15 al 20 de mayo de 2024. La habitación asignada es 'Suite Deluxe' con vista a la montaña. El check-in está programado a partir de las 14:00 hrs y el check-out hasta las 11:00 hrs. Recuerda llevar tu identificación y la tarjeta con la que realizaste el pago. ¡Esperamos que disfrutes tu estadía!",
    },
    {
      id: "notif-2",
      title: "Pago recibido",
      message: "Hemos recibido tu pago de $5000 para la reserva #RES-001. Gracias por tu preferencia.",
      date: new Date("2024-04-28"),
      type: "info",
      read: false,
      details:
        "Confirmamos que hemos recibido tu pago de $5000 ARS para la reserva #RES-001 en Hotel Las Cascadas. El pago fue procesado correctamente el 28/04/2024 a las 15:32 hrs mediante tarjeta de crédito terminada en 4567. Este pago corresponde al 50% del total de tu reserva. El monto restante deberá ser abonado al momento del check-in. Tu comprobante de pago ha sido enviado a tu correo electrónico registrado.",
    },
    {
      id: "notif-3",
      title: "Recordatorio de check-in",
      message: "Tu check-in en Hotel Las Cascadas está programado para mañana a las 14:00 hrs.",
      date: new Date("2024-04-30"),
      type: "info",
      read: false,
      details:
        "Te recordamos que tu check-in en Hotel Las Cascadas está programado para mañana 01/05/2024 a partir de las 14:00 hrs. Tu reserva #RES-001 incluye 1 habitación 'Suite Deluxe' para 2 personas por 5 noches. La dirección del hotel es Av. de las Cascadas 123, La Cumbrecita. Si necesitas indicaciones o tienes alguna solicitud especial, puedes contactar directamente al hotel al +54 3546 123456. ¡Esperamos recibirte pronto!",
    },
    {
      id: "notif-4",
      title: "Opinión publicada",
      message: "Tu opinión sobre Brisas del Champaquí ha sido publicada. ¡Gracias por compartir tu experiencia!",
      date: new Date("2024-03-25"),
      type: "success",
      read: true,
      details:
        "Tu opinión sobre Brisas del Champaquí ha sido publicada exitosamente. Calificaste al alojamiento con 4.5 estrellas y destacaste la atención del personal y las vistas panorámicas. Tu experiencia ayudará a otros viajeros a tomar mejores decisiones. Como agradecimiento por compartir tu opinión, has recibido 100 puntos en nuestro programa de fidelidad que podrás utilizar en tu próxima reserva.",
    },
    {
      id: "notif-5",
      title: "Cambio en tu reserva",
      message: "Ha habido un cambio en tu reserva #RES-008. Por favor, contacta con el hotel para más información.",
      date: new Date("2024-04-20"),
      type: "warning",
      read: true,
      details:
        "Hemos detectado un cambio en tu reserva #RES-008 en Posada del Valle. Debido a trabajos de mantenimiento imprevistos, la habitación 'Junior Suite' que habías reservado no estará disponible durante tu estadía. El hotel ha ofrecido como alternativa una actualización sin costo adicional a la 'Suite Ejecutiva', que cuenta con más espacio y mejores vistas. Por favor, contacta directamente con el hotel al +54 3546 789012 para confirmar este cambio o discutir otras opciones disponibles.",
    },
  ]

  // Estado para el modal
  const [selectedNotification, setSelectedNotification] = useState<UINotification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Marcar notificación como leída
  const markAsRead = async (id: string) => {
    try {
      await marcarNotificacionLeida.mutateAsync({ id, leida: true })
    } catch (error) {
      // Error silencioso
    }
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      await marcarTodasLeidas.mutateAsync()
    } catch (error) {
      // Error silencioso
    }
  }

  // Eliminar notificación
  const deleteNotification = async (id: string) => {
    try {
      await eliminarNotificacion.mutateAsync(id)
    } catch (error) {
      // Error silencioso
    }
  }

  // Abrir modal con detalles de la notificación
  const openNotificationDetails = (notification: UINotification) => {
    setSelectedNotification(notification)
    setIsModalOpen(true)

    // Marcar como leída si no lo estaba
    if (!notification.read) {
      markAsRead(notification.id)
      
      // Actualizar estado local inmediatamente para mejor UX
      notification.read = true
    }
  }

  // Filtrar notificaciones
  const unreadNotifications = notifications.filter((notification) => !notification.read)
  const readNotifications = notifications.filter((notification) => notification.read)

  // Renderizar icono según el tipo
  const renderIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  // Componente para el botón de eliminar
  const DeleteButton = ({ notificationId }: { notificationId: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-gray-700"
      disabled={eliminarNotificacion.isPending}
      onClick={(e) => {
        e.stopPropagation() // Evitar que se abra el modal
        deleteNotification(notificationId)
      }}
    >
      {eliminarNotificacion.isPending ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
      ) : (
        <X className="h-4 w-4" />
      )}
    </Button>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner
        imageSrc="/tourist/cumbrecita012.jpg"
        imageAlt="La Cumbrecita"
        title="Notificaciones"
        description="Mantente al día con tus reservas, pagos y actualizaciones importantes"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-orange-500 mr-2" />
            <h2 className="text-xl font-semibold">Tus notificaciones</h2>
          </div>
          {unreadNotifications.length > 0 && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={marcarTodasLeidas.isPending}
            >
              {marcarTodasLeidas.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                  Marcando...
                </>
              ) : (
                "Marcar todas como leídas"
              )}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando notificaciones...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="no-leidas">
            <TabsList className="mb-6">
              <TabsTrigger value="no-leidas">
                No leídas {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
              </TabsTrigger>
              <TabsTrigger value="leidas">Leídas</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
            </TabsList>

          <TabsContent value="no-leidas">
            {unreadNotifications.length > 0 ? (
              <div className="space-y-4">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start p-4 border rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
                    onClick={() => openNotificationDetails(notification)}
                  >
                    <div className="mr-3 mt-1">{renderIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{notification.title}</h3>
                        <span className="text-xs text-gray-500">
                          {format(notification.date, "d MMM", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <DeleteButton notificationId={notification.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No tienes notificaciones sin leer</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leidas">
            {readNotifications.length > 0 ? (
              <div className="space-y-4">
                {readNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openNotificationDetails(notification)}
                  >
                    <div className="mr-3 mt-1">{renderIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{notification.title}</h3>
                        <span className="text-xs text-gray-500">
                          {format(notification.date, "d MMM", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <DeleteButton notificationId={notification.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No tienes notificaciones leídas</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="todas">
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-4 border rounded-lg ${
                      !notification.read ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-gray-50"
                    } transition-colors cursor-pointer`}
                    onClick={() => openNotificationDetails(notification)}
                  >
                    <div className="mr-3 mt-1">{renderIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{notification.title}</h3>
                        <span className="text-xs text-gray-500">
                          {format(notification.date, "d MMM", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <DeleteButton notificationId={notification.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No tienes notificaciones</p>
              </div>
            )}
          </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Modal de detalles de notificación */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {renderIcon(selectedNotification.type)}
                  <DialogTitle>{selectedNotification.title}</DialogTitle>
                </div>
                <p className="text-xs text-gray-500">
                  {format(selectedNotification.date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </DialogHeader>

              <div className="py-4">
                <p className="text-gray-700 whitespace-pre-line">
                  {selectedNotification.details || selectedNotification.message}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
