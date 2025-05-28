import { useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import TopBar from "@/components/common/TopBar";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentContent from "@/components/dashboard/RecentContent";
import ContentDistribution from "@/components/dashboard/ContentDistribution";
import LessonsView from "@/components/lessons/LessonsView";
import QuizzesView from "@/components/quizzes/QuizzesView";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";

export type ActiveView = "dashboard" | "lessons" | "quizzes" | "analytics" | "import-export";

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: string;
    name: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: "",
    name: "",
    onConfirm: () => {},
  });

  const openDeleteModal = (type: string, name: string, onConfirm: () => void) => {
    setDeleteModal({
      isOpen: true,
      type,
      name,
      onConfirm,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      type: "",
      name: "",
      onConfirm: () => {},
    });
  };

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <div className="space-y-8">
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RecentContent />
              <ContentDistribution />
            </div>
          </div>
        );
      case "lessons":
        return <LessonsView onDelete={openDeleteModal} />;
      case "quizzes":
        return <QuizzesView onDelete={openDeleteModal} />;
      case "analytics":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold neutral-dark mb-4">Analytics</h3>
            <p className="neutral-medium">Analytics feature coming soon...</p>
          </div>
        );
      case "import-export":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold neutral-dark mb-4">Import/Export</h3>
            <p className="neutral-medium">Import/Export feature coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 flex flex-col">
        <TopBar activeView={activeView} />
        <div className="flex-1 p-6">
          {renderView()}
        </div>
      </main>
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        type={deleteModal.type}
        name={deleteModal.name}
        onConfirm={deleteModal.onConfirm}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
