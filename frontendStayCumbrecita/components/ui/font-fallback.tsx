"use client"

import { useEffect, useState } from "react"

export function FontFallback() {
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    // Verificar si las fuentes se han cargado
    const checkFonts = async () => {
      try {
        // Intentar verificar si Inter está disponible
        await document.fonts.ready
        
        // Verificar específicamente por Inter
        const interFont = Array.from(document.fonts).find(
          font => font.family === 'Inter'
        )
        
        if (interFont && interFont.status === 'loaded') {
          setFontsLoaded(true)
        } else {
          // Si Inter no está disponible, usar fuente del sistema
          console.warn('Inter font not loaded, using system font fallback')
          setFontsLoaded(false)
        }
      } catch (error) {
        console.warn('Font loading check failed:', error)
        setFontsLoaded(false)
      }
    }

    // Verificar inmediatamente
    checkFonts()

    // También verificar después de un timeout
    const timeout = setTimeout(checkFonts, 2000)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    // Agregar clase al body para indicar el estado de las fuentes
    if (fontsLoaded) {
      document.body.classList.add('fonts-loaded')
      document.body.classList.remove('fonts-fallback')
    } else {
      document.body.classList.add('fonts-fallback')
      document.body.classList.remove('fonts-loaded')
    }
  }, [fontsLoaded])

  return null // Este componente no renderiza nada visible
} 