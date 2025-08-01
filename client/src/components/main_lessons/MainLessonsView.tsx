import { BookOpen, ChevronLeft, ChevronRight, Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "../ui/input";
import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLesson } from "@shared/schema";
import { Badge } from "../ui/badge";
import MainLessonModal from "./MainLessonModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLessonViewDetailModal from "./MainLessonViewDetailModal";

interface MainLessonsViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

type MainLessonData = {
    mainLessons: MainLesson[]
    total: number
}

export default function MainLessonsView({ onDelete }: MainLessonsViewProps){
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMainLesson, setEditingMainLesson] = useState<MainLesson | null>(null)
    const [mainLessonViewDetail, setMainLessonViewDetail] = useState<MainLesson | null>(null)
    const [limit, _] = useState(15)
    var [offset, setOffset] = useState(0)
    const [pageNumber, setPageNumber] = useState(1)
    const { toast } = useToast()

    const mainLessonTableHeaders = [
        "Image cover",
        "Main Lesson",
        "Status",
        "Update",
        "Actions"
    ]

    const getMainLessons = async ({ queryKey }: any) => {
        const [_key, params] = queryKey
        const response = await apiRequest("GET", `/api/main-lessons?search=${params.search}&status=${params.status}&limit=${params.limit}&offset=${params.offset}`)
        return await response.json()
    }

    // const { data: mainLessons = [], isLoading } = useQuery<MainLesson[]>({
    //     queryKey: ["main-lessons", {
    //         search: searchTerm,
    //         status: statusFilter
    //     }],
    //     queryFn: getMainLessons
    // })

    const { data: data = { mainLessons: [], total: 0 }, isLoading } = useQuery<MainLessonData>({
        queryKey: ["main-lessons", {
            search: searchTerm,
            status: statusFilter,
            limit: limit,
            offset: offset
        }],
        queryFn: getMainLessons
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => await apiRequest("DELETE", `/api/main-lesson/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["main-lessons"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Main Lesson deleted successfully"
            });
        },
        onError: () => {
            toast({
                title: "Error", 
                description: "Failed to delete main lesson",
                variant: "destructive"
            });
        }
    })

    const toggleLessonSelection = (mainLessonId: number) => {
        setSelectedLessons(prev => 
        prev.includes(mainLessonId) 
            ? prev.filter(id => id !== mainLessonId)
            : [...prev, mainLessonId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLessons.length === data.mainLessons.length) {
        setSelectedLessons([]);
        } else {
        setSelectedLessons(data.mainLessons.map(l => l.id));
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

    const handleEdit = (mainLesson: MainLesson) => {
        setEditingMainLesson(mainLesson)
        setIsModalOpen(true)
    }

    const handleDelete = (mainLesson: MainLesson) => {
        onDelete("main lesson", mainLesson.title, async () => {
            await deleteMutation.mutateAsync(mainLesson.id)
        })
    }

    const handleViewDetail = (data: MainLesson) => {
        setMainLessonViewDetail(data)
    }

    const next = () => {
        let min = offset + limit
        setOffset(Math.min(min, data.total))
        setPageNumber(pageNumber + 1)
    }

    const previous = () => {
        let max = offset - limit
        setOffset(Math.max(0, max))
        setPageNumber(pageNumber - 1)
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
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                            </SelectContent>
                        </Select>
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
                                            checked={data.mainLessons.length > 0 && selectedLessons.length === data.mainLessons.length}
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
                                    data.mainLessons.length === 0 ? (
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
                                        data.mainLessons.map((mainLesson) => (
                                            <tr key={mainLesson.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <Checkbox 
                                                        checked={selectedLessons.includes(mainLesson.id)}
                                                        onCheckedChange={() => toggleLessonSelection(mainLesson.id)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <img className="rounded-lg" src={`/uploads/${mainLesson.imageCover}`} width="150" height="150" alt={mainLesson.title} />
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <p className="font-medium neutral-dark">{ mainLesson.title }</p>
                                                        <p className="text-sm neutral-medium">{ mainLesson.description }</p>
                                                    </div>
                                                </td>
                                                {/* <td className="p-4">
                                                    <p className="neutral-medium">{ mainLesson.description }</p>
                                                </td> */}
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
                                                <td className="p-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleEdit(mainLesson)}
                                                            className="fluent-blue hover:bg-blue-50"
                                                            >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleViewDetail(mainLesson)}
                                                            className="neutral-medium hover:bg-gray-50"
                                                            >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleDelete(mainLesson)}
                                                            className="fluent-red hover:bg-red-50"
                                                            >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                }
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {data.mainLessons.length > 0 && (
                        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm neutral-medium">
                                Showing 1 to {data.mainLessons.length} of {data.mainLessons.length} main lessons
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={previous} disabled={offset < 1}>
                                    <ChevronLeft />
                                </Button>
                                <Button variant="outline" size="sm" className="bg-fluent-blue text-white">
                                    { pageNumber }
                                </Button>
                                <Button variant="outline" size="sm" onClick={next} disabled={offset === data.total - 1 || data.mainLessons.length === data.total || (offset + limit) === data.total}>
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        <MainLessonModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            mainLesson={editingMainLesson} 
        />

        <MainLessonViewDetailModal 
            isOpen={!!mainLessonViewDetail}
            onClose={() => setMainLessonViewDetail(null)}
            mainLesson={mainLessonViewDetail}
        />
        </>
    )
}