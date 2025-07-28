import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from '@/hooks/use-toast'

// Tipos
export interface Hotel {
  id: string
  nombre: string
  descripcion: string
  direccion: string
  telefono: string
  email: string
  sitioWeb?: string
  checkInTime: string
  checkOutTime: string
  politicaCancelacion: string
  servicios: string[]
  imagenes: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CreateHotelRequest {
  nombre: string
  descripcion: string
  direccion: string
  telefono: string
  email: string
  sitioWeb?: string
  checkInTime: string
  checkOutTime: string
  politicaCancelacion: string
  servicios: string[]
}

interface UpdateHotelRequest extends Partial<CreateHotelRequest> {
  isActive?: boolean
}

// Hook para obtener todos los hoteles
export const useHotels = (params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) => {
  return useQuery({
    queryKey: ['hotels', params],
    queryFn: async () => {
      const response = await api.get('/hotels', params)
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Hook para obtener un hotel por ID
export const useHotel = (id: string) => {
  return useQuery({
    queryKey: ['hotels', id],
    queryFn: async () => {
      const response = await api.get(`/hotels/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para crear un hotel
export const useCreateHotel = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (hotelData: CreateHotelRequest) => {
      const response = await api.post<Hotel>('/hotels', hotelData)
      return response.data
    },
    onSuccess: (newHotel) => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      toast({
        title: 'Hotel creado',
        description: `El hotel "${newHotel.nombre}" se ha creado correctamente`,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear el hotel'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para actualizar un hotel
export const useUpdateHotel = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateHotelRequest }) => {
      const response = await api.put<Hotel>(`/hotels/${id}`, data)
      return response.data
    },
    onSuccess: (updatedHotel) => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      queryClient.invalidateQueries({ queryKey: ['hotels', updatedHotel.id] })
      toast({
        title: 'Hotel actualizado',
        description: `El hotel "${updatedHotel.nombre}" se ha actualizado correctamente`,
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el hotel'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para eliminar un hotel
export const useDeleteHotel = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hotels/${id}`)
      return id
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      queryClient.removeQueries({ queryKey: ['hotels', deletedId] })
      toast({
        title: 'Hotel eliminado',
        description: 'El hotel se ha eliminado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el hotel'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para subir imágenes del hotel
export const useUploadHotelImages = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ hotelId, files }: { hotelId: string; files: File[] }) => {
      const uploadPromises = files.map(file => 
        api.upload(`/hotels/${hotelId}/images`, file)
      )
      const responses = await Promise.all(uploadPromises)
      return responses.map(r => r.data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hotels', variables.hotelId] })
      toast({
        title: 'Imágenes subidas',
        description: 'Las imágenes se han subido correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al subir las imágenes'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para eliminar imagen del hotel
export const useDeleteHotelImage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ hotelId, imageUrl }: { hotelId: string; imageUrl: string }) => {
      const response = await api.post(`/hotels/${hotelId}/images/delete`, { imageUrl })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hotels', variables.hotelId] })
      toast({
        title: 'Imagen eliminada',
        description: 'La imagen se ha eliminado correctamente',
      })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar la imagen'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  })
}

// Hook para obtener estadísticas del hotel
export const useHotelStats = (hotelId: string) => {
  return useQuery({
    queryKey: ['hotels', hotelId, 'stats'],
    queryFn: async () => {
      const response = await api.get(`/hotels/${hotelId}/stats`)
      return response.data
    },
    enabled: !!hotelId,
    staleTime: 15 * 60 * 1000, // 15 minutos
  })
} 