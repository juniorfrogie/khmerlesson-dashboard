import { ActiveView } from "@/pages/dashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface TopBarProps {
  activeView: ActiveView;
}

const pageConfig = {
  dashboard: {
    title: "Dashboard Overview",
    subtitle: "Manage your Khmer learning content",
    action: { text: "Create New", icon: Plus },
  },
  lessons: {
    title: "Lesson Management",
    subtitle: "Create and manage learning content",
    action: { text: "New Lesson", icon: Plus },
  },
  quizzes: {
    title: "Quiz Management",
    subtitle: "Create and manage quiz questions",
    action: { text: "New Quiz", icon: Plus },
  },
  users: {
    title: "Users Management",
    subtitle: "Create and manage users",
    action: { text: "New Users", icon: Plus },
  },
  purchase_history: {
    title: "Purchase History Management",
    subtitle: "Manage purchase history",
    // action: { text: "New Users", icon: Plus },
  },
  analytics: {
    title: "Analytics",
    subtitle: "View performance metrics",
    action: { text: "Generate Report", icon: Plus },
  },
  "import-export": {
    title: "Import/Export",
    subtitle: "Manage content data",
    action: { text: "Import Data", icon: Plus },
  },
  "api-settings": {
    title: "API Settings",
    subtitle: "Manage API keys and documentation",
    action: { text: "Generate Key", icon: Plus },
  },
};

export default function TopBar({ activeView }: TopBarProps) {
  const config = pageConfig[activeView];

  const [ , setLocation ] = useLocation()
  const { toast } = useToast()
  const { logout, isLogoutLoading } = useAuth()


  const handleLogout = async () => {
    try{
      await logout()
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      setLocation("/");
      window.location.reload();
    }catch(error: any){
      toast({
        title: "Error",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold neutral-dark">{config.title}</h2>
          <p className="neutral-medium text-sm">{config.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* <Button className="bg-fluent-blue hover:bg-blue-600 text-white">
            <config.action.icon className="mr-2" size={16} />
            {config.action.text}
          </Button> */}
          <Button variant="outline" size="icon">
            <Settings size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout} disabled={isLogoutLoading}>
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}