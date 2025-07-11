import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { LessonData } from "@shared/schema";
// import { IMAGE_MAP } from "@/lib/constants";

interface LessonPreviewProps {
  lesson: LessonData | null;
  isOpen: boolean;
  onClose: (lesson: LessonData) => void;
  isFormPreview?: boolean;
}

export default function LessonPreview({ lesson, isOpen, onClose, isFormPreview = false }: LessonPreviewProps) {
  if (!lesson) return null;

  const sections = Array.isArray(lesson.sections) ? lesson.sections : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(lesson)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Lesson Preview
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          <div className="space-y-6">
            {/* Lesson Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                      {/* <span className="text-2xl">{IMAGE_MAP[lesson.image] || "📚"}</span> */}
                      <span className="text-2xl">{lesson.lessonType?.icon || "📚"}</span>
                    </div>
                    <div>
                      <CardTitle className="text-2xl neutral-dark">{lesson.title}</CardTitle>
                      <p className="neutral-medium mt-1">{lesson.description}</p>
                      <div className="flex items-center space-x-2 mt-3">
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          {/* {lesson.image?.charAt(0).toUpperCase() + lesson.image?.slice(1)} */}
                          { lesson.lessonType && (
                            lesson.lessonType.title?.charAt(0).toUpperCase() + lesson.lessonType.title?.slice(1)
                          )}
                        </Badge>
                        <Badge className={
                          lesson.level === "Beginner" ? "bg-green-100 text-green-700" :
                          lesson.level === "Intermediate" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }>
                          {lesson.level}
                        </Badge>
                        <Badge variant={lesson.free ? "default" : "secondary"}>
                          {lesson.free ? "Free" : `$${((lesson.price || 0) / 100).toFixed(2)}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Lesson Sections */}
            <div className="space-y-4">
              {sections.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="neutral-medium">No content sections added yet</p>
                  </CardContent>
                </Card>
              ) : (
                sections.map((section: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg neutral-dark">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap khmer-text neutral-dark">
                          {section.content}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Preview Notice */}
            {isFormPreview && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center text-sm fluent-blue">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    This is a preview of how your lesson will appear to students
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
