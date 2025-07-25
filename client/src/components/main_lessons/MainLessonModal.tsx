import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MainLesson } from "@shared/schema";
import MainLessonForm from "./MainLessonForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MainLessonModalProps{
    isOpen: boolean
    onClose: () => void
    mainLesson: MainLesson | null
}

export default function MainLessonModal({ isOpen, onClose, mainLesson }: MainLessonModalProps){
    const [formData, setFormData] = useState<any>(null);
    const { toast } = useToast()

    const createMutation = useMutation({
        mutationFn: async (data: any) => await apiRequest("POST", "/api/main-lessons", data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["main-lessons"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Main Lesson created successfully",
            });
            onClose();
        },
        onError: () => {
            toast({
                title: "Error", 
                description: "Failed to create main lesson",
                variant: "destructive"
            });
        }
    })

    const updateMutation = useMutation({
        mutationFn: async (data: any) => await apiRequest("PATCH", `/api/main-lessons/${mainLesson?.id}`, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["main-lessons"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Main Lesson updated successfully",
            });
            onClose();
        },
        onError: () => {
            toast({
                title: "Error", 
                description: "Failed to update main lesson",
                variant: "destructive"
            });
        }
    })

    const handleSubmit = async (data: any, isDraft = false) => {
        const payload = {
            ...data,
            status: isDraft ? "draft" : "published"
        }
        if(mainLesson){
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="pb-4">
                        { mainLesson ? "Edit Main Lesson" : "Create Main Lesson" }
                    </DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                    <MainLessonForm
                        mainLesson={formData ?? mainLesson}
                        onSubmit={handleSubmit}
                        isLoading={createMutation.isPending || updateMutation.isPending}
                    />
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}