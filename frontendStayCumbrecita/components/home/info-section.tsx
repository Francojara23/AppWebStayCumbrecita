import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function InfoSection() {
  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative h-64 md:h-auto">
              <Image 
                src="/pueblo-04.jpg" 
                alt="Cabaña en La Cumbrecita" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover" 
              />
            </div>
            <div className="p-6 md:p-8">
              <h3 className="text-2xl font-bold mb-4">Descubrí La Cumbrecita</h3>
              <p className="text-gray-600 mb-6">
                Un paraíso serrano ubicado en las Sierras Grandes de Córdoba. La Cumbrecita es una aldea peatonal de
                estilo alpino rodeada de bosques, arroyos y cascadas. Un lugar ideal para desconectar y disfrutar de la
                naturaleza.
              </p>
              <div className="bg-[#FFF3E0] p-4 rounded-lg border-l-4 border-[#CD6C22]">
                <h4 className="font-bold text-[#CD6C22]">Datos del Destino</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Ubicado a 37 km de Villa General Belgrano</li>
                  <li>• Aldea peatonal de estilo alpino</li>
                  <li>• Clima templado con 4 estaciones bien definidas</li>
                  <li>• Ideal para caminatas y turismo aventura</li>
                </ul>
              </div>
              <div className="mt-6">
                <Button 
                  className="bg-[#CD6C22] hover:bg-[#AD5C12]"
                  onClick={() => window.open('https://lacumbrecita.gob.ar/nuestro-pueblo.html', '_blank')}
                >
                  Conocer más
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
