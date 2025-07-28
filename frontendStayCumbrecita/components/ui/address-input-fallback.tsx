"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, AlertCircle } from "lucide-react"
import { useState } from "react"

interface AddressInputFallbackProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function AddressInputFallback({
  value,
  onChange,
  placeholder = "Ingresa tu dirección completa",
  className,
  disabled = false
}: AddressInputFallbackProps) {
  const [showHelp, setShowHelp] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(className)}
        disabled={disabled}
        autoComplete="street-address"
      />
      
      {/* Indicador de que es input manual */}
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <MapPin className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-gray-400 hover:text-gray-600"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Tooltip de ayuda */}
      {showHelp && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border rounded-lg shadow-lg text-sm text-gray-600 z-10">
          <p className="font-medium mb-1">💡 Consejo:</p>
          <p>Ingresa tu dirección completa incluyendo:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Calle y número</li>
            <li>Ciudad</li>
            <li>Provincia</li>
            <li>Código postal (opcional)</li>
          </ul>
          <p className="mt-2 text-xs text-orange-600">
            ⚠️ Autocompletado de Google Maps temporalmente no disponible
          </p>
        </div>
      )}
    </div>
  )
} 