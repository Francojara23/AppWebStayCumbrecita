import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1: Hoteles La Cumbrecita */}
          <div>
            <Link href="/home">
              <Image
                src="/logos/logo-white.png"
                alt="Cumbrecita Logo"
                width={120}
                height={50}
                className="h-12 w-auto mb-4"
              />
            </Link>
            <h3 className="text-xl font-bold mb-4">Hoteles La Cumbrecita</h3>
            <p className="text-gray-400 mb-4">
              Tu portal para encontrar los mejores alojamientos en La Cumbrecita, Córdoba.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            </div>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h3 className="text-xl font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/home" className="text-gray-400 hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white transition-colors">
                  Buscar Hoteles
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Para Propietarios */}
          <div>
            <h3 className="text-xl font-bold mb-4">Para Propietarios</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/auth/login/admin" className="text-gray-400 hover:text-white transition-colors">
                  Acceso Administradores
                </Link>
              </li>
              <li>
                <Link href="/auth/register/admin" className="text-gray-400 hover:text-white transition-colors">
                  Registrar Hotel
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  Centro de Ayuda
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h3 className="text-xl font-bold mb-4">Contacto</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-gray-400" />
                <span>+54 351 123 4567</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-gray-400" />
                <span>info@hoteleslacumbrecita.com</span>
              </li>
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-1" />
                <span>La Cumbrecita, Córdoba, Argentina</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Hoteles La Cumbrecita. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
