"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Escribe tu mensaje..."
}: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSend = () => {
    if (!message.trim() || isLoading) return
    
    onSendMessage(message.trim())
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 focus:ring-2 focus:ring-[#CD6C22] focus:border-[#CD6C22]"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="bg-[#CD6C22] hover:bg-[#A83921] text-white px-6"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Presiona Enter para enviar, Shift+Enter para nueva línea
      </p>
    </div>
  )
} 