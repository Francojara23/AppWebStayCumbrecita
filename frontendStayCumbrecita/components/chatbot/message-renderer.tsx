"use client"

import { ReactNode } from "react"

// 🔗 Función mejorada para renderizar mensajes con enlaces y formato Markdown
export function renderChatMessage(text: string): ReactNode {
  if (!text) return null

  // Primero procesar texto con formato Markdown básico y enlaces
  const parts = parseTextWithMarkdownAndLinks(text)
  
  return (
    <div className="space-y-1">
      {parts.map((part, index) => renderPart(part, index))}
    </div>
  )
}

interface TextPart {
  type: 'text' | 'link' | 'bold' | 'linebreak'
  content: string
  url?: string
}

function parseTextWithMarkdownAndLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  
  // Dividir por saltos de línea primero
  const lines = text.split('\n')
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push({ type: 'linebreak', content: '' })
    }
    
    if (!line.trim()) {
      parts.push({ type: 'text', content: ' ' })
      return
    }
    
    // Procesar cada línea buscando patrones
    let currentText = line
    let lastIndex = 0
    
    // Regex para detectar patrones (URLs, texto en negrita)
    const patterns = [
      { 
        regex: /\*\*(.*?)\*\*/g, 
        type: 'bold' as const 
      },
      { 
        regex: /(https?:\/\/[^\s\]]+)/g, 
        type: 'link' as const 
      },
      { 
        regex: /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, 
        type: 'markdown-link' as const 
      }
    ]
    
    // Encontrar todas las coincidencias y sus posiciones
    const matches: Array<{
      start: number
      end: number
      type: 'bold' | 'link' | 'markdown-link'
      content: string
      url?: string
    }> = []
    
    patterns.forEach(pattern => {
      let match
      // Crear nueva instancia del regex para evitar problemas con regex global
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
      
      while ((match = regex.exec(currentText)) !== null) {
        if (pattern.type === 'markdown-link') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'link',
            content: match[1], // Texto del enlace
            url: match[2] // URL
          })
        } else if (pattern.type === 'bold') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'bold',
            content: match[1] // Contenido sin los asteriscos
          })
        } else if (pattern.type === 'link') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'link',
            content: match[1],
            url: match[1]
          })
        }
      }
    })
    
    // Ordenar matches por posición
    matches.sort((a, b) => a.start - b.start)
    
    // Procesar texto dividiendo por matches
    let currentIndex = 0
    
    matches.forEach(match => {
      // Agregar texto antes del match
      if (match.start > currentIndex) {
        const textBefore = currentText.slice(currentIndex, match.start)
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore })
        }
      }
      
      // Agregar el match
      parts.push({
        type: match.type === 'bold' ? 'bold' : 'link',
        content: match.content,
        url: match.url
      })
      
      currentIndex = match.end
    })
    
    // Agregar texto restante SOLO si hubo matches
    if (matches.length > 0 && currentIndex < currentText.length) {
      const textAfter = currentText.slice(currentIndex)
      if (textAfter) {
        parts.push({ type: 'text', content: textAfter })
      }
    }
    
    // Si no hubo matches, agregar todo como texto
    if (matches.length === 0) {
      parts.push({ type: 'text', content: currentText })
    }
  })
  
  return parts
}

function renderPart(part: TextPart, index: number): ReactNode {
  switch (part.type) {
    case 'linebreak':
      return <br key={index} />
    
    case 'bold':
      return (
        <strong key={index} className="font-semibold">
          {part.content}
        </strong>
      )
    
    case 'link':
      const url = part.url || part.content
      const displayUrl = url.startsWith('http') ? url : `http://${url}`
      
      return (
        <a
          key={index}
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all font-medium transition-colors"
          onClick={(e) => {
            console.log('🔗 Link clickeado:', displayUrl)
          }}
        >
          {part.content}
        </a>
      )
    
    case 'text':
    default:
      return <span key={index}>{part.content}</span>
  }
}

// Función legacy para compatibilidad (si se usa en otros lugares)
export function renderMessageWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Resetear regex para evitar problemas de estado
      urlRegex.lastIndex = 0
      
      const url = part.startsWith('http') ? part : `http://${part}`
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all font-medium"
        >
          {part}
        </a>
      )
    }
    return <span key={index}>{part}</span>
  })
} 