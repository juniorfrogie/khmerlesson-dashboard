import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
// import { useEffect } from "react";

export default function PaymentCancel() {
  
  // useEffect(() => {
  //   const searchParams = new URLSearchParams(window.location.search);
  //   console.log(searchParams.get("token"))
  // }, [])

  const captureOrder = async ({ queryKey }: any) => {
    const [_key, _] = queryKey
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token")
    if(!token) return
    const response = await apiRequest("DELETE", `/api/lessons/purchase/${token}`)
    const result = await response.json()
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
            { !isLoading && <CircleX className="h-8 w-8 text-red-500"/>}
            <h1 className="text-2xl font-bold text-gray-900">
              { isLoading ? "Payment canceling..." : "Payment Cancelled!"}
            </h1>
            { isLoading && <small className="text-gray-500">Do not close!</small> }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}