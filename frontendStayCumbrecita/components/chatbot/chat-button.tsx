"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import ChatModal from "./chat-modal"

interface ChatButtonProps {
  hospedajeId: string
  hospedajeName: string
  variant?: "default" | "outline" | "icon"
  size?: "default" | "sm" | "lg"
  className?: string
}

export default function ChatButton({
  hospedajeId,
  hospedajeName,
  variant = "outline",
  size = "sm",
  className = ""
}: ChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const searchParams = useSearchParams()

  // Extraer contexto automático desde URL params
  const context = {
    fechaInicio: searchParams.get('fechaInicio') || undefined,
    fechaFin: searchParams.get('fechaFin') || undefined,
    huespedes: searchParams.get('huespedes') ? Number(searchParams.get('huespedes')) : undefined,
    habitaciones: searchParams.get('habitaciones') ? Number(searchParams.get('habitaciones')) : undefined
  }

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar propagación del evento si está dentro de otra acción
    setIsChatOpen(true)
  }

  const handleCloseChat = () => {
    setIsChatOpen(false)
  }

  if (variant === "icon") {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={handleOpenChat}
          className={`${className}`}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        
        <ChatModal
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          hospedajeId={hospedajeId}
          hospedajeName={hospedajeName}
          context={context}
        />
      </>
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenChat}
        className={`${className}`}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Asistente Virtual
      </Button>
      
      <ChatModal
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        hospedajeId={hospedajeId}
        hospedajeName={hospedajeName}
        context={context}
      />
    </>
  )
} 