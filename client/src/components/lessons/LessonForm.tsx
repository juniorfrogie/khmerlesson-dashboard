import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Eye, Save } from "lucide-react";
import { LessonData, LessonType } from "@shared/schema";
// import { IMAGE_MAP } from "@/lib/constants";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const lessonSchema = z.object({
  lessonTypeId: z.number().min(1, "Lesson Type is required"),
  lessonType: z.object({
    id: z.number(),
    icon: z.string(),
    title: z.string(),
    iconMode: z.string()
  }).optional(), 
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  image: z.string(),
  free: z.boolean(),
  price: z.number().optional(),
  sections: z.array(z.object({
    title: z.string().min(1, "Section title is required"),
    content: z.string().min(1, "Section content is required"),
  })).min(1, "At least one section is required"),
});

type LessonFormData = z.infer<typeof lessonSchema>;

interface LessonFormProps {
  lesson: LessonData | null;
  onSubmit: (data: LessonFormData, isDraft?: boolean) => void;
  onPreview: (data: LessonFormData) => void;
  isLoading: boolean;
}

export default function LessonForm({ lesson, onSubmit, onPreview, isLoading }: LessonFormProps) {
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);
  //const [lessonTypeList, setLessonTypeList] = useState<LessonType[]>([])

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      lessonTypeId: lesson?.lessonType?.id,
      lessonType: lesson?.lessonType,
      title: lesson?.title || "",
      description: lesson?.description || "",
      level: lesson?.level || "Beginner",
      image: lesson?.image || "",
      free: lesson?.free ?? true,
      price: lesson?.price ? lesson.price / 100 : undefined,
      sections: lesson?.sections || [{ title: "", content: "" }],
    },
  });

  const { watch, setValue } = form;
  const watchedFree = watch("free");
  const watchedSections = watch("sections");

  // Auto-save simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoSaveTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const addSection = () => {
    const currentSections = form.getValues("sections");
    setValue("sections", [...currentSections, { title: "", content: "" }]);
  };

  const removeSection = (index: number) => {
    const currentSections = form.getValues("sections");
    if (currentSections.length > 1) {
      setValue("sections", currentSections.filter((_, i) => i !== index));
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    const lessonType = lessonTypeList.find(e => e.id === data.lessonTypeId)
    if (data.title && data.sections.length > 0) {
      onPreview({
        ...data,
        lessonType: {
          id: lessonType?.id ?? -1,
          icon: lessonType?.icon ?? "",
          title: lessonType?.title ?? "",
          iconMode: lessonType?.iconMode ?? ""
        },
        price: data.free ? undefined : (data.price || 0) * 100,
      });
    }
  };

  const handleSubmit = (data: LessonFormData, isDraft = false) => {
    onSubmit({
      ...data,
      image: form.getValues("image"),
      // lessonType: form.getValues("lessonType"),
      price: data.free ? undefined : (data.price || 0) * 100,
    }, isDraft);
  };

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

  const handleLessonTypeChange = (field: any, value: string) => {
    field.onChange(parseInt(value))
    const lessonTypeData = lessonTypeList.find(e => e.id === parseInt(value))
    form.setValue("image", lessonTypeData?.title?.toLowerCase() ?? "")
  }

  // const getAllLessonType = async () => {
  //   const response = await apiRequest("GET", "/api/lesson-type")
  //   return await response.json()
  // }

  // useEffect(() => {
  //   getAllLessonType().then(data => setLessonTypeList(data))
  // }, [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter lesson title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(IMAGE_MAP).map(([key, emoji]) => (
                      <SelectItem key={key} value={key}>
                        {emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}

          {/* field.onChange(parseInt(e)) */}
          <FormField
            control={form.control}
            name="lessonTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Type *</FormLabel>
                <Select onValueChange={(e) => handleLessonTypeChange(field, e)} value={ !field.value ? "" : `${field.value}` } >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {
                      lessonTypeList.map((item) => (
                        <SelectItem key={item.id} value={`${item.id}`}>
                            {/* { item.icon } { item.title } */}
                            { item.iconMode === "raw" ? (`${item.icon}\t${item.title}`) : 
                              <div className="flex gap-1">
                                <img className="w-4 h-4" src={`/uploads/${item.icon}`} alt={item.title} />
                                { item.title }
                              </div>
                            }
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="free"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pricing</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Free</SelectItem>
                    <SelectItem value="false">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {!watchedFree && (
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter lesson description" 
                  className="h-24 resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Lesson Sections */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold neutral-dark">Lesson Content</h3>
            <Button type="button" onClick={addSection} className="bg-fluent-blue hover:bg-blue-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>

          <div className="space-y-4">
            {watchedSections.map((section, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Section title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {watchedSections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(index)}
                        className="ml-3 fluent-red hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`sections.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Section content (supports Khmer script)"
                            sectionTitle={form.watch(`sections.${index}.title`) || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-3 flex items-center text-xs neutral-medium">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      You can include Khmer script, pronunciation guides, and formatting
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold neutral-dark">Preview</h3>
            <Button type="button" variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Show Preview
            </Button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleSubmit(form.getValues(), true)}
              disabled={isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            {autoSaveTime && (
              <div className="text-xs neutral-medium auto-save-indicator">
                <Save className="inline mr-1 h-3 w-3" />
                Auto-saved {autoSaveTime.toLocaleTimeString()}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button type="submit" disabled={isLoading} className="bg-fluent-blue hover:bg-blue-600">
              {isLoading ? "Publishing..." : "Publish Lesson"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
