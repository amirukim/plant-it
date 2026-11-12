import { POT_META, TANK_CAPACITY_L, TANK_THRESHOLDS } from "@/data/systemConfig"
import { getMoistureStatus } from "@/utils/moistureStatus"
import { getPhStatus } from "@/utils/phStatus"
import { buildTrend } from "@/utils/plantStatus"
import type {
  GardenSystemData,
  PotData,
  PotId,
  PotMetric,
  SensorReading,
  TimeRange,
  WaterTank,
} from "@/types/plant"

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ""

type RawLastValid = { value: number; at: number }

export type RawPot = {
  id: PotId
  moisture: number | null
  ph: number | null
  moistureSensor: PotData["moistureSensor"]
  phSensor: PotData["phSensor"]
  lastReadingAt: number | null
  lastValidMoisture: RawLastValid | null
  lastValidPh: RawLastValid | null
  sparklines: { moisture: SensorReading[]; ph: SensorReading[] }
}

export type RawPump = {
  id: PotId
  potId: PotId
  status: "on" | "off" | "unavailable"
  lastActivatedAt: number
  lastRunDurationSec: number | null
}

export type RawSystem = {
  pots: RawPot[]
  tank: { levelPct: number; capacityL?: number }
  pumps: RawPump[]
  ambient: { temperature: number | null; humidity: number | null; light: number | null }
  raspberryPi: { status: "online" | "offline"; lastUpdate: number }
}

function sparkTrend(
  points: SensorReading[],
  pick: (r: SensorReading) => number | undefined,
  options: { unit?: string; minDelta?: number; decimals?: number }
) {
  const values = points.map(pick).filter((v): v is number => v !== undefined)
  const first = values[0]
  const last = values[values.length - 1]
  if (first === undefined || last === undefined) return null
  return buildTrend(last, first, options)
}

function tankFromRaw(levelPct: number, capacityL: number): WaterTank {
  let status: WaterTank["status"]
  if (levelPct >= TANK_THRESHOLDS.goodMin) {
    status = { label: "Good", tone: "healthy", hint: "Sufficient" }
  } else if (levelPct >= TANK_THRESHOLDS.normalMin) {
    status = { label: "Normal", tone: "healthy", hint: "Sufficient for now" }
  } else if (levelPct >= TANK_THRESHOLDS.lowMin) {
    status = { label: "Low", tone: "warning", hint: "Refill soon" }
  } else {
    status = { label: "Critical", tone: "critical", hint: "Refill now" }
  }
  return {
    levelPct: Math.round(levelPct),
    capacityL,
    litersRemaining: Math.round((levelPct / 100) * capacityL * 10) / 10,
    status,
  }
}

function enrichPot(pot: RawPot): PotData {
  const meta = POT_META[pot.id]
  return {
    id: pot.id,
    name: meta.name,
    emoji: meta.emoji,
    moisture: pot.moisture,
    ph: pot.ph,
    moistureStatus: getMoistureStatus(pot.moisture, meta.moistureThresholds),
    phStatus: getPhStatus(pot.ph, meta.phThresholds),
    moistureSensor: pot.moistureSensor,
    phSensor: pot.phSensor,
    lastReadingAt: pot.lastReadingAt,
    lastValidMoisture: pot.lastValidMoisture,
    lastValidPh: pot.lastValidPh,
    trends: {
      moisture: sparkTrend(pot.sparklines.moisture, (r) => r.moisture, {
        unit: "%",
        minDelta: 1,
        decimals: 0,
      }),
      ph:
        pot.phSensor === "fault"
          ? null
          : sparkTrend(pot.sparklines.ph, (r) => r.ph, { minDelta: 0.1, decimals: 1 }),
    },
    sparklines: pot.sparklines,
  }
}

function enrichSystem(raw: RawSystem): GardenSystemData {
  return {
    pots: raw.pots.map(enrichPot),
    tank: tankFromRaw(raw.tank.levelPct, raw.tank.capacityL ?? TANK_CAPACITY_L),
    pumps: raw.pumps,
    ambient: {
      temperature: raw.ambient.temperature ?? 0,
      humidity: raw.ambient.humidity ?? 0,
      light: raw.ambient.light ?? 0,
    },
    raspberryPi: raw.raspberryPi,
    fetchedAt: Date.now(),
  }
}

export async function fetchGardenSystemData(): Promise<GardenSystemData> {
  const res = await fetch(`${BASE_URL}/api/system`)
  if (!res.ok) throw new Error(`GET /api/system failed: ${res.status}`)
  return enrichSystem((await res.json()) as RawSystem)
}

export async function fetchPotHistory(
  potId: PotId,
  metric: PotMetric,
  range: TimeRange
): Promise<SensorReading[]> {
  const res = await fetch(`${BASE_URL}/api/pots/${potId}/history?metric=${metric}&range=${range}`)
  if (!res.ok) throw new Error(`GET /api/pots/${potId}/history failed: ${res.status}`)
  return (await res.json()) as SensorReading[]
}
