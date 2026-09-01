import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white shadow hover:bg-indigo-500",
        secondary:
          "border-transparent bg-slate-800 text-slate-200 hover:bg-slate-700",
        destructive:
          "border-transparent bg-rose-500/20 text-rose-300 border-rose-500/30",
        outline:
          "text-slate-300 border-slate-700",
        success:
          "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-500/20 text-amber-300",
        // Online Judge Status Badges
        ACCEPTED:
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        WRONG_ANSWER:
          "border-rose-500/40 bg-rose-500/15 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]",
        TIME_LIMIT_EXCEEDED:
          "border-amber-500/40 bg-amber-500/15 text-amber-400 font-bold",
        RUNTIME_ERROR:
          "border-purple-500/40 bg-purple-500/15 text-purple-400 font-bold",
        COMPILATION_ERROR:
          "border-cyan-500/40 bg-cyan-500/15 text-cyan-400 font-bold",
        PENDING:
          "border-sky-500/40 bg-sky-500/15 text-sky-400 font-bold animate-pulse",
        RUNNING:
          "border-indigo-500/40 bg-indigo-500/15 text-indigo-400 font-bold animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
