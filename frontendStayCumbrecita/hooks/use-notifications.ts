"use client"

import { useState, useEffect } from "react"
import { getUserNotifications, type Notification } from "@/app/actions/notifications/getUserNotifications"
import { useUser } from "@/hooks/use-user"

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  refreshNotifications: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Obtener estado de autenticación
  const { isAuthenticated } = useUser()

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await getUserNotifications()
      
      if (response.success && response.data) {
        setNotifications(response.data)
      } else {
        setError(response.error || "Error al cargar notificaciones")
        setNotifications([])
      }
    } catch (err) {
      setError("Error de conexión")
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Solo cargar notificaciones si el usuario está autenticado
    if (isAuthenticated) {
      loadNotifications()
    } else {
      // Si no está autenticado, limpiar el estado
      setNotifications([])
      setIsLoading(false)
      setError(null)
    }
  }, [isAuthenticated])

  // Calcular el número de notificaciones no leídas
  const unreadCount = notifications.filter(notification => !notification.leida).length

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications: loadNotifications
  }
} 