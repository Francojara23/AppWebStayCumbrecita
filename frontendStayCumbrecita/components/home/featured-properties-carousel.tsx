"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import PropertyCard, { type PropertyCardProps } from "./property-card"
import { useHospedajesDestacados } from "@/hooks/use-api"

// Usar solo hospedajes destacados reales del backend - fallbacks eliminados

export default function FeaturedPropertiesCarousel() {
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(3)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [autoplay, setAutoplay] = useState(true)

  // Hook para obtener hospedajes destacados del backend
  const { data: hospedajesDestacados, isLoading, error } = useHospedajesDestacados()

  // Procesar datos para el formato esperado por PropertyCard
  const featuredProperties: PropertyCardProps[] = hospedajesDestacados?.data?.map((hospedaje: any) => {
    // Calcular el precio mínimo de todas las habitaciones
    let precioMinimo = 0;
    if (hospedaje.habitaciones && hospedaje.habitaciones.length > 0) {
      const precios = hospedaje.habitaciones
        .map((habitacion: any) => {
          // Convertir precio de string a number
          const precio = parseFloat(habitacion.precioBase) || 0;
          return precio;
        })
        .filter((precio: number) => precio > 0); // Filtrar precios válidos
      
      if (precios.length > 0) {
        precioMinimo = Math.min(...precios);
      }
    }

    return {
      id: hospedaje.id, // Usar el UUID directamente
      name: hospedaje.nombre || "Hospedaje",
      location: hospedaje.direccion || "Ubicación no disponible", // Usar la dirección real del hospedaje
      description: hospedaje.descripcionCorta || "Descripción no disponible", // Usar la descripción corta real
      price: precioMinimo, // Usar el precio mínimo calculado
      rating: hospedaje.calificacionPromedio || 0, // Usar calificación real del hospedaje
      reviews: hospedaje.totalOpiniones || 0, // Usar total de opiniones real
      image: hospedaje.imagenes?.[0]?.url || "/mountain-cabin-retreat.png",
      featured: hospedaje.estadisticas?.esDestacado || false, // Usar el campo correcto de destacado
    };
  }) || []

  // Ajustar items por página según el ancho de la pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1)
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2)
      } else {
        setItemsPerPage(3)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Calcular el número total de páginas
  useEffect(() => {
    setTotalPages(Math.ceil(featuredProperties.length / itemsPerPage))
  }, [itemsPerPage])

  const nextPage = () => {
    setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1))
  }

  const prevPage = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1))
  }

  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex)
  }

  // Autoplay para cambiar páginas automáticamente
  // Solo se activa si hay más de 1 página para mostrar
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (autoplay && totalPages > 1) {
      interval = setInterval(() => {
        nextPage()
      }, 5000) // Cambiar cada 5 segundos
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoplay, currentPage, totalPages])

  const pauseAutoplay = () => {
    setAutoplay(false)
  }

  const resumeAutoplay = () => {
    setAutoplay(true)
  }

  // Obtener las propiedades para la página actual
  const currentProperties = featuredProperties.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Hoteles Destacados</h2>
          </div>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando hospedajes destacados...</span>
          </div>
        </div>
      </section>
    )
  }

  // Mostrar error si no se pueden cargar
  if (error) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Hoteles Destacados</h2>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-600">Error al cargar hospedajes destacados</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Hoteles Destacados</h2>
          {/* Solo mostrar botones de navegación si hay más de una página */}
          {totalPages > 1 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-[#CD6C22] text-[#CD6C22] hover:bg-[#CD6C22] hover:text-white"
                onClick={() => {
                  prevPage()
                  pauseAutoplay()
                  // Reanudar después de un tiempo de inactividad
                  setTimeout(resumeAutoplay, 10000)
                }}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-[#CD6C22] text-[#CD6C22] hover:bg-[#CD6C22] hover:text-white"
                onClick={() => {
                  nextPage()
                  pauseAutoplay()
                  // Reanudar después de un tiempo de inactividad
                  setTimeout(resumeAutoplay, 10000)
                }}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <div
          ref={carouselRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          onMouseEnter={pauseAutoplay}
          onMouseLeave={resumeAutoplay}
        >
          {currentProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Indicadores de página - Solo mostrar si hay más de una página */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full mx-1 transition-all",
                  currentPage === index ? "bg-[#CD6C22] w-4" : "bg-gray-300",
                )}
                onClick={() => {
                  goToPage(index)
                  pauseAutoplay()
                  // Reanudar después de un tiempo de inactividad
                  setTimeout(resumeAutoplay, 10000)
                }}
                aria-label={`Ir a página ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
