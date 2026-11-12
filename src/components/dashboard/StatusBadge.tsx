import { cn } from "@/lib/utils"
import { toneBadge, toneDot } from "@/utils/plantStatus"
import type { StatusTone } from "@/types/plant"

export function StatusBadge({
  tone,
  label,
  className,
  pulse = false,
}: {
  tone: StatusTone
  label: string
  className?: string
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneBadge[tone],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone], pulse && "status-pulse")} aria-hidden="true" />
      {label}
    </span>
  )
}
