import {
  BookOpen,
  Edit,
  Eye,
  GripVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLesson } from "@shared/schema";
import { Badge } from "../ui/badge";
import MainLessonModal from "./MainLessonModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLessonViewDetailModal from "./MainLessonViewDetailModal";
import Pagination from "../common/Pagination";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MainLessonsViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

type MainLessonData = {
  mainLessons: MainLesson[];
  total: number;
};

interface SortableRowProps {
  mainLesson: MainLesson;
  isDragDisabled: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onEdit: (lesson: MainLesson) => void;
  onView: (lesson: MainLesson) => void;
  onDelete: (lesson: MainLesson) => void;
}

function SortableRow({
  mainLesson,
  isDragDisabled,
  isSelected,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mainLesson.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? ("relative" as const) : undefined,
    zIndex: isDragging ? 9999 : undefined,
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "draft":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="p-4">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={
            isDragDisabled
              ? "cursor-not-allowed opacity-30"
              : "cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          }
          title={isDragDisabled ? "Clear search/filter to reorder" : "Drag to reorder"}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(mainLesson.id)}
        />
      </td>
      <td className="p-4">
        <div className="flex items-center">
          <img
            className="rounded-lg"
            src={`${mainLesson.imageCoverUrl}`}
            width="150"
            height="150"
            alt={mainLesson.title}
          />
        </div>
      </td>
      <td className="p-4">
        <div>
          <p className="font-medium neutral-dark">{mainLesson.title}</p>
          <p className="text-sm neutral-medium">{mainLesson.description}</p>
        </div>
      </td>
      <td className="p-4">
        <Badge variant={getBadgeVariant(mainLesson.status)}>
          {mainLesson.status.charAt(0).toUpperCase() +
            mainLesson.status.slice(1)}
        </Badge>
      </td>
      <td className="p-4">
        <span className="neutral-dark font-medium">
          {mainLesson.free
            ? "Free"
            : `${Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format((mainLesson.price || 0) / 100)}`}
        </span>
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
            onClick={() => onEdit(mainLesson)}
            className="fluent-blue hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(mainLesson)}
            className="neutral-medium hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(mainLesson)}
            className="fluent-red hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function MainLessonsView({ onDelete }: MainLessonsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMainLesson, setEditingMainLesson] = useState<MainLesson | null>(
    null,
  );
  const [mainLessonViewDetail, setMainLessonViewDetail] =
    useState<MainLesson | null>(null);
  const [limit, _] = useState(15);
  var [offset, setOffset] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [localLessons, setLocalLessons] = useState<MainLesson[]>([]);
  const { toast } = useToast();

  const isDragDisabled = searchTerm !== "" || statusFilter !== "all";

  const mainLessonTableHeaders = [
    "Image cover",
    "Main Lesson",
    "Status",
    "Price",
    "Update",
    "Actions",
  ];

  const getMainLessons = async ({ queryKey }: any) => {
    const [_key, params] = queryKey;
    const response = await apiRequest(
      "GET",
      `/api/main-lessons?search=${params.search}&status=${params.status}&limit=${params.limit}&offset=${params.offset}`,
    );
    return await response.json();
  };

  const { data, isLoading, dataUpdatedAt } =
    useQuery<MainLessonData>({
      queryKey: [
        "main-lessons",
        {
          search: searchTerm,
          status: statusFilter,
          limit: limit,
          offset: offset,
        },
      ],
      queryFn: getMainLessons,
    });

  useEffect(() => {
    setLocalLessons(data?.mainLessons ?? []);
  }, [dataUpdatedAt]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      await apiRequest("DELETE", `/api/main-lessons/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["main-lessons"] });
      await queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/stats"],
      });
      toast({
        title: "Success",
        description: "Main Lesson deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete main lesson",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const response = await apiRequest("PATCH", "/api/main-lessons/reorder", {
        orderedIds,
        startOrder: offset,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["main-lessons"] });
    },
    onError: () => {
      setLocalLessons(data?.mainLessons ?? []);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalLessons((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map((i) => i.id));
      return reordered;
    });
  }

  const toggleLessonSelection = (mainLessonId: number) => {
    setSelectedLessons((prev) =>
      prev.includes(mainLessonId)
        ? prev.filter((id) => id !== mainLessonId)
        : [...prev, mainLessonId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLessons.length === localLessons.length) {
      setSelectedLessons([]);
    } else {
      setSelectedLessons(localLessons.map((l) => l.id));
    }
  };

  const handleNewMainLesson = () => {
    setEditingMainLesson(null);
    setIsModalOpen(true);
  };

  const handleEdit = (mainLesson: MainLesson) => {
    setEditingMainLesson(mainLesson);
    setIsModalOpen(true);
  };

  const handleDelete = (mainLesson: MainLesson) => {
    onDelete("main lesson", mainLesson.title, async () => {
      await deleteMutation.mutateAsync(mainLesson.id);
    });
  };

  const handleViewDetail = (data: MainLesson) => {
    setMainLessonViewDetail(data);
  };

  const total = data?.total ?? 0;

  const next = () => {
    let min = offset + limit;
    setOffset(Math.min(min, total));
    setPageNumber(pageNumber + 1);
  };

  const previous = () => {
    let max = offset - limit;
    setOffset(Math.max(0, max));
    setPageNumber(pageNumber - 1);
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
              <Button
                onClick={handleNewMainLesson}
                className="bg-fluent-blue hover:bg-blue-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Main Lesson
              </Button>
            </div>
          </div>

          {/* Lessons Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left p-4 font-medium neutral-dark w-10" />
                      <th className="text-left p-4 font-medium neutral-dark">
                        <Checkbox
                          checked={
                            localLessons.length > 0 &&
                            selectedLessons.length === localLessons.length
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      {mainLessonTableHeaders.map((e) => (
                        <th
                          key={e}
                          className="text-left p-4 font-medium neutral-dark"
                        >
                          {e}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <SortableContext
                    items={localLessons.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-gray-200">
                      {localLessons.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center">
                            <div className="text-gray-500">
                              <BookOpen className="mx-auto h-12 w-12 mb-2 opacity-50" />
                              <p>No main lessons found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        localLessons.map((mainLesson) => (
                          <SortableRow
                            key={mainLesson.id}
                            mainLesson={mainLesson}
                            isDragDisabled={isDragDisabled}
                            isSelected={selectedLessons.includes(mainLesson.id)}
                            onSelect={toggleLessonSelection}
                            onEdit={handleEdit}
                            onView={handleViewDetail}
                            onDelete={handleDelete}
                          />
                        ))
                      )}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
            <Pagination
              title="Main Lessons"
              currentLength={localLessons?.length ?? 0}
              limit={limit}
              offset={offset}
              pageNumber={pageNumber}
              next={next}
              previous={previous}
              total={total}
            />
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
  );
}
