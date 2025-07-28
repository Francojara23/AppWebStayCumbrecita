interface ServiceItem {
  name: string
  icon: string
}

interface HotelServicesProps {
  services: ServiceItem[]
  title?: string
  className?: string
}

export default function HotelServices({
  services,
  title = "Servicios destacados",
  className = "",
}: HotelServicesProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {services.map((service, index) => (
          <div key={index} className="flex items-center text-gray-700">
            <div className="w-2 h-2 bg-[#C84A31] rounded-full mr-3 flex-shrink-0"></div>
            <span className="text-sm">{service.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
