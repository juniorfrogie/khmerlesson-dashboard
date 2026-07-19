import { useState } from "react";
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
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
import { Plus, Trash2, GripVertical, Save, Copy } from "lucide-react";
import { Lesson, MainLesson, Quiz, QuizQuestion } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import LessonCombobox from "./LessonCombobox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuizBuilderProps {
  quiz: Quiz | null;
  onSubmit: (data: QuizFormData, isDraft?: boolean) => void;
  isLoading: boolean;
}

export default function QuizBuilder({ quiz, onSubmit, isLoading }: QuizBuilderProps) {
  const [nextQuestionId, setNextQuestionId] = useState(
    quiz?.questions ? Math.max(...(quiz.questions as QuizQuestion[]).map(q => q.id), 0) + 1 : 1
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

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

  const { fields, append, insert, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    move(oldIndex, newIndex);
  };

  const addQuestion = () => {
    append({
      id: nextQuestionId,
      question: "",
      options: ["", ""],
      correctAnswer: "",
    });
    setNextQuestionId(prev => prev + 1);
  };

  const duplicateQuestion = (index: number) => {
    const source = form.getValues(`questions.${index}`);
    insert(index + 1, { ...source, id: nextQuestionId, options: [...source.options] });
    setNextQuestionId(prev => prev + 1);
  };

  const removeQuestion = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleSubmit = (data: QuizFormData, isDraft = false) => {
    onSubmit(data, isDraft);
  };

  const previewQuestion = form.watch(`questions.${activeQuestionIndex}`) ?? form.watch("questions.0");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
          {/* Left column: form fields */}
          <div className="space-y-6 min-w-0">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="lessonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson *</FormLabel>
                    <FormControl>
                      <LessonCombobox
                        lessons={lessons}
                        mainLessons={mainLessons}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
                <h3 className="text-lg font-semibold neutral-dark">
                  Questions <span className="neutral-light font-normal">· {fields.length}</span>
                </h3>
                <Button type="button" onClick={addQuestion} className="bg-fluent-blue hover:bg-blue-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-6">
                    {fields.map((field, questionIndex) => (
                      <SortableQuestionCard
                        key={field.id}
                        id={field.id}
                        questionIndex={questionIndex}
                        totalQuestions={fields.length}
                        canRemove={fields.length > 1}
                        onRemove={() => removeQuestion(questionIndex)}
                        onDuplicate={() => duplicateQuestion(questionIndex)}
                        onFocusQuestion={() => setActiveQuestionIndex(questionIndex)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Right column: live preview */}
          <div className="lg:sticky lg:top-4">
            <QuizPreview
              question={previewQuestion}
              questionNumber={activeQuestionIndex + 1}
              totalQuestions={fields.length}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-card border-t border-gray-200 flex items-center justify-between">
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

interface SortableQuestionCardProps {
  id: string;
  questionIndex: number;
  totalQuestions: number;
  canRemove: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onFocusQuestion: () => void;
}

function SortableQuestionCard({
  id,
  questionIndex,
  totalQuestions,
  canRemove,
  onRemove,
  onDuplicate,
  onFocusQuestion,
}: SortableQuestionCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style} className="border border-gray-200" onFocus={onFocusQuestion}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder question ${questionIndex + 1}`}
              className="mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            Question {questionIndex + 1}
            {totalQuestions > 1 && (
              <span className="neutral-light font-normal text-sm ml-1">of {totalQuestions}</span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              aria-label={`Duplicate question ${questionIndex + 1}`}
              className="neutral-medium hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Delete question ${questionIndex + 1}`}
                className="fluent-red hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuestionFields questionIndex={questionIndex} />
      </CardContent>
    </Card>
  );
}

function QuestionFields({ questionIndex }: { questionIndex: number }) {
  const { control, getValues, setValue, watch } = useFormContext<QuizFormData>();
  const options = watch(`questions.${questionIndex}.options`);

  const [correctIndex, setCorrectIndex] = useState(() => {
    const initialCorrectAnswer = getValues(`questions.${questionIndex}.correctAnswer`);
    const idx = getValues(`questions.${questionIndex}.options`).indexOf(initialCorrectAnswer);
    return idx >= 0 ? idx : 0;
  });

  const selectCorrect = (index: number) => {
    setCorrectIndex(index);
    setValue(`questions.${questionIndex}.correctAnswer`, options[index], { shouldDirty: true });
  };

  const addOption = () => {
    if (options.length < 4) {
      setValue(`questions.${questionIndex}.options`, [...options, ""]);
    }
  };

  const removeOption = (optionIndex: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== optionIndex);
    setValue(`questions.${questionIndex}.options`, newOptions);

    if (optionIndex === correctIndex) {
      setCorrectIndex(0);
      setValue(`questions.${questionIndex}.correctAnswer`, newOptions[0] ?? "");
    } else if (optionIndex < correctIndex) {
      setCorrectIndex(correctIndex - 1);
    }
  };

  return (
    <>
      <FormField
        control={control}
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
          <FormLabel>Answer Options * — click a letter to mark it correct</FormLabel>
          {options.length < 4 && (
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="mr-1 h-3 w-3" />
              Add Option
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {options.map((_, optionIndex) => (
            <div key={optionIndex} className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => selectCorrect(optionIndex)}
                aria-label={`Mark option ${OPTION_LETTERS[optionIndex]} as the correct answer`}
                aria-pressed={correctIndex === optionIndex}
                className={
                  "flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-colors " +
                  (correctIndex === optionIndex
                    ? "bg-fluent-green border-[hsl(var(--fluent-green))] text-white"
                    : "border-gray-300 neutral-medium hover:border-gray-400")
                }
              >
                {OPTION_LETTERS[optionIndex]}
              </button>
              <FormField
                control={control}
                name={`questions.${questionIndex}.options.${optionIndex}`}
                render={({ field: optionField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder={`Option ${OPTION_LETTERS[optionIndex]}`}
                          className={"khmer-text" + (correctIndex === optionIndex ? " border-[hsl(var(--fluent-green))]" : "")}
                          {...optionField}
                          onChange={(e) => {
                            optionField.onChange(e);
                            if (optionIndex === correctIndex) {
                              setValue(`questions.${questionIndex}.correctAnswer`, e.target.value);
                            }
                          }}
                        />
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(optionIndex)}
                            aria-label={`Remove option ${OPTION_LETTERS[optionIndex]}`}
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
        </div>
      </div>

      <div className="text-xs neutral-medium bg-blue-50 p-3 rounded-lg">
        Correctness follows the letter, not the text — safe to reword an option after marking it correct.
      </div>
    </>
  );
}

function QuizPreview({
  question,
  questionNumber,
  totalQuestions,
}: {
  question: { question?: string; options?: string[]; correctAnswer?: string } | undefined;
  questionNumber: number;
  totalQuestions: number;
}) {
  const options = question?.options ?? [];
  return (
    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
      <h4 className="text-sm font-semibold neutral-dark mb-1">Live preview</h4>
      <p className="text-xs neutral-light mb-4">What a learner sees on mobile for this question.</p>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className="h-full bg-fluent-purple"
            style={{ width: totalQuestions > 0 ? `${(questionNumber / totalQuestions) * 100}%` : "0%" }}
          />
        </div>
        <span className="inline-block bg-purple-100 fluent-purple text-xs font-bold px-2.5 py-1 rounded-full mb-3">
          Question {String(questionNumber).padStart(2, "0")}
        </span>
        <p className="text-base font-semibold khmer-text mb-4 min-h-[1.5em]">
          {question?.question || "Your question will appear here"}
        </p>
        <div className="space-y-2">
          {options.length > 0 ? (
            options.map((opt, i) => (
              <div
                key={i}
                className={
                  "border-2 rounded-lg px-3 py-2 text-sm khmer-text " +
                  (opt === question?.correctAnswer && opt !== ""
                    ? "border-[hsl(var(--fluent-green))] bg-green-50 fluent-green font-semibold"
                    : "border-gray-200")
                }
              >
                {opt || <span className="neutral-light">Option {OPTION_LETTERS[i]}</span>}
              </div>
            ))
          ) : (
            <div className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm neutral-light">
              Add options to preview them here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
