import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "../ui/input";
import { Lesson, PurchaseHistoryData } from "@shared/schema";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";

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
                            { isFetching ? <small className="text-gray-500">Loading...</small> : 
                                <h1>{ lesson?.title }</h1>
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