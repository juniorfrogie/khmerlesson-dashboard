import { useState } from "react";
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
import { Quiz } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QuizModal from "./QuizModal";

interface QuizzesViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

export default function QuizzesView({ onDelete }: QuizzesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const { toast } = useToast();

  const getQuizzes = async ({ queryKey }: any) => {
    const [_key, params] = queryKey;
    const response = await apiRequest(
      "GET",
      `/api/quizzes?status=${params.status}&search=${params.search}`,
    );
    return await response.json();
  };

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: [
      "quizzes",
      {
        status: statusFilter,
        search: searchTerm,
      },
    ],
    queryFn: getQuizzes,
  });

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

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
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
                  placeholder="Search quizzes..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
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

          {/* Quiz Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">No quizzes found</p>
                <p className="text-sm text-gray-400">
                  Create your first quiz to get started
                </p>
              </div>
            ) : (
              quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className="border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <HelpCircle className="fluent-purple" size={24} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quiz)}
                          className="neutral-medium hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(quiz)}
                          className="fluent-red hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-semibold neutral-dark mb-2">
                      {quiz.title}
                    </h3>
                    <p className="neutral-medium text-sm mb-4">
                      {quiz.description}
                    </p>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="neutral-medium">
                        {Array.isArray(quiz.questions)
                          ? quiz.questions.length
                          : 0}{" "}
                        questions
                      </span>
                      <Badge variant={getBadgeVariant(quiz.status)}>
                        {quiz.status.charAt(0).toUpperCase() +
                          quiz.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs neutral-light">
                        <span>
                          Updated{" "}
                          {new Date(quiz.updatedAt).toLocaleDateString()}
                        </span>
                        <span>
                          {quiz.status === "active"
                            ? "85% completion rate"
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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
