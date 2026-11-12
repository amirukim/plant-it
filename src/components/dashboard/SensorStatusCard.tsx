import { Cpu, Droplets, FlaskConical } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { formatRelative } from "@/utils/format"
import { SENSOR_HEALTH_META } from "@/utils/sensorHealth"
import { BentoCard } from "@/components/dashboard/primitives"
import type { PotData, SensorHealth } from "@/types/plant"

function SensorChip({ icon: Icon, metric, state }: { icon: typeof Droplets; metric: string; state: SensorHealth }) {
  const meta = SENSOR_HEALTH_META[state]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        meta.tone === "healthy"
          ? "bg-leaf-light text-leaf-dark"
          : meta.tone === "warning"
            ? "bg-warning/12 text-warning"
            : meta.tone === "critical"
              ? "bg-critical/10 text-critical"
              : "bg-muted text-muted-foreground"
      }`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {metric} · {meta.label}
    </span>
  )
}

export function SensorStatusCard({ pots, delay = 0 }: { pots: PotData[]; delay?: number }) {
  const now = useNow(15_000)

  return (
    <BentoCard delay={delay} className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-light text-leaf-dark">
          <Cpu className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Sensor Status</h3>
          <p className="text-xs text-muted-foreground">Fault detection across all pots</p>
        </div>
      </div>

      <ul className="mt-4 flex-1 divide-y divide-border/60">
        {pots.map((pot) => {
          const hasFault = pot.moistureSensor === "fault" || pot.phSensor === "fault"
          const lastValid = pot.moistureSensor === "fault" ? pot.lastValidMoisture : pot.phSensor === "fault" ? pot.lastValidPh : null
          return (
            <li key={pot.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden="true">{pot.emoji}</span>
                  Pot {pot.id}
                  {pot.plant ? <span className="font-normal text-muted-foreground">· {pot.plant.name}</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <SensorChip icon={Droplets} metric="Moisture" state={pot.moistureSensor} />
                  <SensorChip icon={FlaskConical} metric="pH" state={pot.phSensor} />
                </span>
              </div>
              {hasFault && lastValid && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Last valid reading: {lastValid.value.toFixed(1)} · {formatRelative(lastValid.at, now)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </BentoCard>
  )
}
