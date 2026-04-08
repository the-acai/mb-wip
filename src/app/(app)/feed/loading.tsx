import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      style={{ gridAutoRows: "minmax(200px, auto)", gridAutoFlow: "dense" }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const tall = i === 1 || i === 4 || i === 7;
        return (
          <div key={i} className={`flex flex-col gap-4 ${tall ? "row-span-2" : ""}`}>
            <Skeleton
              className={`w-full rounded-lg ${tall ? "min-h-[300px] flex-1" : ""}`}
              style={!tall ? { aspectRatio: "933/632" } : undefined}
            />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-5 flex-1 rounded" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
