import EditHospedajeForm from "@/components/adminABM/edit-hospedaje-form"

export default async function EditarHospedajePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditHospedajeForm hotelId={id} />
}
