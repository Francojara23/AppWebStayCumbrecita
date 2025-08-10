import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RoomsTab from "./rooms-tab"
import ReviewsTab from "./reviews-tab"
import LocationTab from "./location-tab"
import type { RoomType } from "@/components/room-detail-modal"

interface PointOfInterest {
  name: string
  distance: string
}

interface Review {
  id: string
  user: string
  rating: number
  date: string
  comment: string
}

interface HotelTabsProps {
  rooms: RoomType[]
  reviews: Review[]
  rating: number
  reviewCount: number
  hotelName: string
  address: string
  latitud?: number
  longitud?: number
  directions: string
  pointsOfInterest: PointOfInterest[]
  roomQuantities: { [key: string]: number }
  setRoomQuantities: (quantities: { [key: string]: number }) => void
  handleRoomReservation: (roomId: string) => void
  handleRoomSelection: (roomId: string) => void
  selectedRoomIds: string[]
  isLoadingDisponibilidad?: boolean
  requiredGuests?: number // Cantidad de huéspedes requeridos para mostrar en mensajes
  remainingRoomsAllowed?: number
  maxRoomsAllowed?: number
}

export default function HotelTabs({
  rooms,
  reviews,
  rating,
  reviewCount,
  hotelName,
  address,
  latitud,
  longitud,
  directions,
  pointsOfInterest,
  roomQuantities,
  setRoomQuantities,
  handleRoomReservation,
  handleRoomSelection,
  selectedRoomIds,
  isLoadingDisponibilidad,
  requiredGuests,
  remainingRoomsAllowed,
  maxRoomsAllowed,
}: HotelTabsProps) {
  return (
    <Tabs defaultValue="rooms" className="mt-8">
      <TabsList className="w-full bg-gray-100">
        <TabsTrigger value="rooms" className="flex-1">
          Habitaciones
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex-1">
          Reseñas
        </TabsTrigger>
        <TabsTrigger value="location" className="flex-1">
          Ubicación
        </TabsTrigger>
      </TabsList>

      {/* Rooms Tab */}
      <TabsContent value="rooms" className="mt-6">
        <RoomsTab
          rooms={rooms}
          roomQuantities={roomQuantities}
          setRoomQuantities={setRoomQuantities}
          handleRoomReservation={handleRoomReservation}
          handleRoomSelection={handleRoomSelection}
          selectedRoomIds={selectedRoomIds}
          isLoadingDisponibilidad={isLoadingDisponibilidad}
          requiredGuests={requiredGuests}
          remainingRoomsAllowed={remainingRoomsAllowed}
          maxRoomsAllowed={maxRoomsAllowed}
        />
      </TabsContent>

      {/* Reviews Tab */}
      <TabsContent value="reviews" className="mt-6">
        <ReviewsTab reviews={reviews} rating={rating} reviewCount={reviewCount} />
      </TabsContent>

      {/* Location Tab */}
      <TabsContent value="location" className="mt-6">
        <LocationTab 
          hotelName={hotelName}
          address={address} 
          latitud={latitud}
          longitud={longitud}
          directions={directions} 
          pointsOfInterest={pointsOfInterest} 
        />
      </TabsContent>
    </Tabs>
  )
}
