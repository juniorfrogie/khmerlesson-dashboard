import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "../ui/input";
import { Lesson, PurchaseHistoryData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const purchaseHistorySchema = z.object({
  email: z.string()
});


type PurchaseHistoryFormData = z.infer<typeof purchaseHistorySchema>;

interface PurchaseHistoryFormProps {
  data: PurchaseHistoryData | null;
//   onSubmit: (data: UserFormData, isDraft?: boolean) => void;
//   onStatusSubmit: (data: any) => void;
//   onChangePasswordView: (data: UserFormData) => void;
//   onUpdateSubmit: (data: UpdateUserFormData) => void;
  onRefundSubmit: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function PurchaseHistoryForm({ data, onRefundSubmit, isLoading }: PurchaseHistoryFormProps){

    const form = useForm<PurchaseHistoryFormData>({
        resolver: zodResolver(purchaseHistorySchema),
        defaultValues: {
          email: data?.email ?? ""
        }
    });

    const handleRefundSubmit = async (d: any) => {
        onRefundSubmit({...d})
    }

    const { data: lesson, isFetching } = useQuery<Lesson>({
        queryKey: [`/api/lessons/${data?.lessonId}`]
    })

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(() => {})} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="email"
                            disabled
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="Enter email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold neutral-dark">Lesson</h3>
                        </div>
                        <div className="space-y-4">
                            { isFetching ? (<small className="text-gray-500">Loading...</small>) : 
                                (
                                    <div className="space-y-6">
                                        {
                                            !lesson ? (<p className="neutral-light text-sm">No lesson found</p>) : (
                                                <Card>
                                                    <CardHeader>
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center space-x-4">
                                                                {/* <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    {
                                                                        lessonType?.iconMode === "file" ? <img src={`/uploads/${lessonType?.icon}`} width="24" height="24" alt={lessonType?.title}/> 
                                                                        : <span className="text-2xl">{lessonType?.icon || "📚"}</span>
                                                                    }
                                                                </div> */}
                                                                <div>
                                                                    <CardTitle className="text-2xl neutral-dark">{lesson.title}</CardTitle>
                                                                    <p className="neutral-medium mt-1">{lesson.description}</p>
                                                                    <div className="flex items-center space-x-2 mt-3">
                                                                        {/* <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                                                            { lessonType && (
                                                                                lessonType.title?.charAt(0).toUpperCase() + lessonType.title?.slice(1)
                                                                            )}
                                                                        </Badge> */}
                                                                        <Badge className={
                                                                            lesson.level === "Beginner" ? "bg-green-100 text-green-700" :
                                                                            lesson.level === "Intermediate" ? "bg-yellow-100 text-yellow-700" :
                                                                            "bg-red-100 text-red-700"
                                                                            }>
                                                                            {lesson.level}
                                                                        </Badge>
                                                                        <Badge variant={lesson.free ? "default" : "secondary"}>
                                                                            {lesson.free ? "Free" : `${Intl.NumberFormat("en-US", {
                                                                                style: "currency",
                                                                                currency: "USD",
                                                                            }).format((lesson.price || 0) / 100)}`}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                </Card>
                                            )
                                        }
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    
                    {/* Form Actions */}        
                    {/* <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                        <div className="flex items-center space-x-3">
                            <Button 
                                disabled={isLoading} 
                                variant="destructive"
                                onClick={async () => await handleRefundSubmit(data)}
                                >
                                {isLoading ? "Refunding.." : "Refund"}
                            </Button>
                        </div>
                    </div> */}
                </form>
            </Form>
        </>
    )
}