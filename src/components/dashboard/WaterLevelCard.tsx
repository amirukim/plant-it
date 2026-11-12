import { motion } from "motion/react"
import { Waves } from "lucide-react"
import { AnimatedNumber, BentoCard } from "@/components/dashboard/primitives"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import type { WaterTank } from "@/types/plant"

export function WaterLevelCard({ tank, delay = 0 }: { tank: WaterTank; delay?: number }) {
  return (
    <BentoCard delay={delay} className="p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-light text-leaf-dark">
            <Waves className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Water Tank</h3>
            <p className="text-xs text-muted-foreground">System water supply</p>
          </div>
        </div>
        <StatusBadge tone={tank.status.tone} label={tank.status.label} />
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight">
          <AnimatedNumber value={tank.levelPct} />%
        </span>
        <span className="text-sm font-medium text-muted-foreground">full</span>
      </div>

      <div
        className="mt-4 h-5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={tank.levelPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Water tank level ${tank.levelPct}%`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-leaf to-leaf-dark"
          initial={{ width: 0 }}
          animate={{ width: `${tank.levelPct}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Remaining</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            <AnimatedNumber value={tank.litersRemaining} decimals={1} /> L
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estimated</dt>
          <dd className="mt-0.5 text-sm font-semibold">{tank.status.hint}</dd>
        </div>
      </dl>
    </BentoCard>
  )
}
