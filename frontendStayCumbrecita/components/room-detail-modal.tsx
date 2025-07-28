"use client"

// Tipo para los servicios de la habitación
type RoomService = {
  name: string
  icon: string
}

// Tipo para la habitación
export type RoomType = {
  id: string
  name: string
  description: string
  capacity: number
  price: number
  available: number
  image: string
  services?: RoomService[]
  images?: string[]
}

interface RoomDetailModalProps {
  room: RoomType | null
  isOpen: boolean
  onClose: () => void
  onReserve: (roomId: string) => void
  initialQuantity?: number
}

export default function RoomDetailModal({
  room,
  isOpen,
  onClose,
  onReserve,
  initialQuantity = 1,
}: RoomDetailModalProps) {
  return null
}
