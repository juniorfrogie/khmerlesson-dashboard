import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Loader2 } from "lucide-react";

export default function PaymentComplete() {

  const captureOrder = async ({ queryKey }: any) => {
    const [_key, _] = queryKey
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token")
    if(!token) return
    const response = await apiRequest("POST", `/api/orders/${token}/capture`)
    const result = await response.json()
    const id = result.id
    const responsePaymentStatus = await apiRequest("PATCH", `/api/lessons/purchase/${id}/payment-status`, {
      paymentStatus: result.status.toString().toLowerCase()
    })
    const resultPayment = await responsePaymentStatus.json()
    return resultPayment["data"]
  }

  const { data: paymentData, isLoading } = useQuery({
    queryKey: ["capture-order"],
    queryFn: captureOrder
  })

  if(paymentData && !isLoading){
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col mb-4 gap-2 items-center">
            { !isLoading && <CircleCheck className="h-8 w-8 text-green-500"/>}
            <h1 className="text-2xl font-bold text-gray-900">
              { isLoading ? "Proceeding..." : "Payment Complete!" }
            </h1>
            <small className="text-gray-500">Thank you for your purchasing. Have a great day!</small>
          </div>
        </CardContent>
      </Card>
    </div>
    )
  }
  
  else if(!paymentData && !isLoading){
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col mb-4 gap-2 items-center">
              An error has occurred to purchase, try again!
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
      
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col mb-4 gap-2 items-center">
            <Loader2 className="h-8 w-8 animate-spin"/>
            <h1 className="text-2xl font-bold text-gray-900">
              Proceeding...
            </h1>
            <small className="text-gray-500">Do not close browser!</small>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}