"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { testProfile } from "@/app/actions/auth/testProfile"

export default function TestProfilePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    try {
      const response = await testProfile()
      setResult(response)
    } catch (error) {
      setResult({ success: false, error: "Error al ejecutar test" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test Profile Endpoint</h1>
      
      <Button onClick={handleTest} disabled={loading}>
        {loading ? "Probando..." : "Probar /auth/me"}
      </Button>

      {result && (
        <div className="mt-4 p-4 border rounded">
          <h2 className="font-bold mb-2">Resultado:</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 