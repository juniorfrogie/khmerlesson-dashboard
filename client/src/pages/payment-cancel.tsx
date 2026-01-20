import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { CircleX, Loader2 } from "lucide-react";

export default function PaymentCancel() {

  const deleteOrder = async ({ queryKey }: any) => {
    const [_key, _] = queryKey
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token")
    if(!token) return
    const response = await apiRequest("DELETE", `/api/purchase-history/${token}`)
    return response.status === 204
  }

  const { data: hasDeleted, isLoading } = useQuery({
    queryKey: ["delete-order"],
    queryFn: deleteOrder
  })

  if(hasDeleted && !isLoading){
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col mb-4 gap-2 items-center">
              { !isLoading && <CircleX className="h-8 w-8 text-red-500"/>}
              <h1 className="text-2xl font-bold text-gray-900">
                { isLoading ? "Proceeding..." : "Payment Cancelled!"}
              </h1>
              {/* { isLoading && <small className="text-gray-500">Do not close!</small> } */}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  else if(!hasDeleted && !isLoading){
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col mb-4 gap-2 items-center">
              An error has occurred, try again!
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