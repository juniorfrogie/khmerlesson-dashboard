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
import { MainLesson } from "@shared/schema";
import { Save } from "lucide-react";

const mainLessonSchema = z.object({
    imageCover: z.string().min(1, "Image cover is required"),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required")
})

type MainLessonFormData = z.infer<typeof mainLessonSchema>

interface MainLessonFormProps{
    mainLesson: MainLesson | null
    onSubmit: (data: MainLessonFormData, isDraft: boolean) => void
    isLoading: boolean
}

export default function MainLessonForm({ mainLesson, onSubmit, isLoading }: MainLessonFormProps){
    const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const form = useForm<MainLessonFormData>({
        resolver: zodResolver(mainLessonSchema),
        defaultValues: {
            imageCover: mainLesson?.imageCover ??  "",
            title: mainLesson?.title ?? "",
            description: mainLesson?.description ?? ""
        }
    })

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = event.target.files
            if(!files) return
            if(files.length === 0) return

            const file = files[0]
            setSelectedFile(file)
        } catch (error) {
            console.error(error)
        }
    }

    const handleSubmit = (data: MainLessonFormData, isDraft = false) => {
        onSubmit({...data}, isDraft)
    }

    return (
        <>
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
                {/* Basic Information */}
                <FormField 
                    control={form.control}
                    name="imageCover"
                    render={({ field: { onBlur, name, ref } }) => (
                        <FormItem>
                            <FormLabel>Image cover *</FormLabel>
                            <FormControl>
                                {/* <Input type="file" accept="image/png, image/svg+xml"  {...field} /> */}
                            <div className="flex flex-col items-center space-y-6">
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG (MAX. 300x300px)</p>
                                        </div>
                                        {/* <input id="dropzone-file" type="file" class="hidden" /> */}
                                        <Input id="dropzone-file" type="file"
                                            name={name}
                                            ref={ref}
                                            onBlur={onBlur} 
                                            onChange={handleFileChange}
                                            accept="image/png, image/svg+xml" 
                                            className="hidden"/>
                                    </label>
                                </div> 
                                {/* {
                                    selectedFile && (
                                        <div className="w-full border rounded p-4 flex items-center justify-center">
                                            <img className="rounded" src={`${selectedFile.webkitRelativePath}`} width="150" height="150"/>
                                        </div>
                                    )
                                } */}
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <FormField 
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter title" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField 
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="Enter description" className="h-24 resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
        </>
    )
}