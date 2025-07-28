"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { SimpleToaster } from "@/components/ui/simple-toaster"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Sección izquierda - Naranja con logo */}
      <div className="bg-[#CD6C22] text-white p-8 flex flex-col justify-between md:w-1/2 min-h-screen md:min-h-full">
        <div className="flex flex-col flex-1">
          <Link href="/home">
            <Image 
          src="/logos/logo-white.png" 
          alt="Stay At Cumbrecita Logo" 
          width={120} 
          height={50} 
          style={{ width: 'auto', height: '48px' }}
        />
          </Link>
          {/* Contenido centrado vertical y horizontal */}
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Gestioná reservas y descubrí hospedajes únicos
            </h1>
            <p className="text-lg md:text-xl opacity-90">
              Hospedajes para vivir momentos inolvidables
            </p>
          </div>
        </div>
        <div className="hidden md:block text-sm opacity-75 mt-8">
          © {new Date().getFullYear()} Cumbrecita. Todos los derechos reservados.
        </div>
      </div>

      {/* Sección derecha - Imagen de fondo con formulario */}
      <div className="relative flex-1 md:w-1/2 min-h-screen md:min-h-full overflow-hidden">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <Image
            src="/FondoMontana.jpg"
            alt="Paisaje de montaña con cabañas"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center',
              width: '100%',
              height: '100%'
            }}
            onError={(e) => {
              // Imagen de respaldo si la externa falla
              e.currentTarget.src = "/mountain-landscape.png"
            }}
          />
        </div>

        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-black/10 z-0"></div>

        {/* Contenedor del formulario con fondo semi-transparente */}
        <div className="relative z-10 flex items-center justify-center h-full p-6">
          <div className="bg-white bg-opacity-80 backdrop-blur-sm p-8 rounded-lg shadow-lg w-full max-w-md">
            {children}
          </div>
        </div>
      </div>

      {/* Toaster para notificaciones */}
      <SimpleToaster position="top-right" />
    </div>
  )
}
