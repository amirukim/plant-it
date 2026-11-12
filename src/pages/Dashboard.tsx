import { useState } from "react"
import { AnimatePresence } from "motion/react"
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react"
import { usePlantData } from "@/hooks/usePlantData"
import { usePlantAssignments } from "@/hooks/usePlantAssignments"
import { getPotsSummary } from "@/utils/sensorHealth"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { PotCard } from "@/components/dashboard/PotCard"
import { WaterLevelCard } from "@/components/dashboard/WaterLevelCard"
import { AmbientCard } from "@/components/dashboard/AmbientCard"
import { DisplayMode } from "@/components/dashboard/DisplayMode"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function DashboardSkeleton() {
  const cell = "rounded-[24px] bg-card shadow-[0_1px_2px_rgb(38_53_42/0.05),0_18px_44px_-20px_rgb(38_53_42/0.16)]"
  return (
    <div aria-hidden="true">
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn(cell, "h-[440px]")} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <Skeleton className={cn(cell, "h-64 lg:col-span-5")} />
        <Skeleton className={cn(cell, "h-64 lg:col-span-7")} />
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-[28px] bg-card px-6 py-16 text-center shadow-[0_1px_2px_rgb(38_53_42/0.05),0_18px_44px_-20px_rgb(38_53_42/0.16)]">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-critical/10 text-critical">
        <CloudOff className="size-8" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Can't reach your garden</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        We couldn't load the latest sensor data. Check that the Raspberry Pi service is running, then try again.
      </p>
      <Button onClick={onRetry} className="mt-6" size="lg">
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

export default function Dashboard() {
  const { assignments, clear } = usePlantAssignments()
  const { data, isLoading, isError, refetch } = usePlantData(assignments)
  const [displayMode, setDisplayMode] = useState(false)

  const summary = data ? getPotsSummary(data.pots) : null
  const piOffline = data?.raspberryPi.status === "offline"

  return (
    <div className="min-h-svh">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader data={data} displayMode={displayMode} onToggleDisplayMode={setDisplayMode} />

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <div>
            <p className="sr-only">Loading plant data…</p>
            <DashboardSkeleton />
          </div>
        ) : (
          <>
            {piOffline && (
              <div
                className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-critical/8 px-4 py-3 text-sm text-critical"
                role="alert"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  Raspberry Pi Offline: no new sensor data received
                </span>
                <span className="text-critical">
                  Showing last valid data · update paused
                </span>
              </div>
            )}

            <section className="mt-6" aria-label="Pot monitoring">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Your Pots</h2>
                {summary && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                      summary.tone === "healthy" && "bg-leaf-light text-leaf-dark",
                      summary.tone === "warning" && "bg-warning/12 text-warning",
                      summary.tone === "critical" && "bg-critical/10 text-critical",
                      summary.tone === "info" && "bg-info/10 text-info",
                      summary.tone === "neutral" && "bg-muted text-muted-foreground"
                    )}
                    role="status"
                  >
                    {summary.message}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
                {data.pots.map((pot, index) => (
                  <PotCard
                    key={pot.id}
                    pot={pot}
                    roomTemp={data.ambient.temperature}
                    pump={data.pumps.find((p) => p.potId === pot.id)}
                    delay={index * 0.06}
                    onClearPlant={clear}
                  />
                ))}
              </div>
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5" aria-label="System status">
              <div className="lg:col-span-5">
                <WaterLevelCard tank={data.tank} delay={0.26} />
              </div>
              <div className="lg:col-span-7">
                <AmbientCard ambient={data.ambient} delay={0.3} />
              </div>
            </section>

            <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground">
              Smart Garden · Real-time monitoring powered by Raspberry Pi
            </footer>
          </>
        )}
      </div>

      <AnimatePresence>
        {displayMode && data && <DisplayMode key="display-mode" data={data} onExit={() => setDisplayMode(false)} />}
      </AnimatePresence>
    </div>
  )
}
