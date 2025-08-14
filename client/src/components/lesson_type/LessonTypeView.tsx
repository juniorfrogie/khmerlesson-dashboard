import { BookType, ChevronLeft, ChevronRight, Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LessonType } from "@shared/schema";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import LessonTypeModal from "./LessonTypeModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import IconMode from "../common/IconMode";
import LessonTypeViewDetailModal from "./LessonTypeViewDetailModal";

interface LessonTypeViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

export default function LessonTypeView({ onDelete }: LessonTypeViewProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedLessonTypeList, setSelectedLessonTypeList] = useState<number[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLessonType, setEditingLessonType] = useState<LessonType | null>(null);
    const [lessonTypeViewDetail, setLessonTypeViewDetail] = useState<LessonType | null>(null)
    const { toast } = useToast()

    // const { data: lessonTypeList = [], isLoading } = useQuery<LessonType[]>({
    //     queryKey: ["/api/lesson-type", { 
    //         search: searchTerm, 
    //     }],
    // });

    const getAllLessonType = async ({ queryKey }: any) => {
        const [_key, params] = queryKey
        const response = await apiRequest("GET", 
            `/api/lesson-type?search=${params.search}`
        )
        return await response.json()
    }

    const { data: lessonTypeList = [], isLoading } = useQuery<LessonType[]>({
        queryKey: ['lesson-type', {
            search: searchTerm
        }],
        queryFn: getAllLessonType 
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest("DELETE", `/api/lesson-type/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["lesson-type"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Lesson type deleted successfully",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete lesson type",
                variant: "destructive",
            });
        }
    })

    const lessonTypeTableHeaders = [
        "Icon",
        "Title",
        "Updated",
        "Action"
    ]

    const toggleLessonTypeSelection = (id: number) => {
        setSelectedLessonTypeList(prev => 
        prev.includes(id) 
            ? prev.filter(id => id !== id)
            : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLessonTypeList.length === lessonTypeList.length) {
            setSelectedLessonTypeList([]);
        } else {
            setSelectedLessonTypeList(lessonTypeList.map(l => l.id));
        }
    };

    const handleNewLessonType = () => {
        setEditingLessonType(null)
        setIsModalOpen(true)
    }

    const handleEditLessonType = (data: LessonType) => {
        setEditingLessonType(data)
        setIsModalOpen(true)
    }

    const handleDelete = (data: LessonType) => {
        onDelete("Lesson Type", data.title, async () => {
            await deleteMutation.mutateAsync(data.id)
        })
    }

    const handleViewDetail = (data: LessonType) => {
        setLessonTypeViewDetail(data)
    }

    if (isLoading) {
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
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                                <Input 
                                    placeholder="Search title..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}/>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Button onClick={handleNewLessonType} className="bg-fluent-blue hover:bg-blue-600">
                                    <Plus className="mr-2 h-4 w-4"/>
                                    New Lesson Type
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Lesson Type Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                    <tr>
                                        <th className="text-left p-4 font-medium neutral-dark">
                                            <Checkbox 
                                                checked={lessonTypeList.length > 0 && selectedLessonTypeList.length === lessonTypeList.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        { lessonTypeTableHeaders.map((e) => (
                                            <th key={e} className="text-left p-4 font-medium neutral-dark">
                                                { e }
                                            </th>
                                        )) }
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    { lessonTypeList.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center">
                                                <div className="text-gray-500">
                                                    <BookType className="mx-auto h-12 w-12 mb-2 opacity-50" />
                                                    <p>No lesson type found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        lessonTypeList.map((lessonType) => (
                                            <tr key={lessonType.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <Checkbox 
                                                        checked={selectedLessonTypeList.includes(lessonType.id)}
                                                        onCheckedChange={() => toggleLessonTypeSelection(lessonType.id)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <IconMode lessonType={lessonType}/>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-medium neutral-dark">{lessonType.title}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className="neutral-medium text-sm">
                                                        { new Date(lessonType.updatedAt).toLocaleDateString() }
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Button 
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditLessonType(lessonType)}
                                                            className="fluent-blue hover:bg-blue-50">
                                                                <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleViewDetail(lessonType)}
                                                            className="neutral-medium hover:bg-gray-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(lessonType)}
                                                            className="fluent-red hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) }
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {lessonTypeList.length > 0 && (
                            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm neutral-medium">
                                Showing 1 to {lessonTypeList.length} of {lessonTypeList.length} lesson type
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" disabled>
                                    <ChevronLeft />
                                </Button>
                                <Button variant="outline" size="sm" className="bg-fluent-blue text-white">
                                1
                                </Button>
                                <Button variant="outline" size="sm" disabled>
                                    <ChevronRight />
                                </Button>
                            </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <LessonTypeModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lessonType={editingLessonType}
            />

            <LessonTypeViewDetailModal 
                isOpen={!!lessonTypeViewDetail}
                onClose={() => setLessonTypeViewDetail(null)}
                lessonType={lessonTypeViewDetail}
            />
        </>
    )
}