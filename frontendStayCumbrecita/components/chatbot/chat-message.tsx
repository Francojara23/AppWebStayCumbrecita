"use client"

import { renderChatMessage } from "./message-renderer"

interface ChatMessage {
  id: string
  message: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatMessageProps {
  message: ChatMessage
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          message.role === "user"
            ? "bg-[#CD6C22] text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <div className="text-sm">{renderChatMessage(message.message)}</div>
        <p
          className={`text-xs mt-1 ${
            message.role === "user" ? "text-orange-100" : "text-gray-700"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}

// Export type for use in other components
export type { ChatMessage as ChatMessageType } 