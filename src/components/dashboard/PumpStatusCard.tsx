import { Pipette } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { getWateringTargets } from "@/utils/plantAdvisor"
import { formatDayLabel, formatTime } from "@/utils/format"
import { BentoCard } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"
import type { PotData, Pump } from "@/types/plant"

export function PumpStatusCard({
  pumps,
  pots,
  delay = 0,
}: {
  pumps: Pump[]
  pots: PotData[]
  delay?: number
}) {
  const now = useNow(1_000)
  const anyOn = pumps.some((p) => p.status === "on")
  const targets = getWateringTargets(pots)

  return (
    <BentoCard delay={delay} className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-light text-leaf-dark">
          <Pipette className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Water Pumps</h3>
          <p className="text-xs text-muted-foreground">
            {pumps.filter((p) => p.status === "on").length} of {pumps.length} running
          </p>
        </div>
      </div>

      <ul className="mt-4 grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {pumps.map((pump) => {
          const on = pump.status === "on"
          const runtimeSec = on ? Math.max(0, Math.floor((now - pump.lastActivatedAt) / 1000)) : null
          return (
            <li
              key={pump.id}
              className={cn(
                "rounded-2xl px-3.5 py-3",
                on ? "bg-leaf-light/70 ring-1 ring-leaf/25" : "bg-background/70"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Pump {pump.id}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">→ Pot {pump.potId}</span>
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    on ? "bg-leaf-dark text-white" : "bg-muted text-muted-foreground"
                  )}
                  role="status"
                >
                  <span
                    className={cn("size-1.5 rounded-full bg-white/90", on && "status-pulse")}
                    aria-hidden="true"
                    style={!on ? { backgroundColor: "var(--muted-foreground)", opacity: 0.5 } : undefined}
                  />
                  {on ? "ON" : "OFF"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {on
                  ? `Watering Pot ${pump.potId} · Running ${runtimeSec} sec`
                  : `Last activation ${formatDayLabel(pump.lastActivatedAt, now)} ${formatTime(pump.lastActivatedAt)}`}
              </p>
            </li>
          )
        })}
      </ul>

      {!anyOn && <p className="mt-3 text-xs text-muted-foreground">💧 Watering system ready</p>}

      <div className="mt-3 rounded-2xl bg-background/70 p-3.5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Watering plan</p>
        <ul className="mt-1.5 space-y-1">
          {targets.map((target) => (
            <li key={target.potId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
              <span className="font-medium">
                {target.ai ? "✨ " : ""}Pot {target.potId}
                {target.plantName ? <span className="font-normal text-muted-foreground"> · {target.plantName}</span> : null}
              </span>
              <span className="text-muted-foreground">
                {target.ai ? "AI adaptive · " : ""}keep {target.min}–{target.max}% · water below {target.waterBelow}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </BentoCard>
  )
}
