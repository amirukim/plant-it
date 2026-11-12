import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Sparkles, Sun } from "lucide-react"
import { AMBIENT_DISPLAY } from "@/data/metricConfig"
import { getPlantById } from "@/data/plantCatalog"
import { isAiPot } from "@/data/systemConfig"
import { isLightMeasurable, suggestPlants } from "@/utils/plantAdvisor"
import { formatNumber } from "@/utils/format"
import { BentoCard } from "@/components/dashboard/primitives"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type {
  Ambient,
  PlantAssignments,
  PlantMatch,
  PlantProfile,
  PotId,
  StatusTone,
} from "@/types/plant"

const POT_IDS: PotId[] = [1, 2, 3, 4]
const ASSIGNABLE_POTS: PotId[] = POT_IDS.filter(isAiPot)

const difficultyLabel: Record<PlantProfile["difficulty"], string> = {
  easy: "Easy care",
  moderate: "Moderate",
  expert: "For experts",
}

const toneChip: Record<StatusTone, string> = {
  healthy: "bg-leaf-light text-leaf-dark",
  warning: "bg-warning/12 text-warning",
  critical: "bg-critical/10 text-critical",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
}

const toneDot: Record<StatusTone, string> = {
  healthy: "bg-leaf",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}

const scoreBar: Record<StatusTone, string> = {
  healthy: "bg-leaf",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}

function MatchCard({
  match,
  assignments,
  onAssign,
  onClear,
  detailed,
}: {
  match: PlantMatch
  assignments: PlantAssignments
  onAssign: (potId: PotId, plantId: string) => void
  onClear: (potId: PotId) => void
  detailed: boolean
}) {
  const { plant, score, label, tone, reasons } = match
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-background/70 p-4">
      <div className="flex flex-col items-center text-center">
        <span
          className="flex size-12 items-center justify-center rounded-2xl bg-leaf-light text-2xl"
          role="img"
          aria-label={plant.name}
        >
          {plant.emoji}
        </span>
        <p className="mt-2 text-sm leading-tight font-semibold">{plant.name}</p>
        {plant.botanical && <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{plant.botanical}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", toneChip[tone])}>
            <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
            {label} · {score}%
          </span>
          <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {difficultyLabel[plant.difficulty]}
          </span>
        </div>
      </div>

      {detailed && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{plant.description}</p>}

      <ul className={cn("min-w-0 flex-1 space-y-1", detailed ? "mt-2.5" : "mt-2")}>
        {reasons.map((reason) => (
          <li key={reason.text} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", toneDot[reason.tone])} aria-hidden="true" />
            <span className="min-w-0 break-words">{reason.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Match score ${score} percent`}>
        <motion.div
          className={cn("h-full rounded-full", scoreBar[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        <span className="mr-0.5 text-[11px] font-medium text-muted-foreground">Plant in</span>
        {ASSIGNABLE_POTS.map((potId) => {
          const isHere = assignments[potId] === plant.id
          const otherPlant = !isHere ? getPlantById(assignments[potId]) : undefined
          return (
            <button
              key={potId}
              type="button"
              onClick={() => (isHere ? onClear(potId) : onAssign(potId, plant.id))}
              aria-label={isHere ? `Remove ${plant.name} from Pot ${potId}` : `Plant ${plant.name} in Pot ${potId}`}
              title={
                isHere
                  ? `Remove ${plant.name} from Pot ${potId}`
                  : `Assign ${plant.name} to Pot ${potId}${otherPlant ? ` (replaces ${otherPlant.name})` : ""}`
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isHere ? "bg-leaf-dark text-white" : "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-leaf-light"
              )}
            >
              {otherPlant && <span aria-hidden="true">{otherPlant.emoji}</span>}
              Pot {potId}
              {isHere ? " ✓" : ""}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PlantAdvisorCard({
  ambient,
  assignments,
  onAssign,
  onClear,
  delay = 0,
}: {
  ambient: Ambient
  assignments: PlantAssignments
  onAssign: (potId: PotId, plantId: string) => void
  onClear: (potId: PotId) => void
  delay?: number
}) {
  const [view, setView] = useState<"top" | "all">("top")
  const { temperature, humidity, light } = ambient
  const matches = useMemo(
    () => suggestPlants({ temperature, humidity, light }),
    [temperature, humidity, light]
  )
  const top = matches.slice(0, 3)
  const lightOk = isLightMeasurable(ambient)

  return (
    <BentoCard delay={delay} className="relative p-6">
      <div
        className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-leaf-light/70 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-dark text-white shadow-md shadow-leaf/30">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Plant Advisor</h3>
            <p className="text-xs text-muted-foreground">Smart matches for your room right now</p>
          </div>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "top" | "all")}>
          <TabsList>
            <TabsTrigger value="top" className="px-3">Top picks</TabsTrigger>
            <TabsTrigger value="all" className="px-3">All plants</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        {AMBIENT_DISPLAY.map((metric) => (
          <span
            key={metric.key}
            className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/5"
          >
            <metric.icon className="size-3.5" aria-hidden="true" />
            {metric.format(ambient[metric.key])}
          </span>
        ))}
        {!lightOk && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <Sun className="size-3.5" aria-hidden="true" />
            Low light, matching on climate only
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Light: {lightOk ? `${formatNumber(ambient.light)} lux` : "measured at night"}
        </span>
      </div>

      {view === "top" ? (
        <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {top.map((match) => (
            <MatchCard key={match.plant.id} match={match} assignments={assignments} onAssign={onAssign} onClear={onClear} detailed />
          ))}
        </div>
      ) : (
        <div className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matches.map((match) => (
            <MatchCard key={match.plant.id} match={match} assignments={assignments} onAssign={onAssign} onClear={onClear} detailed={false} />
          ))}
        </div>
      )}

      <p className="relative mt-4 text-xs text-muted-foreground">
        ✨ AI manages Pot 3 & 4: Pot 3 replays a recorded Pak Choy dataset, Pot 4 gets the best
        ambient match; both have their moisture & pH bands and watering targets retuned. Pot 1 & 2
        run on fixed default monitoring. Tap a ✓ pot again to remove it.
      </p>
    </BentoCard>
  )
}
