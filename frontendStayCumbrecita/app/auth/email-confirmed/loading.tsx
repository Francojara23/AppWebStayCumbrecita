import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function EmailConfirmedLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>

        <Skeleton className="h-8 w-3/4 mx-auto mb-4" />

        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mx-auto mb-2" />
        <Skeleton className="h-4 w-4/6 mx-auto mb-6" />

        <Skeleton className="h-10 w-full mb-4" />

        <Skeleton className="h-4 w-2/3 mx-auto" />
      </Card>
    </div>
  )
}
