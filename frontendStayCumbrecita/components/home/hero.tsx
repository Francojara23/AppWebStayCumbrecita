"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import SearchBox from "@/components/home/search-box"

export default function Hero() {
  const router = useRouter()

  const handleExploreClick = () => {
    router.push("/search?huespedes=2&habitaciones=1")
  }

  return (
    <section className="relative h-[500px]">
      <div className="absolute inset-0">
        <Image src="/home-08.jpg" alt="La Cumbrecita" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Descubre La Cumbrecita</h2>
          <p className="text-xl text-white mb-6">Reserva los mejores hoteles y cabañas en este paraíso serrano</p>
          <div className="hidden md:block">
            <Button className="bg-white text-[#CD6C22] hover:bg-gray-100" onClick={handleExploreClick}>
              Explorar Alojamientos
            </Button>
          </div>
        </div>

        {/* Search Box */}
        <SearchBox />
      </div>
    </section>
  )
}
