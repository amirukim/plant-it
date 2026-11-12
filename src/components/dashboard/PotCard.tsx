import { Droplets, FlaskConical, Minus, Sparkles, Thermometer, TrendingDown, TrendingUp, TriangleAlert, X } from "lucide-react"
import { METRIC_DISPLAY } from "@/data/metricConfig"
import { useNow } from "@/hooks/useNow"
import { getPotOverallStatus } from "@/utils/sensorHealth"
import { formatRelative } from "@/utils/format"
import { AnimatedNumber, BentoCard } from "@/components/dashboard/primitives"
import { Sparkline } from "@/components/dashboard/Sparkline"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { cn } from "@/lib/utils"
import type { PotData, Pump, Trend } from "@/types/plant"

function TrendLine({ trend }: { trend: Trend | null }) {
  if (!trend) return null
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon
        className={
          trend.direction === "up" ? "size-3.5 text-leaf" : trend.direction === "down" ? "size-3.5 text-info" : "size-3.5"
        }
        aria-hidden="true"
      />
      {trend.text}
    </span>
  )
}

function UnavailableNote({ children }: { children?: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
      {children ?? "Unavailable"}
    </p>
  )
}

function PumpChip({ pump }: { pump: Pump | undefined }) {
  const status = pump?.status ?? "unavailable"
  if (status === "unavailable") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
        title="No pump data for this pot yet"
      >
        <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
        Pump: no data
      </span>
    )
  }
  const on = status === "on"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        on ? "bg-leaf-dark text-white" : "bg-muted text-muted-foreground"
      )}
      role="status"
    >
      <span className={cn("size-1.5 rounded-full bg-white/90", on && "status-pulse")} aria-hidden="true" />
      {on ? "Pump ON" : "Pump OFF"}
    </span>
  )
}

export function PotCard({
  pot,
  roomTemp,
  pump,
  delay = 0,
  onClearPlant,
}: {
  pot: PotData
  roomTemp: number | null
  pump: Pump | undefined
  delay?: number
  onClearPlant?: (potId: PotData["id"]) => void
}) {
  const now = useNow(10_000)
  const overall = getPotOverallStatus(pot)
  const phFault = pot.phSensor === "fault"
  const moistureTone = pot.moistureStatus?.tone ?? "neutral"
  const moistureSpark = pot.sparklines.moisture.map((r) => ({ t: r.timestamp, v: r.moisture ?? 0 }))

  return (
    <BentoCard delay={delay} className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base leading-tight font-semibold tracking-tight">{pot.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pot {pot.id}
            {pot.lastReadingAt === null ? " · No data yet" : ` · Updated ${formatRelative(pot.lastReadingAt, now)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {pot.aiPowered ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-dark px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="size-3" aria-hidden="true" />
              AI
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Manual
            </span>
          )}
          {pot.plant && !pot.plantAutoSelected && onClearPlant && (
            <button
              type="button"
              onClick={() => onClearPlant(pot.id)}
              aria-label={`Remove ${pot.plant?.name} from Pot ${pot.id}`}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <StatusBadge tone={overall.tone} label={overall.label} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              <Droplets className="size-3.5" aria-hidden="true" />
              Moisture
            </p>
            {pot.moistureStatus && <StatusBadge tone={moistureTone} label={pot.moistureStatus.label} />}
          </div>
          <p className="mt-1.5 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">
              {pot.moisture !== null ? <AnimatedNumber value={pot.moisture} /> : "--"}
            </span>
            {pot.moisture !== null && <span className="text-sm font-medium text-muted-foreground">%</span>}
          </p>
          {pot.moisture !== null ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <TrendLine trend={pot.trends.moisture} />
              {pot.moistureStatus?.hint && (
                <span className={moistureTone === "critical" ? "text-xs text-critical" : "text-xs text-warning"}>
                  💧 {pot.moistureStatus.hint}
                </span>
              )}
            </div>
          ) : (
            <UnavailableNote />
          )}
        </div>

        <div className="min-w-0 border-l border-border/70 pl-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              <FlaskConical className="size-3.5" aria-hidden="true" />
              Soil pH
            </p>
            {phFault ? (
              <StatusBadge tone="critical" label="Sensor Fault" />
            ) : (
              pot.phStatus && <StatusBadge tone={pot.phStatus.tone} label={pot.phStatus.label} />
            )}
          </div>
          <p className="mt-1.5 flex items-baseline">
            <span className="text-3xl font-semibold tracking-tight">
              {pot.ph !== null ? <AnimatedNumber value={pot.ph} decimals={1} /> : "--"}
            </span>
          </p>
          {phFault ? (
            <div className="mt-1 space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-critical">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                pH sensor unavailable
              </p>
              {pot.lastValidPh && (
                <p className="text-xs text-muted-foreground">
                  Last valid {pot.lastValidPh.value.toFixed(1)} · {formatRelative(pot.lastValidPh.at, now)}
                </p>
              )}
            </div>
          ) : pot.ph !== null ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <TrendLine trend={pot.trends.ph} />
              {pot.phStatus?.hint && (
                <span className={pot.phStatus.tone === "critical" ? "text-xs text-critical" : "text-xs text-warning"}>
                  {pot.phStatus.hint}
                </span>
              )}
            </div>
          ) : (
            <UnavailableNote />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-light px-2.5 py-1 text-xs font-semibold text-leaf-dark">
          <Thermometer className="size-3.5" aria-hidden="true" />
          {roomTemp !== null ? `${roomTemp.toFixed(1)}°C` : "--"}
          <span className="font-normal text-leaf-dark">Room</span>
        </span>
        <PumpChip pump={pump} />
      </div>

      <div className="mt-auto pt-4">
        {moistureSpark.length > 0 ? (
          <figure>
            <Sparkline data={moistureSpark} color={METRIC_DISPLAY.moisture.color} id={`${pot.id}-history`} className="h-12 w-full" />
            <figcaption className="mt-1 text-[11px] text-muted-foreground">
              History · {moistureSpark.length} recorded readings · replaying live
            </figcaption>
          </figure>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No history yet, sensors not reporting
          </div>
        )}
      </div>
    </BentoCard>
  )
}
