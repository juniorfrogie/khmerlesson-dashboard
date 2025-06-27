import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";

export default function PaymentComplete() {

  const captureOrder = async ({ queryKey }: any) => {
    const [_key, _] = queryKey
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token")
    if(!token) return
    const response = await apiRequest("POST", `/api/orders/${token}/capture`)
    const result = await response.json()
    const id = result.id
    await apiRequest("PATCH", `/api/lessons/purchase/${id}/payment-status`, {
      paymentStatus: result.status.toString().toLowerCase()
    })
    return result
  }

  const { data: _, isLoading } = useQuery({
    queryKey: [],
    queryFn: captureOrder
  })
      
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col mb-4 gap-2 items-center">
            { !isLoading && <CircleCheck className="h-8 w-8 text-green-500"/>}
            <h1 className="text-2xl font-bold text-gray-900">
              { isLoading ? "Verifying..." : "Payment Complete!" }
            </h1>
            { isLoading && <small className="text-gray-500">Do not close!</small> }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}