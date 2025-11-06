import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "../ui/input";
import { MainLesson, PurchaseHistoryData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { apiRequest } from "@/lib/queryClient";

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

    // const handleRefundSubmit = async (d: any) => {
    //     onRefundSubmit({...d})
    // }

    const getMainLessons = async ({ queryKey }: any) => {
        const [_key, _] = queryKey
        const response = await apiRequest("GET", `/api/main-lessons/${data?.mainLessonId}`)
        return await response.json()
    }

    const { data: mainLesson, isFetching } = useQuery<MainLesson>({
        queryKey: ['main-lessons-id'],
        queryFn: getMainLessons,
        refetchOnMount: "always"
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
                            <h3 className="text-lg font-semibold neutral-dark">Main Lesson</h3>
                        </div>
                        <div className="space-y-4">
                            { isFetching ? (<small className="text-gray-500">Loading...</small>) : 
                                (
                                    <div className="space-y-6">
                                        {
                                            !mainLesson ? (<p className="neutral-light text-sm">No main lesson found</p>) : (
                                                <Card>
                                                    <CardHeader>
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center space-x-4">
                                                                <img className="rounded-lg" src={`${mainLesson.imageCoverUrl}`} width="150" height="150" alt={mainLesson.title} />
                                                                <div>
                                                                    <CardTitle className="text-2xl neutral-dark">{mainLesson.title}</CardTitle>
                                                                    <p className="neutral-medium mt-1">{mainLesson.description}</p>
                                                                    <div className="flex items-center space-x-2 mt-3">
                                                                        <Badge variant={mainLesson.free ? "default" : "secondary"}>
                                                                            {mainLesson.free ? "Free" : `${Intl.NumberFormat("en-US", {
                                                                                style: "currency",
                                                                                currency: "USD",
                                                                            }).format((mainLesson.price || 0) / 100)}`}
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