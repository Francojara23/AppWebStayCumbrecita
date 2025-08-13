"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useUser } from "@/hooks/use-user"
import { authUtils } from "@/lib/api/client"
import { useChatContext, type ChatContextMessage } from "@/hooks/useChatContext"
import type { ChatMessage } from "@/components/chatbot/chat-area"

interface ChatResponse {
  response: string
  session_id?: string
  hospedaje_id?: string
  query_type?: string
  response_time?: number
  context_used?: boolean
}

interface ChatbotConfig {
  hospedajeId: string
  hospedajeName: string
  context?: {
    fechaInicio?: string
    fechaFin?: string
    huespedes?: number
    habitaciones?: number
  }
}

interface UseChatbotProps {
  config: ChatbotConfig
  isOpen: boolean
}

const CHATBOT_API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://localhost:8000"

export function useChatbot({ config, isOpen }: UseChatbotProps) {
  const { user, isAuthenticated } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string>("")
  const hasRestoredMessagesRef = useRef<boolean>(false)
  // 🚫 Anti-doble-envío: bloqueo inmediato y ventana corta de idempotencia en UI
  const sendingRef = useRef<boolean>(false)
  const lastSendRef = useRef<{ hash: string; ts: number }>({ hash: "", ts: 0 })

  // 🆕 Hook del sistema híbrido de contexto
  const { 
    context, 
    addMessage, 
    extractAndUpdateDates, 
    clearContext,
    initializeWithURLParams,
    handleGeneralHospedajeQuery
  } = useChatContext(config.hospedajeId, isAuthenticated ? authUtils.getToken() : null, isAuthenticated)

  // Generar session ID único para cada conversación
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // 🆕 Restaurar mensajes del contexto híbrido (solo una vez al inicializar)
  useEffect(() => {
    if (
      context && 
      context.conversationHistory.length > 0 && 
      messages.length === 0 && 
      isOpen && 
      !hasRestoredMessagesRef.current
    ) {
      const restoredMessages: ChatMessage[] = context.conversationHistory.map(msg => ({
        id: msg.id,
        message: msg.message,
        role: msg.role,
        timestamp: msg.timestamp
      }))
      
      setMessages(restoredMessages)
      hasRestoredMessagesRef.current = true
      console.log('🔄 Mensajes restaurados del contexto híbrido:', restoredMessages.length)
    }
  }, [context?.conversationHistory.length, isOpen, messages.length])

  // 🆕 Inicializar contexto con parámetros del URL
  useEffect(() => {
    if (isOpen && config.context && context) {
      initializeWithURLParams({
        fechaInicio: config.context.fechaInicio,
        fechaFin: config.context.fechaFin,
        huespedes: config.context.huespedes,
        habitaciones: config.context.habitaciones
      })
    }
  }, [isOpen, config.context, context, initializeWithURLParams])

  // Inicializar sesión cuando se abre el chat
  const initializeChat = useCallback(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId()
    }
    
    // Solo limpiar mensajes si no hay contexto que restaurar
    if (!isAuthenticated && (!context || context.conversationHistory.length === 0)) {
      setMessages([])
      setError(null)
    }
  }, [isAuthenticated, generateSessionId, context])

  // Limpiar conversación (usado cuando se cierra el chat y usuario no logueado)
  const clearConversation = useCallback(() => {
    setMessages([])
    setError(null)
    sessionIdRef.current = ""
    hasRestoredMessagesRef.current = false // 🔧 Resetear flag de restauración
    clearContext() // 🆕 Limpiar contexto híbrido también
  }, [clearContext])

  // Enviar mensaje al chatbot
  const sendMessage = useCallback(async (message: string) => {
    const raw = message
    const trimmed = raw.trim()
    if (!trimmed || !context) return

    // Bloqueo inmediato para evitar carreras (Enter + click)
    if (sendingRef.current) return

    // Ventana corta de idempotencia en el cliente (2s por mensaje normalizado)
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ")
    const now = Date.now()
    const hash = normalize(trimmed)
    if (now - lastSendRef.current.ts < 2000 && lastSendRef.current.hash === hash) {
      console.warn("⛔ Mensaje duplicado ignorado (ventana 2s)")
      return
    }

    sendingRef.current = true
    lastSendRef.current = { hash, ts: now }
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: trimmed,
      role: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    // 🆕 Agregar al contexto híbrido
    const contextMessage: ChatContextMessage = {
      id: userMessage.id,
      message: userMessage.message,
      role: userMessage.role,
      timestamp: userMessage.timestamp
    }
    addMessage(contextMessage)

    try {
      // 🔧 Detectar y limpiar contexto para consultas generales del hospedaje
      handleGeneralHospedajeQuery(trimmed)

      // 🆕 Obtener token real (no como string)
      const realToken = isAuthenticated ? authUtils.getToken() : null

      // 🆕 Preparar request con contexto híbrido completo
      const chatRequest = {
        user_id: isAuthenticated ? user?.id || "anonymous" : "anonymous",
        message: trimmed,
        token: realToken, // Token real (null o string JWT)
        session_id: context.sessionId,
        context: context, // 🆕 Enviar contexto híbrido completo (ya limpiado si es consulta general)
        saveToHistory: isAuthenticated // Solo guardar si está logueado
      }

      console.log('🤖 Enviando mensaje al chatbot:', {
        user_id: chatRequest.user_id,
        message: message.trim(),
        token: realToken ? realToken.substring(0, 10) + "..." : null, // 🔧 null real, no string
        session_id: chatRequest.session_id,
        hasContext: !!chatRequest.context,
        contextQuery: context.currentQuery,
        conversationHistory: context.conversationHistory.length,
        saveToHistory: chatRequest.saveToHistory
      })

      const response = await fetch(`${CHATBOT_API_URL}/chat/${config.hospedajeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const chatResponse: ChatResponse = await response.json()
      
      console.log('🤖 Respuesta del chatbot:', chatResponse)

      // Agregar respuesta del bot
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: chatResponse.response,
        role: "assistant",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])

      // 🆕 Agregar respuesta al contexto híbrido
      const botContextMessage: ChatContextMessage = {
        id: botMessage.id,
        message: botMessage.message,
        role: botMessage.role,
        timestamp: botMessage.timestamp
      }
      addMessage(botContextMessage)

      // 🆕 Extraer y actualizar información contextual
      extractAndUpdateDates(trimmed, chatResponse.response)

    } catch (error) {
      console.error('Error enviando mensaje:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      
      // Agregar mensaje de error
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: `Lo siento, hubo un error procesando tu mensaje. ${errorMessage}`,
        role: "assistant",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorChatMessage])

      // 🆕 Agregar error al contexto híbrido también
      const errorContextMessage: ChatContextMessage = {
        id: errorChatMessage.id,
        message: errorChatMessage.message,
        role: errorChatMessage.role,
        timestamp: errorChatMessage.timestamp
      }
      addMessage(errorContextMessage)
    } finally {
      setIsLoading(false)
      sendingRef.current = false
      lastSendRef.current = { hash, ts: Date.now() }
    }
  }, [config, isAuthenticated, user, isLoading, context, addMessage, extractAndUpdateDates, handleGeneralHospedajeQuery])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    initializeChat,
    clearConversation,
    isAuthenticated,
    // 🆕 Información del contexto híbrido
    context,
    hasStoredContext: (context?.conversationHistory.length ?? 0) > 0,
    currentQuery: context?.currentQuery
  }
} 