import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("vd-skeleton rounded-2xl", className)} {...props} />;
}

export function ScreenSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6" role="status" aria-label="Loading">
      <Skeleton className="h-14 w-full rounded-full" />
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
