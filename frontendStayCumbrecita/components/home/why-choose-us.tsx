import { Search, Calendar, Star } from "lucide-react"

export default function WhyChooseUs() {
  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center">¿Por qué elegirnos?</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Búsqueda Fácil */}
          <div className="border border-gray-700 rounded-lg p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#CD6C22] bg-opacity-20 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-[#CD6C22]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Búsqueda Fácil</h3>
            <p className="text-gray-400">
              Encuentra el alojamiento perfecto con nuestros filtros avanzados y búsqueda intuitiva.
            </p>
          </div>

          {/* Reserva Instantánea */}
          <div className="border border-gray-700 rounded-lg p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#CD6C22] bg-opacity-20 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-[#CD6C22]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Reserva Instantánea</h3>
            <p className="text-gray-400">Confirma tu reserva al instante sin complicaciones ni esperas.</p>
          </div>

          {/* Atención Personalizada */}
          <div className="border border-gray-700 rounded-lg p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#CD6C22] bg-opacity-20 flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-[#CD6C22]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Atención Personalizada</h3>
            <p className="text-gray-400">
              Cada hotel cuenta con su propio chatbot disponible 24/7 para resolver todas tus dudas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
