import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@shared/schema";
import { Lock } from "lucide-react";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Card, CardContent } from "../ui/card";

interface ChangePasswordProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  user,
  isOpen,
  onClose,
}: ChangePasswordProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div className="flex items-end space-x-3 border-b py-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center text-sm fluent-blue">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                {user?.email}
              </div>
            </CardContent>
          </Card>
        </div>
        <ChangePasswordForm user={user} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
