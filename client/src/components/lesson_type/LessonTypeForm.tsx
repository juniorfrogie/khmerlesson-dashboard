import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LessonType } from "@shared/schema";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useState } from "react";

const lessonTypeSchema = z.object({
  icon: z.string().min(1, "Icon is required"), 
  title: z.string().min(1, "Title is required")
});

type LessonTypeFormData = z.infer<typeof lessonTypeSchema>;

interface LessonTypeFormProps {
  lessonType: LessonType | null;
  onSubmit: (data: LessonTypeFormData) => void;
  onPreview: (data: LessonTypeFormData) => void;
  isLoading: boolean;
}

export default function LessonTypeForm({ lessonType, onSubmit, isLoading }: LessonTypeFormProps){
    const [iconMode, setIconMode] = useState<'raw' | 'file'>("raw")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewImage, setPreviewImage] = useState("")

    const form = useForm<LessonTypeFormData>({
        resolver: zodResolver(lessonTypeSchema),
        defaultValues: {
            title: lessonType?.title ?? "",
            icon: lessonType?.icon ?? ""
        }
    })

    const handleSubmit = (data: LessonTypeFormData) => {
        onSubmit({...data})
    }

    const handleFileChange = (event: any) => {
        if(selectedFile){
            URL.revokeObjectURL(previewImage)
        }
        const file = event.target.files[0]
        setSelectedFile(file)
        const href = URL.createObjectURL(file)
        setPreviewImage(href)
        form.setValue("icon", href)
    }

    const handleIconModeChange = (value: string) => {
        setIconMode(value as any)
        setSelectedFile(null)
        form.resetField("icon")
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
                {/* <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Icon</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Enter icon" {...field}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}>
                </FormField> */}

                <Tabs value={iconMode} onValueChange={handleIconModeChange} className="w-full">
                    <div className="border-b border-gray-200 p-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <TabsList className="grid w-fit grid-cols-2">
                                <TabsTrigger value="raw" className="text-xs">
                                    Raw
                                </TabsTrigger>
                                <TabsTrigger value="file" className="text-xs">
                                    File
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <TabsContent value="raw">
                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Icon</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="Enter icon" {...field}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}>
                        </FormField>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-2">
                        {/* <Input 
                            type="file" accept="image/png, image/svg+xml" name="icon"
                            onChange={handleFileChange}/> */}
                        <FormField 
                            control={form.control} 
                            name="icon"
                            render={({ field: { ref, name, onBlur } }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input type="file" accept="image/png, image/svg+xml" 
                                        ref={ref} name={name} onBlur={onBlur} 
                                        onChange={handleFileChange}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}>
                        </FormField>
                        { selectedFile && (
                            <div className="space-y-2">
                                <p>
                                    Preview
                                </p>
                                <div className="flex items-center justify-center border rounded p-4">
                                    <img src={previewImage} width="150" height="150"/>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Enter title" {...field}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}>
                </FormField>

                <div className="flex items-center justify-end space-x-3">
                    <Button type="submit" disabled={isLoading} className="bg-fluent-blue hover:bg-blue-600">
                        {isLoading ? "Publishing..." : "Publish"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}