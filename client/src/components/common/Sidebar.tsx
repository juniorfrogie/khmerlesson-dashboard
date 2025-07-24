import { ActiveView } from "@/pages/dashboard";
import { GraduationCap, BarChart3, BookOpen, HelpCircle, BarChart, Download, Code, History, BookType, Library, Users } from "lucide-react";

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navigation = [
  { key: "dashboard" as ActiveView, label: "Dashboard", icon: BarChart3 },
  { key: "main_lessons" as ActiveView, label: "Main Lessons", icon: BookOpen },
  { key: "lessons" as ActiveView, label: "Lessons", icon: Library },
  { key: "lesson_type" as ActiveView, label: "Lesson Type", icon: BookType },
  { key: "quizzes" as ActiveView, label: "Quizzes", icon: HelpCircle },
  { key: "users" as ActiveView, label: "Users", icon: Users },
  { key: "purchase_history" as ActiveView, label: "Purchase History", icon: History },
  { key: "analytics" as ActiveView, label: "Analytics", icon: BarChart },
  { key: "import-export" as ActiveView, label: "Import/Export", icon: Download },
  { key: "api-settings" as ActiveView, label: "API Settings", icon: Code },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col fixed h-full z-20">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold neutral-dark flex items-center">
          <GraduationCap className="fluent-blue mr-3" size={24} />
          Khmer Learning Admin
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                onClick={() => onViewChange(key)}
                className={`w-full flex items-center px-4 py-3 rounded-lg border-l-4 transition-colors ${
                  activeView === key
                    ? "fluent-blue bg-blue-50 border-blue-500"
                    : "neutral-medium hover:text-gray-900 hover:bg-gray-50 border-transparent"
                }`}
              >
                <Icon className="mr-3" size={20} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center text-sm neutral-medium">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
            <span className="text-xs font-medium">AU</span>
          </div>
          <span>Admin User</span>
        </div>
      </div>
    </aside>
  );
}