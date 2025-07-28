import { Star } from "lucide-react"

interface Review {
  id: string
  user: string
  rating: number
  date: string
  comment: string
}

interface ReviewsTabProps {
  reviews: Review[]
  rating: number
  reviewCount: number
}

export default function ReviewsTab({ reviews, rating, reviewCount }: ReviewsTabProps) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-bold">Reseñas</h2>
        <div className="ml-4 flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
          <Star className="h-4 w-4 fill-yellow-500 mr-1" />
          <span className="font-bold">{rating}</span>
          <span className="ml-1">({reviewCount})</span>
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-6">
            <div className="flex justify-between">
              <div className="font-bold">{review.user}</div>
              <div className="text-gray-500 text-sm">{review.date}</div>
            </div>
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Number(review.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-gray-700">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
