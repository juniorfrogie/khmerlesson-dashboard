import { BookOpen, Plus, Search } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { MainLesson } from "@shared/schema";
import { Badge } from "../ui/badge";
import MainLessonModal from "./MainLessonModal";

interface MainLessonsViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

export default function MainLessonsView({ onDelete }: MainLessonsViewProps){
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false)
      const [editingMainLesson, setEditingMainLesson] = useState<MainLesson | null>(null)
    const { toast } = useToast()

    const mainLessonTableHeaders = [
        "Image cover",
        "Title",
        "Description",
        "Status",
        "Update",
        "Actions"
    ]

    const getMainLessons = async ({ queryKey }: any) => {
    }

    const { data: mainLessons = [], isLoading } = useQuery<MainLesson[]>({
        queryKey: ["/api/main-lessons"]
    })

    const toggleLessonSelection = (mainLessonId: number) => {
        setSelectedLessons(prev => 
        prev.includes(mainLessonId) 
            ? prev.filter(id => id !== mainLessonId)
            : [...prev, mainLessonId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLessons.length === mainLessons.length) {
        setSelectedLessons([]);
        } else {
        setSelectedLessons(mainLessons.map(l => l.id));
        }
    };

    const getBadgeVariant = (status: string) => {
        switch (status) {
            case "published": return "default";
            case "draft": return "secondary";
            default: return "outline";
        }
    }

    const handleNewMainLesson = () => {
        setEditingMainLesson(null)
        setIsModalOpen(true)
    }

    if(isLoading){
        return (
            <Card>
                <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
                </CardContent>
            </Card>   
        );
    }

    return (
        <>
        <Card className="border border-gray-200">
            <CardContent className="p-6 space-y-6">
                {/* Filters and Search */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 sm:space-x-4">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search main lessons..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button onClick={handleNewMainLesson} className="bg-fluent-blue hover:bg-blue-600">
                            <Plus className="mr-2 h-4 w-4" />
                            New Main Lesson
                        </Button>
                    </div>
                </div>

                {/* Lessons Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                <tr>
                                    <th className="text-left p-4 font-medium neutral-dark">
                                        <Checkbox 
                                            checked={mainLessons.length > 0 && selectedLessons.length === mainLessons.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    {
                                        mainLessonTableHeaders.map((e) => (
                                            <th key={e} className="text-left p-4 font-medium neutral-dark">
                                                { e }
                                            </th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {
                                    mainLessons.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center">
                                                 <div className="text-gray-500">
                                                    <BookOpen className="mx-auto h-12 w-12 mb-2 opacity-50" />
                                                    <p>No main lessons found</p>
                                                    {/* <p className="text-sm">Create your first lesson to get started</p> */}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        mainLessons.map((mainLesson) => (
                                            <tr key={mainLesson.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <Checkbox 
                                                        checked={selectedLessons.includes(mainLesson.id)}
                                                        onCheckedChange={() => toggleLessonSelection(mainLesson.id)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <img src={`/uploads/${mainLesson.imageCover}`} width="150" height="150" alt={mainLesson.title} />
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <p>{ mainLesson.title }</p>
                                                </td>
                                                <td className="p-4">
                                                    <p>{ mainLesson.description }</p>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant={getBadgeVariant(mainLesson.status)}>
                                                        {mainLesson.status.charAt(0).toUpperCase() + mainLesson.status.slice(1)}
                                                    </Badge>
                                                </td>
                                                 <td className="p-4">
                                                    <span className="neutral-medium text-sm">
                                                        {new Date(mainLesson.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
        <MainLessonModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            mainLesson={editingMainLesson} 
        />
        </>
    )
}