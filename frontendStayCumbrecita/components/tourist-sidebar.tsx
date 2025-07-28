"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { LogOut, Menu, X, CreditCard, FileText, User, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  href?: string
}

function NavItem({ icon, label, active, href }: NavItemProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md",
        active ? "bg-orange-100 text-orange-600" : "text-gray-700 hover:bg-gray-100",
      )}
    >
      <div className="mr-3 text-orange-600">{icon}</div>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

export default function TouristSidebar() {
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const sidebarContent = (
    <>
      <div className="p-4">
        <div className="flex items-center justify-center">
          <Image
            src="/placeholder.svg?height=50&width=120"
            alt="Capturecita Logo"
            width={120}
            height={50}
            className="h-12 w-auto"
          />
        </div>
      </div>
      <nav className="mt-5 px-2 space-y-1">
        <NavItem
          icon={<FileText className="h-5 w-5" />}
          label="Mis reservas"
          active={isActive("/touristAMB")}
          href="/touristAMB"
        />
        <NavItem
          icon={<CreditCard className="h-5 w-5" />}
          label="Historial de pagos"
          active={isActive("/touristAMB/pagos")}
          href="/touristAMB/pagos"
        />
        <NavItem
          icon={<User className="h-5 w-5" />}
          label="Datos"
          active={isActive("/touristAMB/datos")}
          href="/touristAMB/datos"
        />
        <NavItem
          icon={<Home className="h-5 w-5" />}
          label="Ver hospedajes"
          active={isActive("/touristAMB/hospedajes")}
          href="/touristAMB/hospedajes"
        />
      </nav>
      <div className="mt-auto p-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 mb-2 border-2 border-white">
              <AvatarImage src="/placeholder.svg?height=64&width=64" alt="Pilar Torres" />
              <AvatarFallback>PT</AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium">Pilar Torres</div>
            <div className="text-xs text-gray-500 mb-3">piltorres@gmail.com</div>
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-600 w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {isMobile && (
        <div className="fixed top-0 left-0 z-50 w-full bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Image
            src="/placeholder.svg?height=40&width=100"
            alt="Capturecita Logo"
            width={100}
            height={40}
            className="h-8 w-auto"
          />
          <Button variant="ghost" size="sm" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={toggleSidebar}></div>
          <div className="relative bg-white h-full w-64 flex flex-col">
            <div className="p-4 flex justify-between items-center border-b">
              <Image
                src="/placeholder.svg?height=40&width=100"
                alt="Capturecita Logo"
                width={100}
                height={40}
                className="h-8 w-auto"
              />
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex md:flex-col md:w-64 md:border-r md:border-gray-200 bg-white",
          isMobile ? "pt-16" : "",
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}
