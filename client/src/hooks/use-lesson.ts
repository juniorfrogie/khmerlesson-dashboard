import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { useMutation } from "@tanstack/react-query";

export default function useLesson(){

    const { toast } = useToast();

    const getLessons = async ({ queryKey }: any) => {
        const [_key, params] = queryKey
        const response = await apiRequest(
            "GET", `/api/lessons?level=${params.level}&type=${params.type}&search=${params.search}&status=${params.status}&limit=${params.limit}&offset=${params.offset}`)
            return await response.json()
    }

    const getLevelBadgeColor = (level: string) => {
        switch (level) {
            case "Beginner": return "bg-green-100 text-green-700";
            case "Intermediate": return "bg-yellow-100 text-yellow-700";
            case "Advanced": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest("DELETE", `/api/lessons/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["lessons"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Success",
                description: "Lesson deleted successfully",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete lesson",
                variant: "destructive",
            });
        },
    });
    
    return {
        getLessons,
        getLevelBadgeColor,
        deleteMutation
    }
}