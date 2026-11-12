import { useEffect } from "react"
import { motion } from "motion/react"
import { Droplets, FlaskConical, Monitor, Thermometer, TriangleAlert, Waves, X } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { getPotOverallStatus } from "@/utils/sensorHealth"
import { formatClock, formatDate, formatRelative } from "@/utils/format"
import { AnimatedNumber } from "@/components/dashboard/primitives"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GardenSystemData, Pump } from "@/types/plant"

function PumpStatusText({ pump }: { pump: Pump | undefined }) {
  const status = pump?.status ?? "unavailable"
  if (status === "unavailable") {
    return (
      <span className="text-muted-foreground">
        <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/40 align-middle" aria-hidden="true" /> Pump: no data
      </span>
    )
  }
  const on = status === "on"
  return (
    <span className={cn("inline-flex items-center gap-1.5", on ? "font-semibold text-leaf-dark" : "text-muted-foreground")}>
      <span className={cn("inline-flex size-2 rounded-full", on ? "bg-leaf status-pulse" : "bg-muted-foreground/40")} aria-hidden="true" />
      Pump {on ? "ON" : "OFF"}
    </span>
  )
}

export function DisplayMode({ data, onExit }: { data: GardenSystemData; onExit: () => void }) {
  const now = useNow(1000)
  const pi = data.raspberryPi
  const isStale = now - pi.lastUpdate > 120_000
  const pumpsOn = data.pumps.filter((p) => p.status === "on").length
  const healthyPots = data.pots.filter((p) => getPotOverallStatus(p).tone === "healthy").length

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit()
    }
    window.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [onExit])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
      role="dialog"
      aria-label="Display mode"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-6 lg:px-12 lg:py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight tabular lg:text-4xl">{formatClock(now)}</p>
            <p className="mt-1 text-sm text-muted-foreground lg:text-lg">{formatDate(now)}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge
              tone={pi.status === "online" && !isStale ? "healthy" : isStale ? "warning" : "critical"}
              label={pi.status === "online" ? (isStale ? "Reconnecting…" : "System Online") : "Pi Offline"}
              pulse={pi.status === "online" && !isStale}
              className="px-4 py-2 text-base"
            />
            <Button variant="outline" size="lg" onClick={onExit} aria-label="Exit display mode">
              <X className="size-4" aria-hidden="true" />
              Exit
            </Button>
          </div>
        </header>

        <main className="mt-8 grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 lg:mt-10">
          {data.pots.map((pot) => {
            const overall = getPotOverallStatus(pot)
            const phFault = pot.phSensor === "fault"
            const pump = data.pumps.find((p) => p.potId === pot.id)
            return (
              <div key={pot.id} className="bento-card flex flex-col p-6 lg:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 items-center justify-center rounded-3xl bg-leaf-light text-3xl" role="img" aria-label={pot.name}>
                      {pot.emoji}
                    </span>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight lg:text-3xl">{pot.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground lg:text-base">
                        Pot {pot.id}
                        {pot.aiPowered ? " · ✨ AI-guided" : ""}
                        {pot.lastReadingAt === null
                          ? " · No data yet"
                          : ` · Updated ${formatRelative(pot.lastReadingAt, now)}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={overall.tone} label={overall.label} className="text-sm" />
                </div>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground lg:text-base">
                      <Droplets className="size-4" aria-hidden="true" />
                      Soil Moisture
                    </p>
                    <p className="mt-1 text-6xl font-semibold tracking-tight tabular lg:text-7xl">
                      {pot.moisture !== null ? <AnimatedNumber value={pot.moisture} /> : "--"}
                      {pot.moisture !== null && (
                        <span className="ml-1 text-3xl font-medium text-muted-foreground lg:text-4xl">%</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground lg:text-base">
                      <FlaskConical className="size-4" aria-hidden="true" />
                      Soil pH
                    </p>
                    <p className="mt-1 text-5xl font-semibold tracking-tight tabular lg:text-6xl">
                      {pot.ph !== null ? <AnimatedNumber value={pot.ph} decimals={1} /> : "--"}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 pb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-light px-2.5 py-1 text-sm font-semibold text-leaf-dark">
                      <Thermometer className="size-4" aria-hidden="true" />
                      {data.ambient.temperature.toFixed(1)}°C
                      <span className="font-normal text-leaf-dark">Room</span>
                    </span>
                    {pot.moistureStatus && (
                      <StatusBadge tone={pot.moistureStatus.tone} label={`Moisture ${pot.moistureStatus.label}`} className="text-sm" />
                    )}
                    {phFault ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-critical/10 px-2.5 py-1 text-sm font-medium text-critical">
                        <TriangleAlert className="size-3.5" aria-hidden="true" />
                        pH Sensor Fault
                      </span>
                    ) : (
                      pot.phStatus && (
                        <StatusBadge tone={pot.phStatus.tone} label={`pH ${pot.phStatus.label}`} className="text-sm" />
                      )
                    )}
                  </div>
                </div>

                <p className="mt-auto flex items-center gap-3 pt-5 text-sm lg:text-base">
                  <PumpStatusText pump={pump} />
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-muted-foreground">
                    {pot.sparklines.moisture.length > 0
                      ? `${pot.sparklines.moisture.length} recorded readings`
                      : "No history yet"}
                  </span>
                </p>
              </div>
            )
          })}
        </main>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5 lg:mt-10">
          <p className="flex min-w-64 items-center gap-3 text-sm text-muted-foreground lg:text-base">
            <Waves className="size-4 text-leaf" aria-hidden="true" />
            Water tank <span className="font-semibold text-foreground">{data.tank.levelPct}%</span> · {data.tank.litersRemaining} L
            <span className="ml-2 h-2.5 w-32 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className={cn("block h-full rounded-full bg-leaf")}
                style={{ width: `${data.tank.levelPct}%` }}
              />
            </span>
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground lg:text-base">
            <Monitor className="size-4" aria-hidden="true" />
            {healthyPots}/{data.pots.length} pots healthy · {pumpsOn} pump{pumpsOn === 1 ? "" : "s"} running · Updated{" "}
            {formatRelative(pi.lastUpdate, now)}
          </p>
        </footer>
      </div>
    </motion.div>
  )
}
