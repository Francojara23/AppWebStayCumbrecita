import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { toast } from '@/hooks/use-toast'
import type { 
  LoginRequest, 
  LoginResponse, 
  TouristRegisterRequest,
  AdminRegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserProfile
} from '@/lib/types/api'

// Hook para login universal (tanto admin como turista)
export const useLogin = () => {
  const { login } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials)
      return response.data
    },
    onSuccess: (data: LoginResponse) => {
      // Determinar tipo de usuario basado en roles
      const userRoles = data.user.roles?.map((r: any) => r.nombre) || []
      const isAdmin = userRoles.includes('PROPIETARIO') || userRoles.includes('EMPLEADO') || userRoles.includes('SUPER-ADMIN')
      const isTourist = userRoles.includes('TURISTA')
      
      login(data.user, data.token)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      
      toast({
        title: 'Inicio de sesión exitoso',
        description: `Bienvenido, ${data.user.nombre}`,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al iniciar sesión'
      toast({
        title: 'Error de autenticación',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para registro de turistas (sin dirección)
export const useTouristRegister = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userData: TouristRegisterRequest) => {
      const response = await api.post<RegisterResponse>('/auth/register', userData)
      return response.data
    },
    onSuccess: (data: RegisterResponse) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast({
        title: 'Registro exitoso',
        description: data.message,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrarse'
      toast({
        title: 'Error de registro',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para registro de admins (con dirección)
export const useAdminRegister = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userData: AdminRegisterRequest) => {
      const response = await api.post<RegisterResponse>('/auth/register', userData)
      return response.data
    },
    onSuccess: (data: RegisterResponse) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast({
        title: 'Registro exitoso',
        description: data.message,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrarse'
      toast({
        title: 'Error de registro',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook genérico de registro (mantener compatibilidad)
export const useRegister = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userData: TouristRegisterRequest | AdminRegisterRequest) => {
      const response = await api.post<RegisterResponse>('/auth/register', userData)
      return response.data
    },
    onSuccess: (data: RegisterResponse) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast({
        title: 'Registro exitoso',
        description: data.message,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrarse'
      toast({
        title: 'Error de registro',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para logout
export const useLogout = () => {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      // El logout se maneja localmente, no hay endpoint específico
      return Promise.resolve()
    },
    onSuccess: () => {
      logout()
      queryClient.clear() // Limpiar todas las queries
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      })
    }
  })
}

// Hook para obtener perfil del usuario
export const useProfile = () => {
  const { user, isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      const response = await api.get<UserProfile>('/auth/me')
      return response.data
    },
    enabled: isAuthenticated && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para cambiar contraseña
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const response = await api.patch('/auth/password', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña se ha cambiado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al cambiar contraseña'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para solicitar reset de contraseña
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      const response = await api.post('/auth/password/forgot', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Email enviado',
        description: 'Revisa tu correo para restablecer tu contraseña',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al enviar email'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para resetear contraseña
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      const response = await api.post('/auth/password/reset', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Contraseña restablecida',
        description: 'Tu contraseña se ha restablecido correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al restablecer contraseña'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para actualizar perfil
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await api.patch('/auth/me', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
      toast({
        title: 'Perfil actualizado',
        description: 'Tu perfil se ha actualizado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar perfil'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para actualizar foto de perfil
export const useUpdateProfileImage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await api.upload('/auth/meImagenUpdate', file)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil se ha actualizado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar foto'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para verificar email
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.get(`/auth/verify-email?token=${token}`)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Email verificado',
        description: 'Tu email ha sido verificado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al verificar email'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para reenviar email de verificación
export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/verify-email/resend')
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Email reenviado',
        description: 'Se ha reenviado el email de verificación',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al reenviar email'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para refrescar token
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/refresh')
      return response.data
    },
    onSuccess: (data: any) => {
      // El token se actualiza automáticamente por el interceptor
      console.log('Token refrescado exitosamente')
    },
    onError: (error: any) => {
      console.error('Error al refrescar token:', error)
    }
  })
} 