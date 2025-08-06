"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageCircle, RefreshCw, Clock, MessageSquare, User, Bot } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { SectionBanner } from "@/components/tourist/section-banner"
import { useChatHistory } from "@/hooks/use-chat-history"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ConversationSummary, ConversationDetail } from "@/hooks/use-chat-history"

export default function ConsultasPage() {
  // Hook para obtener historial de conversaciones
  const { 
    conversations, 
    isLoading, 
    error, 
    total, 
    page, 
    totalPages, 
    fetchConversations, 
    getConversationDetail, 
    refresh 
  } = useChatHistory()

  // Estado para el diálogo de detalle de conversación
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Función para abrir el diálogo de detalle
  const openDetailDialog = async (conversation: ConversationSummary) => {
    setLoadingDetail(true)
    setIsDetailDialogOpen(true)
    
    try {
      const detail = await getConversationDetail(conversation.hospedajeId, conversation.sessionId)
      if (detail) {
        setSelectedConversation(detail)
      }
    } catch (error) {
      console.error('Error obteniendo detalle de conversación:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Función para formatear la fecha de manera relativa
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return format(date, "HH:mm", { locale: es })
    } else if (diffInHours < 168) { // Menos de una semana
      return format(date, "EEEE", { locale: es })
    } else {
      return format(date, "d MMM", { locale: es })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner 
        title="Mis Conversaciones" 
        description="Aquí puedes revisar todas las conversaciones que has tenido con los hospedajes."
        imageSrc="/bannerTuristaImagen.jpg"
        imageAlt="Banner de conversaciones"
      />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial de Conversaciones</h1>
          {total > 0 && (
            <p className="text-gray-600 text-sm mt-1">
              {total} conversación{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button 
          onClick={refresh}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 bg-gray-50 rounded-lg">
          <RefreshCw className="h-8 w-8 text-gray-400 mb-4 animate-spin" />
          <p className="text-gray-500">Cargando conversaciones...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 bg-gray-50 rounded-lg">
          <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No tienes conversaciones aún</p>
          <p className="text-sm text-gray-400 mt-2">
            Empieza a chatear con un hospedaje para ver tus conversaciones aquí
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Card
              key={`${conversation.hospedajeId}-${conversation.sessionId}`}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetailDialog(conversation)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                      {conversation.hospedajeName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(conversation.lastMessageDate)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {conversation.messageCount} mensaje{conversation.messageCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {conversation.firstMessage}
                </p>
              </CardContent>
              <CardFooter className="pt-2 text-xs text-gray-500">
                <div className="flex items-center justify-between w-full">
                  <span>Última actividad: {format(new Date(conversation.lastMessageDate), "d 'de' MMM, yyyy", { locale: es })}</span>
                  <span className="text-orange-600">Ver conversación →</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => fetchConversations(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => fetchConversations(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo para detalle de conversación */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              {selectedConversation?.hospedajeName || 'Conversación'}
            </DialogTitle>
            <DialogDescription>
              {selectedConversation && `Sesión: ${selectedConversation.sessionId}`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] py-4">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-500">Cargando conversación...</p>
              </div>
            ) : selectedConversation ? (
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.role === 'user' 
                        ? "bg-orange-50 ml-8" 
                        : "bg-gray-50 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Bot className="h-4 w-4 text-gray-600" />
                        )}
                        <p className="text-sm font-medium">
                          {message.role === 'user' ? 'Tú' : selectedConversation.hospedajeName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(message.timestamp), "d MMM, yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <MessageCircle className="h-8 w-8 text-gray-400 mb-4" />
                <p className="text-gray-500">No se pudo cargar la conversación</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
