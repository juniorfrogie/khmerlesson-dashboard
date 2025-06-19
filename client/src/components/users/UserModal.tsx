import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { X } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserForm from "./UserForm";
import { ChangePasswordView } from "./ChangePasswordView";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  // const [showPreview, setShowPreview] = useState(false);
  const [showChangePassowrdView, setShowChangePassowrdView] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/auth/register", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
    mutationFn: async (data: any) => await apiRequest("PATCH", `/api/users/${user?.id}/status`, data),
    onSuccess: async () => {
      // queryClient.removeQueries()
      // await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `User ${!user?.isActive ? 'activated' : 'deactivated'} successfully`
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate/deactivate user", 
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (data: any) => {
    const payload = {
      ...data
    };

    if (user) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleStatusUserSubmit = async (data: any) => {
    const payload = {
      ...data
    }
    await updateStatusMutation.mutateAsync(payload)
  };

  const handleChangePasswordView = (data: any) => {
    setFormData(data);
    setShowChangePassowrdView(true);
  };

  useEffect(() => {
    if (!isOpen) {
      setShowChangePassowrdView(false);
      setFormData(null);
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen && !showChangePassowrdView} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle>
              {user ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
            <UserForm
              user={user}
              onSubmit={handleSubmit}
              onStatusSubmit={handleStatusUserSubmit}
              onChangePasswordView={handleChangePasswordView}
              onUpdateSubmit={handleSubmit}
              onClose={onClose}
              isDeactivatingUser={updateStatusMutation.isPending}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ChangePasswordView 
        user={user}
        isOpen={showChangePassowrdView}
        onClose={() => setShowChangePassowrdView(false)}
      />
    </>
  );
}