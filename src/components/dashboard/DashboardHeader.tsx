import { Monitor, Sprout } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { formatClock, formatDate, formatRelative } from "@/utils/format"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { GardenSystemData } from "@/types/plant"

export function DashboardHeader({
  data,
  displayMode,
  onToggleDisplayMode,
}: {
  data: GardenSystemData | undefined
  displayMode: boolean
  onToggleDisplayMode: (enabled: boolean) => void
}) {
  const now = useNow(1000)
  const clock = formatClock(now)
  const date = formatDate(now)

  const pi = data?.raspberryPi
  const isStale = pi ? now - pi.lastUpdate > 120_000 : false
  const status = !pi
    ? { label: "Connecting…", tone: "neutral" as const, pulse: false }
    : pi.status === "offline"
      ? { label: "Pi Offline", tone: "critical" as const, pulse: false }
      : isStale
        ? { label: "Reconnecting…", tone: "warning" as const, pulse: false }
        : { label: "System Online", tone: "healthy" as const, pulse: true }

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-dark text-white shadow-lg shadow-leaf/30">
          <Sprout className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Smart Garden</h1>
          <p className="text-sm text-muted-foreground">Real-time Plant Monitoring</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="text-right">
          <div className="text-lg leading-tight font-semibold tabular">{clock}</div>
          <div className="text-xs text-muted-foreground">
            {date}
            {pi ? ` · Updated ${formatRelative(pi.lastUpdate, now)}` : ""}
          </div>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
            status.tone === "healthy" && "bg-leaf-light text-leaf-dark",
            status.tone === "warning" && "bg-warning/10 text-warning",
            status.tone === "critical" && "bg-critical/10 text-critical",
            status.tone === "neutral" && "bg-muted text-muted-foreground"
          )}
          role="status"
          aria-live="polite"
        >
          <span
            className={cn(
              "size-2 rounded-full",
              status.tone === "healthy" && "bg-leaf status-pulse",
              status.tone === "warning" && "bg-warning",
              status.tone === "critical" && "bg-critical",
              status.tone === "neutral" && "bg-muted-foreground/60 animate-pulse"
            )}
            aria-hidden="true"
          />
          {status.label}
        </div>

        <div className="flex items-center gap-2.5 rounded-full bg-card py-1.5 pr-3 pl-2.5 shadow-sm ring-1 ring-foreground/5">
          <Monitor className="size-4 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="display-mode" className="text-sm font-medium text-muted-foreground">
            Display Mode
          </label>
          <Switch
            id="display-mode"
            checked={displayMode}
            onCheckedChange={onToggleDisplayMode}
            aria-label="Toggle display mode"
          />
        </div>
      </div>
    </header>
  )
}
