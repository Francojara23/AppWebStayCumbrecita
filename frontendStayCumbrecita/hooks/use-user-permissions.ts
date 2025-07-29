import { useState, useEffect } from 'react'
import { useUser } from './use-user'
import { api } from '@/lib/api/client'

interface UserPermissions {
  isOwner: boolean // Es propietario de al menos un hospedaje
  isAdmin: boolean // Es empleado ADMIN de al menos un hospedaje
  hasAdminAccess: boolean // Es propietario O empleado ADMIN (acceso a rutas restringidas)
  ownedHospedajes: string[] // IDs de hospedajes donde es propietario
  adminHospedajes: string[] // IDs de hospedajes donde es empleado ADMIN
  isLoading: boolean
  error: string | null
}

export function useUserPermissions(): UserPermissions {
  const { user, isLoading: userLoading } = useUser()
  const [permissions, setPermissions] = useState<UserPermissions>({
    isOwner: false,
    isAdmin: false,
    hasAdminAccess: false,
    ownedHospedajes: [],
    adminHospedajes: [],
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const checkPermissions = async () => {
      if (userLoading || !user) {
        setPermissions(prev => ({ ...prev, isLoading: userLoading }))
        return
      }

      try {
        setPermissions(prev => ({ ...prev, isLoading: true, error: null }))

        // 1. Verificar hospedajes donde es propietario
        const hospedajesResponse = await api.get('/hospedajes/mis-propiedades')
        const ownedHospedajes = hospedajesResponse.data?.data || []
        const ownedIds = ownedHospedajes.map((h: any) => h.id)

        // 2. Verificar hospedajes donde es empleado ADMIN
        let adminHospedajes: string[] = []
        try {
          const empleadosResponse = await api.get('/empleados/mis-empleos')
          const empleos = empleadosResponse.data || []
          
          // Filtrar solo empleos con rol ADMIN
          adminHospedajes = empleos
            .filter((empleo: any) => empleo.rol?.nombre === 'ADMIN')
            .map((empleo: any) => empleo.hospedaje?.id)
            .filter(Boolean)
        } catch (empleadosError) {
          // Si falla la consulta de empleados, continuar sin error
          console.log('No se pudieron obtener empleos:', empleadosError)
        }

        // ✅ CORREGIDO: Se puede ser owner de DOS formas:
        // 1. Tener hospedajes existentes (ownedIds.length > 0)
        // 2. Tener rol PROPIETARIO (user.originalRole === 'PROPIETARIO')
        const isOwner = ownedIds.length > 0 || user.originalRole === 'PROPIETARIO'
        const isAdmin = adminHospedajes.length > 0
        const hasAdminAccess = isOwner || isAdmin

        setPermissions({
          isOwner,
          isAdmin,
          hasAdminAccess,
          ownedHospedajes: ownedIds,
          adminHospedajes,
          isLoading: false,
          error: null
        })

        console.log('🔐 Permisos del usuario:', {
          userId: user.id,
          userRole: user.originalRole,
          isOwner,
          isOwnerByRole: user.originalRole === 'PROPIETARIO',
          isOwnerByProperties: ownedIds.length > 0,
          isAdmin,
          hasAdminAccess,
          ownedHospedajes: ownedIds.length,
          adminHospedajes: adminHospedajes.length
        })

      } catch (error) {
        console.error('Error verificando permisos:', error)
        setPermissions(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error al verificar permisos'
        }))
      }
    }

    checkPermissions()
  }, [user, userLoading])

  return permissions
}

// Hook específico para verificar si el usuario es propietario de un hospedaje específico
export function useIsHospedajeOwner(hospedajeId: string | undefined): boolean {
  const { ownedHospedajes, isLoading } = useUserPermissions()
  
  if (isLoading || !hospedajeId) return false
  return ownedHospedajes.includes(hospedajeId)
}

// Hook para verificar si el usuario puede administrar un hospedaje específico
// (es propietario O es empleado ADMIN del hospedaje)
export function useCanManageHospedaje(hospedajeId: string | undefined): boolean {
  const { ownedHospedajes, adminHospedajes, isLoading } = useUserPermissions()
  
  if (isLoading || !hospedajeId) return false
  
  const isOwner = ownedHospedajes.includes(hospedajeId)
  const isAdmin = adminHospedajes.includes(hospedajeId)
  
  return isOwner || isAdmin
} 