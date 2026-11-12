import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card bg-vd-card text-white ring-1 ring-white/10", className)}
      {...props}
    />
  );
}
