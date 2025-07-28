"use client"

import Link from "next/link"
import { ShieldX, Home, LogIn } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Icono de acceso denegado */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>

        {/* Mensaje principal */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso Denegado
        </h1>
        
        <p className="text-gray-600 mb-6">
          No tienes permisos para acceder a esta página. 
          Solo usuarios con rol de turista pueden acceder al checkout.
        </p>

        {/* Código de error */}
        <div className="bg-gray-100 rounded-lg p-3 mb-6">
          <span className="text-sm font-mono text-gray-700">Error 403 - Forbidden</span>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Link 
            href="/auth/login/tourist" 
            className="w-full bg-[#CD6C22] text-white py-2 px-4 rounded-lg hover:bg-[#A83921] transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Iniciar Sesión como Turista
          </Link>
          
          <Link 
            href="/home" 
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al Inicio
          </Link>
        </div>

        {/* Información adicional */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Si crees que esto es un error, contacta al administrador
          </p>
        </div>
      </div>
    </div>
  )
} 