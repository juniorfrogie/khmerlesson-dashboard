import { useToast } from "@/hooks/use-toast";
import { LessonType } from "@shared/schema";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import LessonTypeForm from "./LessonTypeForm";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LessonTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonType: LessonType | null;
}

export default function LessonTypeModal({isOpen, onClose, lessonType}: LessonTypeModalProps){
    const [formData, setFormData] = useState<any>(null);
    const { toast } = useToast();

    const createMutation = useMutation({
        mutationFn: async (data: LessonType) => await apiRequest("POST", "/api/lesson-type", data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["lesson-type"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Lesson type created successfully",
            });
            onClose();
        },
        onError: async () => {
            toast({
                title: "Error", 
                description: "Failed to create lesson type",
                variant: "destructive",
            });
        }
    })

    const updateMutation = useMutation({
        mutationFn: async (data: LessonType) => await apiRequest("PATCH", `/api/lesson-type/${lessonType?.id}`, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["lesson-type"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Lesson type updated successfully",
            });
            onClose();
        },
        onError: () => {
            toast({
                title: "Error", 
                description: "Failed to update lesson type",
                variant: "destructive",
            });
        }
    })
    
    const handleSubmit = async (data: any) => {
        const payload = {
            ...data
        }

        if(lessonType){
            await updateMutation.mutateAsync(payload)
        }else{
            await createMutation.mutateAsync(payload)
        }
    }

    useEffect(() => {
        if (!isOpen) {
            setFormData(null);
        }
    }, [isOpen]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="overflow-hidden">
                    <DialogHeader className="pb-4">
                        <DialogTitle>
                            { lessonType ? "Edit Lesson Type" : "Create New Lesson Type" }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                        <LessonTypeForm
                            lessonType={formData ?? lessonType}
                            onSubmit={handleSubmit}
                            onPreview={() => {}}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}