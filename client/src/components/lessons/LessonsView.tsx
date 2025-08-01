import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, Eye, Trash2, ChevronLeft, ChevronRight, Library } from "lucide-react";
import { Lesson, LessonData, LessonType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { IMAGE_MAP } from "@/lib/constants";
import LessonModal from "./LessonModal";
import LessonPreview from "./LessonPreview";

interface LessonsViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

type LessonListData = {
  lessons: LessonData[],
  total: number
}

export default function LessonsView({ onDelete }: LessonsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonData | null>(null);
  const [previewLesson, setPreviewLesson] = useState<LessonData | null>(null);
  const [limit, _] = useState(15)
  var [offset, setOffset] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  const { toast } = useToast();

  // const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
  //   queryKey: ["/api/lessons", { 
  //     search: searchTerm, 
  //     level: levelFilter === "all" ? "" : levelFilter, 
  //     type: typeFilter === "all" ? "" : typeFilter, 
  //     status: statusFilter === "all" ? "" : statusFilter 
  //   }],
  // });

  // const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
  //   queryKey: [
  //     `api/lessons?level=${levelFilter}&type=${typeFilter}&status=${statusFilter}&search=${searchTerm}`
  //   ],
  // });

  const getLessons = async ({ queryKey }: any) => {
    const [_key, params] = queryKey
    const response = await apiRequest(
      "GET", 
      `/api/lessons?level=${params.level}&type=${params.type}&search=${params.search}&status=${params.status}&limit=${params.limit}&offset=${params.offset}`
    )
    return await response.json()
  }
  
  // const { data: lessons = [], isLoading } = useQuery<LessonData[]>(
  //   {
  //     queryKey: ['lessons', {
  //       level: levelFilter,
  //       type: typeFilter,
  //       search: searchTerm,
  //       status: statusFilter,
  //       limit: limit,
  //       offset: offset
  //     }],
  //     queryFn: getLessons
  //   })

  const { data: data = { lessons: [], total: 0 }, isLoading } = useQuery<LessonListData>(
    {
      queryKey: ['lessons', {
        level: levelFilter,
        type: typeFilter,
        search: searchTerm,
        status: statusFilter,
        limit: limit,
        offset: offset
      }],
      queryFn: getLessons
    })
      
  const getAllLessonType = async ({ queryKey }: any) => {
      const [_key, params] = queryKey
      const response = await apiRequest("GET", 
          `/api/lesson-type`
      )
      return await response.json()
    }
    
    const { data: lessonTypeList = [] } = useQuery<LessonType[]>({
      queryKey: ['lesson-type'],
      refetchOnMount: false,
      queryFn: getAllLessonType 
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/lessons/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lesson",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (lesson: Lesson | LessonData) => {
    onDelete("lesson", lesson.title, () => {
      deleteMutation.mutate(lesson.id);
    });
  };

  const handleEdit = (lesson: LessonData) => {
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  const handlePreview = (lesson: LessonData) => {
    setPreviewLesson(lesson);
  };

  const handleNewLesson = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const toggleLessonSelection = (lessonId: number) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLessons.length === data.lessons.length) {
      setSelectedLessons([]);
    } else {
      setSelectedLessons(data.lessons.map(l => l.id));
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      default: return "outline";
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-700";
      case "Intermediate": return "bg-yellow-100 text-yellow-700";
      case "Advanced": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

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
                  placeholder="Search lessons..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {/* {Object.keys(IMAGE_MAP).map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))} */}
                  {
                    lessonTypeList.map((item) => (
                      <SelectItem key={item.id} value={`${item.title.toLowerCase()}`}>
                        { item.title }
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

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
              {/* <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button> */}
              <Button onClick={handleNewLesson} className="bg-fluent-blue hover:bg-blue-600">
                <Plus className="mr-2 h-4 w-4" />
                New Lesson
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
                        checked={data.lessons.length > 0 && selectedLessons.length === data.lessons.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4 font-medium neutral-dark">Lesson</th>
                    <th className="text-left p-4 font-medium neutral-dark">Type</th>
                    <th className="text-left p-4 font-medium neutral-dark">Level</th>
                    <th className="text-left p-4 font-medium neutral-dark">Status</th>
                    <th className="text-left p-4 font-medium neutral-dark">Price</th>
                    <th className="text-left p-4 font-medium neutral-dark">Updated</th>
                    <th className="text-left p-4 font-medium neutral-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.lessons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="text-gray-500">
                          <Library className="mx-auto h-12 w-12 mb-2 opacity-50" />
                          <p>No lessons found</p>
                          <p className="text-sm">Create your first lesson to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.lessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <Checkbox 
                            checked={selectedLessons.includes(lesson.id)}
                            onCheckedChange={() => toggleLessonSelection(lesson.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              {/* <span className="text-lg">{IMAGE_MAP[lesson.image as keyof typeof IMAGE_MAP] || "📚"}</span>
                              { <span className="text-lg">{ lesson.lessonType.icon || "📚"}</span> } */}
                              {
                                lesson.lessonType?.iconMode === "file" ? <img src={`/uploads/${lesson.lessonType?.icon}`} width="24" height="24" alt={lesson.lessonType?.title}/> 
                                  : <span className="text-lg">{lesson.lessonType?.icon || "📚"}</span>
                              }
                            </div>
                            <div>
                              <p className="font-medium neutral-dark">{lesson.title}</p>
                              <p className="text-sm neutral-medium">{lesson.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          { lesson.image && lesson.image.length > 0 && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                              {/* {lesson.image.charAt(0).toUpperCase() + lesson.image.slice(1)} */}
                              {lesson.lessonType.title.charAt(0).toUpperCase() + lesson.lessonType.title.slice(1)}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={getLevelBadgeColor(lesson.level)}>
                            {lesson.level}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={getBadgeVariant(lesson.status)}>
                            {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="neutral-dark font-medium">
                            {/* {lesson.free ? "Free" : `$${((lesson.price || 0) / 100).toFixed(2)}`} */}
                            {lesson.free ? "Free" : `${Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format((lesson.price || 0) / 100)}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="neutral-medium text-sm">
                            {new Date(lesson.updatedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(lesson)}
                              className="fluent-blue hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handlePreview(lesson)}
                              className="neutral-medium hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(lesson)}
                              className="fluent-red hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {/* {data.lessons.length > 0 && (
              <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm neutral-medium">
                  Showing 1 to {data.lessons.length} of {data.lessons.length} lessons
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
            )} */}
            {data.lessons?.length > 0 && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm neutral-medium">
                      Showing 1 to {data.lessons?.length} of {data.total} lessons
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={previous} disabled={offset < 1}>
                          <ChevronLeft />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-fluent-blue text-white">
                          { pageNumber }
                      </Button>
                      <Button variant="outline" size="sm" onClick={next} disabled={offset === data.total - 1 || data.lessons.length === data.total || (offset + limit) === data.total}>
                          <ChevronRight />
                      </Button>
                    </div>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      <LessonModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lesson={editingLesson}
      />

      <LessonPreview 
        lesson={previewLesson}
        isOpen={!!previewLesson}
        onClose={() => setPreviewLesson(null)}
      />
    </>
  );
}
