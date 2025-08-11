"use client"

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/lib/utils/api-urls'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  dni?: string | null
  direccion?: string | null
  role: 'ADMIN' | 'TOURIST'
  fotoUrl?: string | null
  originalRole?: string
}

/**
 * Hook para obtener los datos del usuario autenticado desde el servidor
 * Usa user_info cookie como indicador de que hay sesión, pero siempre valida con el servidor
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  console.log('🔥 useUser ESTADO ACTUAL:', { user, isLoading })

  useEffect(() => {
    console.log('🌟 useUser useEffect INICIADO')
    let isMounted = true
    
    // Timeout de seguridad para evitar loading infinito
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ useUser TIMEOUT de 10 segundos alcanzado')
      if (isMounted) {
        setIsLoading(false)
      }
    }, 10000) // 10 segundos máximo

    // Función para limpiar cookies cuando la sesión no es válida
    const clearExpiredAuth = () => {
      // Solo podemos limpiar la cookie user_info (no httpOnly)
      document.cookie = 'user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    // Función para obtener datos de user_info como indicador inicial
    const getUserInfoFromCookie = () => {
      try {
        const cookies = document.cookie.split(';')
        const userInfoCookie = cookies.find(cookie => 
          cookie.trim().startsWith('user_info=')
        )

        if (userInfoCookie) {
          const userInfoValue = userInfoCookie.split('=')[1]
          const userData = JSON.parse(decodeURIComponent(userInfoValue))
          
          // Mapear el rol al formato esperado
          const originalRole = userData.role
          const mappedRole = originalRole === 'TURISTA' ? 'TOURIST' as const : 'ADMIN' as const
          
          return {
            ...userData,
            role: mappedRole,
            originalRole: originalRole
          }
        }
        return null
      } catch (error) {
        console.error('Error al obtener user_info desde cookies:', error)
        return null
      }
    }

    // Función para obtener datos frescos del servidor
    const getUserFromServer = async () => {
      try {
        // Usar la URL correcta según el contexto (cliente o servidor)
        const apiUrl = getApiUrl()
        console.log('🔍 DEBUG: Obteniendo usuario desde:', `${apiUrl}/auth/me`)
        
        // Hacer petición al servidor (el navegador enviará automáticamente las cookies httpOnly)
        const response = await fetch(`${apiUrl}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Importante: incluir cookies en la petición
          cache: "no-store",
        })

        console.log('📡 Respuesta del servidor /auth/me:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        })

        if (!response.ok) {
          // Si el servidor responde 401, el token expiró o no es válido
          if (response.status === 401) {
            console.log('🔐 Token expirado o inválido (401)')
            clearExpiredAuth()
          }
          return null
        }

        const profileData = await response.json()
        console.log('👤 Datos del perfil obtenidos:', profileData)
        
        // Mapear los datos del servidor al formato esperado
        const userRole = profileData.roles?.[0]?.nombre
        
        const mappedUser = {
          id: profileData.id,
          firstName: profileData.nombre,
          lastName: profileData.apellido,
          email: profileData.email,
          phone: profileData.telefono || null,
          dni: profileData.dni || null,
          direccion: profileData.direccion || null,
          role: userRole === 'TURISTA' ? 'TOURIST' as const : 'ADMIN' as const,
          fotoUrl: profileData.fotoUrl,
          originalRole: userRole
        }
        
        console.log('✅ Usuario mapeado:', mappedUser)
        return mappedUser
      } catch (error) {
        console.error('❌ Error al obtener datos del usuario desde servidor:', error)
        return null
      }
    }

    const loadUserData = async () => {
      try {
        console.log('🍪 DEBUG: Verificando cookies disponibles:', document.cookie)
        
        // Verificar si hay auth_token (más importante que user_info)
        const cookies = document.cookie.split(';')
        const authTokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('auth_token=')
        )
        const userInfoFromCookie = getUserInfoFromCookie()
        
        console.log('🔑 DEBUG: Cookies encontradas:', {
          authToken: !!authTokenCookie,
          userInfo: !!userInfoFromCookie,
          allCookies: cookies.map(c => c.trim().split('=')[0])
        })
        
        // Si no hay auth_token accesible desde JavaScript, usar getCurrentUser action
        // (Las cookies httpOnly no son accesibles desde JS del cliente)
        if (!authTokenCookie) {
          console.log('🔒 auth_token no accesible desde JS (probablemente httpOnly), usando server action...')
        } else {
          console.log('✅ auth_token encontrado, validando con servidor...')
        }

        // USAR SERVER ACTION para acceder a cookies httpOnly
        console.log('📡 Llamando a getCurrentUser server action...')
        const { getCurrentUser } = await import('@/app/actions/auth/getCurrentUser')
        const userResponse = await getCurrentUser()
        
        console.log('📡 Respuesta de getCurrentUser:', userResponse)

        if (isMounted) {
          if (userResponse.success && userResponse.data) {
            // Mapear los datos del server action al formato del hook
            const mappedUser = {
              id: userResponse.data.id,
              firstName: userResponse.data.nombre,
              lastName: userResponse.data.apellido,
              email: userResponse.data.email,
              phone: userResponse.data.telefono || null,
              dni: userResponse.data.dni || null,
              direccion: userResponse.data.direccion || null,
              role: userResponse.data.roles?.[0]?.nombre === 'TURISTA' ? 'TOURIST' as const : 'ADMIN' as const,
              fotoUrl: userResponse.data.fotoUrl,
              originalRole: userResponse.data.roles?.[0]?.nombre
            }
            
            console.log('✅ Usuario mapeado desde server action:', mappedUser)
            setUser(mappedUser)
          } else {
            console.log('❌ getCurrentUser falló:', userResponse.error)
            setUser(null)
            if (userResponse.shouldRedirectToHome) {
              // Limpiar cookies no válidas
              clearExpiredAuth()
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error)
        if (isMounted) {
          clearExpiredAuth()
        setUser(null)
        }
      } finally {
        if (isMounted) {
        setIsLoading(false)
        }
        clearTimeout(loadingTimeout)
      }
    }

    // Ejecutar carga inicial
    loadUserData()

    // Verificar estado de autenticación cada 5 minutos
    const interval = setInterval(() => {
      if (isMounted) {
        const userInfoFromCookie = getUserInfoFromCookie()
        if (!userInfoFromCookie) {
          setUser(null)
        } else {
          // Solo hacer verificación con el servidor si hay cookie
          getUserFromServer().then(serverUser => {
            if (isMounted) {
              if (!serverUser) {
                clearExpiredAuth()
        setUser(null)
      }
            }
          })
        }
      }
    }, 300000) // Verificar cada 5 minutos

    return () => {
      isMounted = false
      clearInterval(interval)
      clearTimeout(loadingTimeout)
    }
  }, []) // Sin dependencias para evitar bucle infinito

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'ADMIN'
  const isTourist = user?.role === 'TOURIST'

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isTourist,
  }
} 