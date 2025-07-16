import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { Lesson, Quiz, QuizQuestion } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const quizSchema = z.object({
  lessonId: z.number().min(1, "Lesson is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  questions: z.array(z.object({
    id: z.number(),
    question: z.string().min(1, "Question is required"),
    options: z.array(z.string()).min(2, "At least 2 options required").max(4),
    correctAnswer: z.string().min(1, "Correct answer is required"),
  })).min(1, "At least one question is required"),
});

type QuizFormData = z.infer<typeof quizSchema>;

interface QuizBuilderProps {
  quiz: Quiz | null;
  onSubmit: (data: QuizFormData, isDraft?: boolean) => void;
  isLoading: boolean;
}

export default function QuizBuilder({ quiz, onSubmit, isLoading }: QuizBuilderProps) {
  const [nextQuestionId, setNextQuestionId] = useState(
    quiz?.questions ? Math.max(...(quiz.questions as QuizQuestion[]).map(q => q.id), 0) + 1 : 1
  );

  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      lessonId: quiz?.lessonId ?? undefined,
      title: quiz?.title || "",
      description: quiz?.description || "",
      questions: quiz?.questions as any || [
        {
          id: 1,
          question: "",
          options: ["", ""],
          correctAnswer: "",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const addQuestion = () => {
    append({
      id: nextQuestionId,
      question: "",
      options: ["", ""],
      correctAnswer: "",
    });
    setNextQuestionId(prev => prev + 1);
  };

  const removeQuestion = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const addOption = (questionIndex: number) => {
    const currentQuestion = form.getValues(`questions.${questionIndex}`);
    if (currentQuestion.options.length < 4) {
      form.setValue(`questions.${questionIndex}.options`, [...currentQuestion.options, ""]);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentQuestion = form.getValues(`questions.${questionIndex}`);
    if (currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== optionIndex);
      form.setValue(`questions.${questionIndex}.options`, newOptions);
      
      // Reset correct answer if it was the removed option
      const correctAnswer = form.getValues(`questions.${questionIndex}.correctAnswer`);
      if (correctAnswer === currentQuestion.options[optionIndex]) {
        form.setValue(`questions.${questionIndex}.correctAnswer`, "");
      }
    }
  };

  const handleSubmit = (data: QuizFormData, isDraft = false) => {
    onSubmit(data, isDraft);
  };

  const getLessons = async ({ queryKey }: any) => {
    const [_key, params] = queryKey
    const response = await apiRequest("GET", "/api/lessons")
    return await response.json()
  }
  
  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: getLessons
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-6">
          <FormField 
            control={form.control}
            name="lessonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson *</FormLabel>
                <Select onValueChange={(e) => field.onChange(parseInt(e))} value={!field.value ? "" : `${field.value}`}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {
                      lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={`${lesson.id}`}>
                          { lesson.title }
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
            />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quiz Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter quiz title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter quiz description" 
                    className="h-24 resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Questions */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold neutral-dark">Questions</h3>
            <Button type="button" onClick={addQuestion} className="bg-fluent-blue hover:bg-blue-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          <div className="space-y-6">
            {fields.map((field, questionIndex) => (
              <Card key={field.id} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      <GripVertical className="mr-2 h-4 w-4 text-gray-400" />
                      Question {questionIndex + 1}
                    </CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(questionIndex)}
                        className="fluent-red hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`questions.${questionIndex}.question`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your question" 
                            className="h-20 resize-none khmer-text"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Answer Options *</FormLabel>
                      {form.watch(`questions.${questionIndex}.options`).length < 4 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(questionIndex)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Option
                        </Button>
                      )}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.correctAnswer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="space-y-2"
                            >
                              {form.watch(`questions.${questionIndex}.options`).map((_, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-3">
                                  <FormField
                                    control={form.control}
                                    name={`questions.${questionIndex}.options.${optionIndex}`}
                                    render={({ field: optionField }) => (
                                      <FormItem className="flex-1">
                                        <FormControl>
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem 
                                              value={optionField.value} 
                                              id={`q${questionIndex}-opt${optionIndex}`}
                                            />
                                            <Input 
                                              placeholder={`Option ${optionIndex + 1}`}
                                              className="khmer-text"
                                              {...optionField}
                                            />
                                            {form.watch(`questions.${questionIndex}.options`).length > 2 && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeOption(questionIndex, optionIndex)}
                                                className="text-gray-400 hover:text-red-500"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="text-xs neutral-medium bg-blue-50 p-3 rounded-lg">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Select the correct answer by clicking the radio button next to it
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleSubmit(form.getValues(), true)}
            disabled={isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          
          <Button type="submit" disabled={isLoading} className="bg-fluent-blue hover:bg-blue-600">
            {isLoading ? "Publishing..." : "Publish Quiz"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
