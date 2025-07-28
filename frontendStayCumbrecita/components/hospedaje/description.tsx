interface HotelDescriptionProps {
  description?: string
}

export default function HotelDescription({ description }: HotelDescriptionProps) {
  // Si no hay descripción, no mostrar el componente
  if (!description) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Descripción</h2>
      <div className="text-gray-700 space-y-4">
        {description.split("\n\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
