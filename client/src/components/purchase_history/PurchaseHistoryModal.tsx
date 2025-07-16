import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseHistoryForm } from "./PurchaseHistoryForm";
import { PurchaseHistoryData } from "@shared/schema";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PurchaseHistoryData | null;
}

export function PurchaseHistoryModal({ isOpen, onClose, data }: PurchaseHistoryModalProps){
    const [formData, setFormData] = useState<any>(null);
    const { toast } = useToast();

    const refundMutation = useMutation({
        mutationFn: async (body: any) => await apiRequest("POST", `/api/payments/captures/${data?.purchaseId}/refund`),
        onSuccess: async () => {
            // await queryClient.invalidateQueries({ queryKey: ["users"] });
            // await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Refund payment successfully"
            });
            onClose();
        },
        onError: () => {
            toast({
                title: "Error", 
                description: "Failed to refund payment!",
                variant: "destructive"
            });
        }
    });

    const handleRefundSubmit = async (d: any) => {
        const payload = {
            ...d
        };

        await refundMutation.mutateAsync(payload)
    };

    useEffect(() => {
        if (!isOpen) {
          setFormData(null);
        }
    }, [isOpen]);

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle>
              {/* {data ? "Edit Purchase history" : "Create Purchase history"} */}
              Purchase History Detail
            </DialogTitle>
            <DialogDescription />
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
            <PurchaseHistoryForm
                data={data}
                onClose={onClose}
                onRefundSubmit={handleRefundSubmit}
                isLoading={refundMutation.isPending}
            />
          </div>
        </DialogContent>
        </Dialog>
        </>
    )
}