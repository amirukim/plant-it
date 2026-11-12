import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Minus, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react"
import { METRIC_DISPLAY } from "@/data/metricConfig"
import { POT_META } from "@/data/systemConfig"
import { usePotHistory } from "@/hooks/usePlantData"
import { formatChartTick, formatTime } from "@/utils/format"
import { BentoCard } from "@/components/dashboard/primitives"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { GardenSystemData, PotId, PotMetric, SensorReading, TimeRange } from "@/types/plant"

const POT_IDS: PotId[] = [1, 2, 3, 4]
const RANGES: TimeRange[] = ["24H", "7D", "30D"]
const METRICS: PotMetric[] = ["moisture", "ph"]

function ChartTooltip({
  active,
  payload,
  metric,
  range,
}: {
  active?: boolean
  payload?: readonly { payload?: SensorReading }[]
  metric: PotMetric
  range: TimeRange
}) {
  if (!active || !payload?.length || !payload[0].payload) return null
  const point = payload[0].payload
  const display = METRIC_DISPLAY[metric]
  const value = metric === "moisture" ? point.moisture : point.ph
  if (value === undefined) return null
  return (
    <div className="rounded-xl bg-card px-3 py-2 text-xs shadow-lg ring-1 ring-foreground/10">
      <p className="font-medium text-muted-foreground">
        {range === "24H" ? formatTime(point.timestamp) : `${formatChartTick(point.timestamp, range)} · ${formatTime(point.timestamp)}`}
      </p>
      <p className="mt-0.5 text-sm font-semibold" style={{ color: display.color }}>
        {display.format(value)}
      </p>
    </div>
  )
}

export function AnalyticsCard({ data, delay = 0 }: { data: GardenSystemData; delay?: number }) {
  const [potId, setPotId] = useState<PotId>(1)
  const [metric, setMetric] = useState<PotMetric>("moisture")
  const [range, setRange] = useState<TimeRange>("24H")
  const { data: readings, isLoading } = usePotHistory(potId, metric, range)
  const display = METRIC_DISPLAY[metric]

  const pot = data.pots.find((p) => p.id === potId)
  const metricFault = metric === "ph" && pot?.phSensor === "fault"
  const faultAt = pot?.lastValidPh?.at

  const series = readings ?? []
  const values = series
    .map((r) => (metric === "moisture" ? r.moisture : r.ph))
    .filter((v): v is number => v !== undefined)
  const current = values.at(-1) ?? null
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  const min = values.length ? Math.min(...values) : null
  const max = values.length ? Math.max(...values) : null

  const first = values[0] ?? null
  let trendEl = <span className="text-muted-foreground">--</span>
  if (current !== null && first !== null) {
    const delta = current - first
    if (Math.abs(delta) < (metric === "ph" ? 0.1 : 1)) {
      trendEl = (
        <span className="inline-flex items-center gap-1">
          <Minus className="size-3.5" aria-hidden="true" />
          Stable
        </span>
      )
    } else {
      const up = delta > 0
      trendEl = (
        <span className="inline-flex items-center gap-1">
          {up ? <TrendingUp className="size-3.5 text-leaf" aria-hidden="true" /> : <TrendingDown className="size-3.5 text-info" aria-hidden="true" />}
          {up ? "+" : ""}
          {delta.toFixed(display.trendDecimals)}
          {display.unit} this {range === "24H" ? "day" : range === "7D" ? "week" : "month"}
        </span>
      )
    }
  }

  return (
    <BentoCard delay={delay} className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-leaf-light text-leaf-dark">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Plant Analytics</h3>
            <p className="text-xs text-muted-foreground">Historical soil readings</p>
          </div>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="px-3">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={String(potId)} onValueChange={(v) => setPotId(Number(v) as PotId)}>
          <TabsList>
            {POT_IDS.map((id) => (
              <TabsTrigger key={id} value={String(id)} className="gap-1.5 px-3">
                <span aria-hidden="true">{POT_META[id].emoji}</span>
                {POT_META[id].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as PotMetric)}>
          <TabsList>
            {METRICS.map((m) => (
              <TabsTrigger key={m} value={m} className="px-3">
                {METRIC_DISPLAY[m].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {metricFault && faultAt && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-warning/10 px-3.5 py-2.5 text-xs font-medium text-warning" role="status">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          pH sensor fault, history ends {formatTime(faultAt)}
        </div>
      )}

      <div className="relative mt-5 h-56 sm:h-64">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-2xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`analytics-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={display.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={display.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e9e5d9" strokeDasharray="4 4" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => formatChartTick(t, range)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                minTickGap={48}
                dy={8}
              />
              <YAxis
                width={metric === "ph" ? 32 : 44}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => (metric === "ph" ? v.toFixed(1) : `${Math.round(v)}`)}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <ChartTooltip active={active} payload={payload} metric={metric} range={range} />
                )}
                cursor={{ stroke: display.color, strokeOpacity: 0.35, strokeDasharray: "4 4" }}
              />
              {avg !== null && <ReferenceLine y={avg} stroke="#b7c9b3" strokeDasharray="6 6" />}
              <Area
                type="monotone"
                dataKey={metric === "moisture" ? "moisture" : "ph"}
                stroke={display.color}
                strokeWidth={2.5}
                fill={`url(#analytics-${metric})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={420}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 sm:grid-cols-5">
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Current</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            {current !== null ? display.format(current) : "--"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Average</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            {avg !== null ? display.format(avg) : "--"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Minimum</dt>
          <dd className="mt-0.5 text-sm font-semibold">{min !== null ? display.format(min) : "--"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Maximum</dt>
          <dd className="mt-0.5 text-sm font-semibold">{max !== null ? display.format(max) : "--"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Trend</dt>
          <dd className="mt-0.5 text-sm font-semibold">{trendEl}</dd>
        </div>
      </dl>
    </BentoCard>
  )
}
