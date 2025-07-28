'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Retorna el children sin tema aplicado durante el servidor
    // Esto evita el mismatch de hidratación
    return <>{children}</>
  }

  return (
    <div suppressHydrationWarning>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </div>
  )
}
