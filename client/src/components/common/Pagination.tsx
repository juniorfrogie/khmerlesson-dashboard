import { Button } from "../ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

type PaginationProps = {
    currentLength: number
    limit: number
    offset: number
    pageNumber: number
    total: number
    next: () => void
    previous: () => void
}

export default function Pagination({ currentLength, total, limit, offset, pageNumber, next, previous }: PaginationProps){

    return (
        <>
        {
            currentLength > 0 && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm neutral-medium">
                        Showing 1 to {currentLength} of {total} lessons
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={previous} disabled={offset < 1}>
                            <ChevronLeft />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-fluent-blue text-white">
                            { pageNumber }
                        </Button>
                        <Button variant="outline" size="sm" onClick={next} disabled={offset === total - 1 || currentLength === total || (offset + limit) === total}>
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            )
        }
        </>
    )
}