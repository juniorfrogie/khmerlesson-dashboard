import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, HelpCircle } from "lucide-react";
import { Lesson, MainLesson, Quiz, QuizQuestion } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QuizModal from "./QuizModal";

interface QuizzesViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

const PLACEHOLDER_PATTERN = /under construction|coming soon|not available|no quiz/i;

function isPlaceholderQuiz(quiz: Quiz): boolean {
  if (quiz.status !== "active") return false;
  const questions = Array.isArray(quiz.questions) ? (quiz.questions as QuizQuestion[]) : [];
  if (questions.length !== 1) return false;
  const [q] = questions;
  const text = `${q.question} ${(q.options ?? []).join(" ")}`;
  return PLACEHOLDER_PATTERN.test(text);
}

function isEmptyDraft(quiz: Quiz): boolean {
  if (quiz.status !== "draft") return false;
  const questions = Array.isArray(quiz.questions) ? (quiz.questions as QuizQuestion[]) : [];
  if (questions.length === 0) return true;
  return questions.every(q => !q.question?.trim() && (q.options ?? []).every(o => !o?.trim()));
}

function daysSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

type DerivedStatus = "active" | "draft" | "placeholder";

function getDerivedStatus(quiz: Quiz): DerivedStatus {
  if (isPlaceholderQuiz(quiz)) return "placeholder";
  return quiz.status === "active" ? "active" : "draft";
}

export default function QuizzesView({ onDelete }: QuizzesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const { toast } = useToast();

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ["quizzes"],
    queryFn: async () => (await apiRequest("GET", "/api/quizzes?status=all&search=")).json(),
  });

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: async () => (await apiRequest("GET", "/api/lessons")).json(),
  });

  const { data: mainLessonData } = useQuery<{ mainLessons: MainLesson[]; total: number }>({
    queryKey: ["main-lessons-all"],
    queryFn: async () => (await apiRequest("GET", "/api/main-lessons")).json(),
  });
  const mainLessons = mainLessonData?.mainLessons ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quizzes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (quiz: Quiz) => {
    onDelete("quiz", quiz.title, () => {
      deleteMutation.mutate(quiz.id);
    });
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleNewQuiz = () => {
    setEditingQuiz(null);
    setIsModalOpen(true);
  };

  const groups = useMemo(() => {
    const lessonById = new Map(lessons.map(l => [l.id, l]));
    const courseById = new Map(mainLessons.map(m => [m.id, m]));
    const search = searchTerm.trim().toLowerCase();

    type Row = { quiz: Quiz; lesson?: Lesson; derivedStatus: DerivedStatus };
    const byCourse = new Map<number | "none", { course?: MainLesson; rows: Row[] }>();

    for (const quiz of quizzes) {
      const lesson = quiz.lessonId ? lessonById.get(quiz.lessonId) : undefined;
      const course = lesson ? courseById.get(lesson.mainLessonId) : undefined;
      const derivedStatus = getDerivedStatus(quiz);

      if (statusFilter !== "all" && derivedStatus !== statusFilter) continue;
      const courseKey = course?.id ?? "none";
      if (courseFilter !== "all" && String(courseKey) !== courseFilter) continue;

      if (search) {
        const haystack = `${quiz.title} ${quiz.description} ${lesson?.title ?? ""} ${course?.title ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) continue;
      }

      const key = course?.id ?? "none";
      if (!byCourse.has(key)) byCourse.set(key, { course, rows: [] });
      byCourse.get(key)!.rows.push({ quiz, lesson, derivedStatus });
    }

    // Quizzes come back from the API sorted by creation date, which would push a
    // newly-added quiz to the bottom of its course regardless of which lesson it
    // belongs to. Lessons have no explicit order column, but lesson id ascends in
    // the same sequence as their curriculum numbering, so it's the best available
    // stand-in — sort each course's quizzes by their lesson's id instead.
    for (const group of Array.from(byCourse.values())) {
      group.rows.sort((a, b) => (a.lesson?.id ?? Infinity) - (b.lesson?.id ?? Infinity));
    }

    const sortedCourses = [...mainLessons].sort((a, b) => a.order - b.order);
    const ordered: { course?: MainLesson; rows: Row[] }[] = [];
    for (const course of sortedCourses) {
      if (byCourse.has(course.id)) ordered.push(byCourse.get(course.id)!);
    }
    if (byCourse.has("none")) ordered.push(byCourse.get("none")!);
    return ordered;
  }, [quizzes, lessons, mainLessons, searchTerm, statusFilter, courseFilter]);

  const totalVisible = groups.reduce((sum, g) => sum + g.rows.length, 0);

  const getBadgeVariant = (status: DerivedStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "placeholder":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getBadgeLabel = (status: DerivedStatus) => {
    switch (status) {
      case "active":
        return "Active";
      case "placeholder":
        return "Placeholder";
      default:
        return "Draft";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quizzes, lessons or courses..."
                  className="pl-10 w-72"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {mainLessons.map(course => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="none">No course</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="placeholder">Placeholder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleNewQuiz}
              className="bg-fluent-blue hover:bg-blue-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Quiz
            </Button>
          </div>

          {/* Quiz Groups */}
          {totalVisible === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No quizzes found</p>
              <p className="text-sm text-gray-400">
                {quizzes.length === 0 ? "Create your first quiz to get started" : "Try a different search or filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(({ course, rows }) => (
                <div key={course?.id ?? "none"}>
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-200">
                    <h3 className="font-semibold neutral-dark">{course?.title ?? "No course assigned"}</h3>
                    {course && (
                      <Badge variant={course.isFree ? "default" : "outline"} className="text-[10px]">
                        {course.isFree ? "Free" : "Subscription"}
                      </Badge>
                    )}
                    {course?.status === "coming_soon" && (
                      <Badge variant="outline" className="text-[10px] fluent-orange border-[hsl(var(--fluent-orange))]">
                        Coming Soon
                      </Badge>
                    )}
                    <span className="text-xs neutral-light ml-1">
                      {rows.length} quiz{rows.length !== 1 ? "zes" : ""}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {rows.map(({ quiz, lesson, derivedStatus }) => {
                      const stale = isEmptyDraft(quiz);
                      const idleDays = stale ? daysSince(quiz.updatedAt) : 0;
                      return (
                        <div
                          key={quiz.id}
                          className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <HelpCircle className="fluent-purple" size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium neutral-dark truncate">{quiz.title}</p>
                              <Badge variant={getBadgeVariant(derivedStatus)} className="flex-shrink-0">
                                {getBadgeLabel(derivedStatus)}
                                {stale && ` · idle ${idleDays}d`}
                              </Badge>
                            </div>
                            <p className="text-xs neutral-light truncate">
                              {lesson?.title ?? "No lesson linked"}
                            </p>
                          </div>

                          <span className="text-sm neutral-medium flex-shrink-0 hidden sm:block">
                            {Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions
                          </span>
                          <span className="text-xs neutral-light flex-shrink-0 hidden md:block">
                            Updated {new Date(quiz.updatedAt).toLocaleDateString()}
                          </span>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(quiz)}
                              aria-label={`Edit quiz: ${quiz.title}`}
                              className="neutral-medium hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(quiz)}
                              aria-label={`Delete quiz: ${quiz.title}`}
                              className="fluent-red hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        quiz={editingQuiz}
      />
    </>
  );
}
