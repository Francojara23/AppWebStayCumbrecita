import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import QueryProvider from "@/lib/providers/query-provider"
import { FontFallback } from "@/components/ui/font-fallback"

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
  preload: true,
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: "Sistema de Administración de Hoteles",
  description: "Sistema ABM para administración de hoteles y hospedajes",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans`}>
        <FontFallback />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
