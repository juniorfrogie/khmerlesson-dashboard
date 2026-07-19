import { forwardRef, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lesson, MainLesson } from "@shared/schema";

interface LessonComboboxProps {
  lessons: Lesson[];
  mainLessons: MainLesson[];
  value: number | undefined;
  onChange: (lessonId: number) => void;
}

const LessonCombobox = forwardRef<HTMLButtonElement, LessonComboboxProps>(function LessonCombobox(
  { lessons, mainLessons, value, onChange },
  ref,
) {
  const [open, setOpen] = useState(false);

  const courseById = useMemo(
    () => new Map(mainLessons.map((m) => [m.id, m])),
    [mainLessons],
  );

  const groups = useMemo(() => {
    const byCourse = new Map<number, Lesson[]>();
    for (const lesson of lessons) {
      const list = byCourse.get(lesson.mainLessonId) ?? [];
      list.push(lesson);
      byCourse.set(lesson.mainLessonId, list);
    }
    return mainLessons
      .filter((course) => byCourse.has(course.id))
      .map((course) => ({ course, lessons: byCourse.get(course.id)! }));
  }, [lessons, mainLessons]);

  const selectedLesson = lessons.find((l) => l.id === value);
  const selectedCourse = selectedLesson ? courseById.get(selectedLesson.mainLessonId) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto py-2"
        >
          {selectedLesson ? (
            <span className="flex flex-col items-start text-left">
              <span>{selectedLesson.title}</span>
              <span className="text-xs neutral-light">{selectedCourse?.title ?? "Unknown course"}</span>
            </span>
          ) : (
            <span className="neutral-light">Select lesson</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(itemValue, search) => (itemValue.includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search lessons or courses..." />
          <CommandList>
            <CommandEmpty>No lesson found.</CommandEmpty>
            {groups.map(({ course, lessons: courseLessons }) => (
              <CommandGroup
                key={course.id}
                heading={
                  <span className="flex items-center gap-2">
                    {course.title}
                    <Badge variant={course.isFree ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                      {course.isFree ? "Free" : "Subscription"}
                    </Badge>
                  </span>
                }
              >
                {courseLessons.map((lesson) => (
                  <CommandItem
                    key={lesson.id}
                    value={`${lesson.title.toLowerCase()} ${course.title.toLowerCase()}`}
                    onSelect={() => {
                      onChange(lesson.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", lesson.id === value ? "opacity-100" : "opacity-0")}
                    />
                    {lesson.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

export default LessonCombobox;
