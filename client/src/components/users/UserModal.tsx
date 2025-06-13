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
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UseForm from "./UserForm";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User created successfully"
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/users/${user?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User updated successfully"
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user", 
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/users/${user?.id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User updated successfully"
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user", 
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: any) => {
    const payload = {
      ...data,
    };

    if (user) {
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
              {user ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
            <UseForm
              user={user}
              onSubmit={handleSubmit}
              onPreview={handlePreview}
              onClose={onClose}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}