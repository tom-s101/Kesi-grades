import { Skeleton, SkeletonList } from "@/components/ui/loader";

export default function StudentsLoading() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading students">
      <div className="border-b border-border px-4 py-3 lg:px-8 lg:py-4">
        <Skeleton className="h-6 w-32 lg:h-7 lg:w-40" />
      </div>
      <div className="space-y-4 p-4 lg:p-8">
        <Skeleton className="h-11 w-full rounded-lg sm:h-10" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-lg sm:h-10 sm:w-48 sm:flex-none" />
          <Skeleton className="h-11 flex-1 rounded-lg sm:h-10 sm:w-44 sm:flex-none" />
        </div>
        <SkeletonList rows={7} />
      </div>
    </div>
  );
}
