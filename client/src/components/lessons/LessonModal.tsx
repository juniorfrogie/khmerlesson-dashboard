import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Lesson } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LessonForm from "./LessonForm";
import LessonPreview from "./LessonPreview";

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
}

export default function LessonModal({ isOpen, onClose, lesson }: LessonModalProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/lessons", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Lesson created successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to create lesson",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/lessons/${lesson?.id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Lesson updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lesson", 
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any, isDraft = false) => {
    const payload = {
      ...data,
      status: isDraft ? "draft" : "published",
    };

    if (lesson) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handlePreview = (data: any) => {
    setFormData(data);
    setShowPreview(true);
  };

  useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
      setFormData(null);
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle>
              {lesson ? "Edit Lesson" : "Create New Lesson"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
            <LessonForm
              lesson={lesson}
              onSubmit={handleSubmit}
              onPreview={handlePreview}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <LessonPreview
        lesson={formData}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        isFormPreview={true}
      />
    </>
  );
}
