import { CloudSun } from "lucide-react"
import { AMBIENT_DISPLAY } from "@/data/metricConfig"
import { AnimatedNumber, BentoCard } from "@/components/dashboard/primitives"
import type { Ambient } from "@/types/plant"

export function AmbientCard({ ambient, delay = 0 }: { ambient: Ambient; delay?: number }) {
  return (
    <BentoCard delay={delay} className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-light text-leaf-dark">
          <CloudSun className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Ambient</h3>
          <p className="text-xs text-muted-foreground">Room environment</p>
        </div>
      </div>

      <ul className="mt-4 flex-1 space-y-3">
        {AMBIENT_DISPLAY.map((metric) => {
          const value = ambient[metric.key]
          const Icon = metric.icon
          return (
            <li key={metric.key} className="flex items-center gap-3 rounded-2xl bg-background/70 px-3.5 py-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${metric.color}1a`, color: metric.color }}
              >
                <Icon className="size-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-lg font-semibold">
                  <AnimatedNumber
                    value={value}
                    decimals={metric.key === "temperature" ? 1 : 0}
                    format={metric.key === "light" ? (v) => Math.round(v).toLocaleString("en-US") : undefined}
                  />
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    {metric.key === "temperature" ? "°C" : metric.key === "humidity" ? "%" : "lux"}
                  </span>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </BentoCard>
  )
}
