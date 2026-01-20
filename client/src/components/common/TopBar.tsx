import { ActiveView } from "@/pages/dashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
// import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from "@radix-ui/react-popover";
// import { Card, CardHeader, CardTitle } from "../ui/card";

interface TopBarProps {
  activeView: ActiveView;
}

const pageConfig = {
  dashboard: {
    title: "Dashboard Overview",
    subtitle: "Manage your Khmer learning content",
    action: { text: "Create New", icon: Plus },
  },
  main_lessons: {
    title: "Main Lesson Management",
    subtitle: "Create and manage main learning content",
    action: { text: "New Main Lesson", icon: Plus },
  },
  lessons: {
    title: "Lesson Management",
    subtitle: "Create and manage learning content",
    action: { text: "New Lesson", icon: Plus },
  },
  lesson_type: {
    title: "Lesson Type Management",
    subtitle: "Create and manage lesson type",
    action: { text: "New Lesson Type", icon: Plus },
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
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 left-0 right-0 z-10">
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
          {/* <Button variant="outline" size="icon">
            <Settings size={16} />
          </Button> */}
          {/* <Popover>
            <PopoverTrigger>
              <Button variant="outline" size="icon">
                <Settings size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent className="PopoverContent" sideOffset={5}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </PopoverContent>
            </PopoverPortal>
          </Popover> */}
          <Button variant="destructive" onClick={handleLogout} disabled={isLogoutLoading} title="Logout">
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}