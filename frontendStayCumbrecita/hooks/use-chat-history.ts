"use client"

import { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from '@/lib/utils/api-urls'

// Tipos para el historial de conversaciones
export interface ConversationSummary {
  hospedajeId: string
  hospedajeName: string
  sessionId: string
  lastMessageDate: string
  messageCount: number
  firstMessage: string
  lastMessage: string
}

export interface ConversationMessage {
  id: string
  message: string
  role: 'user' | 'assistant'
  timestamp: string
}

export interface ConversationDetail {
  hospedajeId: string
  hospedajeName: string
  sessionId: string
  messages: ConversationMessage[]
}

export interface ConversationsResponse {
  conversations: ConversationSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseChatHistoryReturn {
  conversations: ConversationSummary[]
  isLoading: boolean
  error: string | null
  total: number
  page: number
  totalPages: number
  fetchConversations: (page?: number, limit?: number) => Promise<void>
  getConversationDetail: (hospedajeId: string, sessionId: string) => Promise<ConversationDetail | null>
  refresh: () => Promise<void>
}

export function useChatHistory(): UseChatHistoryReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  const fetchConversations = useCallback(async (pageParam: number = 1, limit: number = 10) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Obteniendo conversaciones del usuario...', { page: pageParam, limit })

      const apiUrl = getApiUrl()
      const response = await fetch(
        `${apiUrl}/chatbot/my-conversations?page=${pageParam}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Importante: incluir cookies HTTP-only
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Error obteniendo conversaciones:', response.status, errorData)
        throw new Error(`Error ${response.status}: ${errorData}`)
      }

      const data: ConversationsResponse = await response.json()
      console.log('✅ Conversaciones obtenidas:', data)

      setConversations(data.conversations)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)

    } catch (err) {
      console.error('❌ Error en fetchConversations:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setConversations([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getConversationDetail = useCallback(async (
    hospedajeId: string, 
    sessionId: string
  ): Promise<ConversationDetail | null> => {
    try {
      console.log('📖 Obteniendo detalle de conversación...', { hospedajeId, sessionId })

      const apiUrl = getApiUrl()
      const response = await fetch(
        `${apiUrl}/chatbot/conversation/${hospedajeId}/${sessionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Importante: incluir cookies HTTP-only
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Error obteniendo detalle:', response.status, errorData)
        throw new Error(`Error ${response.status}: ${errorData}`)
      }

      const data: ConversationDetail = await response.json()
      console.log('✅ Detalle de conversación obtenido:', data)

      return data

    } catch (err) {
      console.error('❌ Error en getConversationDetail:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      return null
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchConversations(page)
  }, [fetchConversations, page])

  // Cargar conversaciones al montar el hook
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    isLoading,
    error,
    total,
    page,
    totalPages,
    fetchConversations,
    getConversationDetail,
    refresh,
  }
}