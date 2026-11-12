import { POT_META, TANK_CAPACITY_L, TANK_THRESHOLDS } from "@/data/systemConfig"
import {
  pakChoyHistory,
  pakChoyMoistureAt,
  pakChoyPhAt,
  pakChoyPumpStateAt,
} from "@/data/pakChoyDataset"
import { getMoistureStatus } from "@/utils/moistureStatus"
import { getPhStatus } from "@/utils/phStatus"
import { buildTrend } from "@/utils/plantStatus"
import type {
  Ambient,
  GardenSystemData,
  PiStatus,
  PotData,
  PotId,
  PotMetric,
  Pump,
  SensorReading,
  TimeRange,
  WaterTank,
} from "@/types/plant"

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

// Pot 3 is the sample-data pot: its readings replay the recorded Pak Choy
// dataset (see src/data/pakChoyDataset.ts). Pots 1 and 2 have no sensors
// installed yet, and pot 4 only has a (faulted) pH sensor.
const REPLAY_POT: PotId = 3
const PH_FAULT_POT: PotId = 4

const PH_BASE = 6.5
const PH_FAULT_AGO_MS = 2.2 * MINUTE

const POT_IDS: PotId[] = [1, 2, 3, 4]

const SIMULATE_OFFLINE =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("offline") === "1"

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(t: number, seed: number, wavelengthMs: number): number {
  const x = t / wavelengthMs + seed * 97
  const i = Math.floor(x)
  const f = x - i
  const a = hash01(i)
  const b = hash01(i + 1)
  const u = f * f * (3 - 2 * f)
  return (a + (b - a) * u) * 2 - 1
}

function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function hourOfDay(t: number): number {
  const d = new Date(t)
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

function phFaultStart(dataTime: number): number {
  return dataTime - PH_FAULT_AGO_MS
}

function temperatureAt(t: number): number {
  const frac = hourOfDay(t) / 24
  return 25.2 + 3.4 * Math.sin((frac - 0.13) * Math.PI * 2) + smoothNoise(t, 1, 45 * MINUTE) * 0.3
}

function humidityAt(t: number): number {
  const frac = hourOfDay(t) / 24
  const value = 64 + 7.5 * Math.sin((frac - 0.62) * Math.PI * 2) + smoothNoise(t, 5, 55 * MINUTE) * 1.0
  return Math.round(Math.max(35, Math.min(92, value)))
}

function lightAt(t: number): number {
  const h = hourOfDay(t)
  const sunrise = 6.3
  const sunset = 18.7
  const daylight = h > sunrise && h < sunset ? Math.sin((Math.PI * (h - sunrise)) / (sunset - sunrise)) : 0
  const cloud = 0.72 + 0.28 * (smoothNoise(t, 4, 50 * MINUTE) * 0.5 + 0.5)
  const ambient = 900 + 260 * (smoothNoise(t, 8, 90 * MINUTE) * 0.5 + 0.5)
  return Math.round(Math.max(240, ambient + 9600 * daylight * cloud + smoothNoise(t, 6, 15 * MINUTE) * 120))
}

function tankAt(dataTime: number): WaterTank {
  const levelPct = 78 + smoothNoise(dataTime, 21, 20 * MINUTE) * 0.5
  const liters = (levelPct / 100) * TANK_CAPACITY_L
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
    capacityL: TANK_CAPACITY_L,
    litersRemaining: Math.round(liters * 10) / 10,
    status,
  }
}

function pumpsAt(dataTime: number): Pump[] {
  const replayPump = pakChoyPumpStateAt(dataTime)
  const idleStamp = startOfDay(dataTime)
  return POT_IDS.map((potId) => {
    if (potId === REPLAY_POT) {
      return {
        id: potId,
        potId,
        status: replayPump.pumpOn ? "on" : "off",
        lastActivatedAt: replayPump.pumpActivatedAt,
        lastRunDurationSec: replayPump.pumpOn ? null : replayPump.lastRunDurationSec,
      }
    }
    // No sensors on this pot yet — pump state unknown.
    return { id: potId, potId, status: "unavailable", lastActivatedAt: idleStamp, lastRunDurationSec: null }
  })
}

function replayPot(dataTime: number): PotData {
  const meta = POT_META[REPLAY_POT]
  const moisture = Math.round(pakChoyMoistureAt(dataTime))
  const ph = pakChoyPhAt(dataTime)

  // Full recorded month, sliding with the replay head — this is the card's
  // "history data" strip.
  const recorded = pakChoyHistory(dataTime)
  const moistureSpark: SensorReading[] = recorded.map((r) => ({ timestamp: r.t, moisture: r.moisture }))
  const phSpark: SensorReading[] = recorded.map((r) => ({ timestamp: r.t, ph: r.ph }))

  return {
    id: REPLAY_POT,
    name: meta.name,
    emoji: meta.emoji,
    moisture,
    ph,
    moistureStatus: getMoistureStatus(moisture, meta.moistureThresholds),
    phStatus: getPhStatus(ph, meta.phThresholds),
    moistureSensor: "healthy",
    phSensor: "healthy",
    lastReadingAt: dataTime - 2_000,
    lastValidMoisture: { value: moisture, at: dataTime - 2_000 },
    lastValidPh: { value: ph, at: dataTime - 2_000 },
    trends: {
      moisture: buildTrend(moisture, Math.round(pakChoyMoistureAt(dataTime - DAY)), {
        unit: "%",
        minDelta: 1,
        decimals: 0,
      }),
      ph: buildTrend(ph, pakChoyPhAt(dataTime - DAY), { minDelta: 0.1, decimals: 1 }),
    },
    sparklines: { moisture: moistureSpark, ph: phSpark },
  }
}

function phFaultPot(dataTime: number): PotData {
  const meta = POT_META[PH_FAULT_POT]
  const faultStart = phFaultStart(dataTime)
  const lastValidPh = Math.round((PH_BASE + smoothNoise(faultStart, PH_FAULT_POT + 11, 3 * HOUR) * 0.14) * 10) / 10
  return {
    id: PH_FAULT_POT,
    name: meta.name,
    emoji: meta.emoji,
    moisture: null,
    ph: null,
    moistureStatus: null,
    phStatus: null,
    moistureSensor: "no-data",
    phSensor: "fault",
    lastReadingAt: faultStart,
    lastValidMoisture: null,
    lastValidPh: { value: lastValidPh, at: faultStart },
    trends: { moisture: null, ph: null },
    sparklines: { moisture: [], ph: [] },
  }
}

function noSensorPot(pot: PotId): PotData {
  const meta = POT_META[pot]
  return {
    id: pot,
    name: meta.name,
    emoji: meta.emoji,
    moisture: null,
    ph: null,
    moistureStatus: null,
    phStatus: null,
    moistureSensor: "no-data",
    phSensor: "no-data",
    lastReadingAt: null,
    lastValidMoisture: null,
    lastValidPh: null,
    trends: { moisture: null, ph: null },
    sparklines: { moisture: [], ph: [] },
  }
}

function buildPot(pot: PotId, dataTime: number): PotData {
  if (pot === REPLAY_POT) return replayPot(dataTime)
  if (pot === PH_FAULT_POT) return phFaultPot(dataTime)
  return noSensorPot(pot)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveDataTime(): { dataTime: number; pi: PiStatus } {
  const now = Date.now()
  if (SIMULATE_OFFLINE) {
    const lastUpdate = now - 2.5 * MINUTE
    return { dataTime: lastUpdate, pi: { status: "offline", lastUpdate } }
  }
  return { dataTime: now, pi: { status: "online", lastUpdate: now - 2_000 } }
}

export async function fetchGardenSystemData(): Promise<GardenSystemData> {
  await delay(240)
  const { dataTime, pi } = resolveDataTime()
  const ambient: Ambient = {
    temperature: Math.round(temperatureAt(dataTime) * 10) / 10,
    humidity: humidityAt(dataTime),
    light: lightAt(dataTime),
  }

  return {
    pots: POT_IDS.map((pot) => buildPot(pot, dataTime)),
    tank: tankAt(dataTime),
    pumps: pumpsAt(dataTime),
    ambient,
    raspberryPi: pi,
    fetchedAt: Date.now(),
  }
}

export async function fetchPotHistory(
  potId: PotId,
  metric: PotMetric,
  range: TimeRange
): Promise<SensorReading[]> {
  await delay(200)

  // Only the sample pot has recorded history; other pots have no sensors yet.
  if (potId !== REPLAY_POT) return []

  const { dataTime } = resolveDataTime()
  const windowMs = range === "24H" ? DAY : range === "7D" ? 7 * DAY : 30 * DAY
  const from = pakChoyHistory(dataTime).at(-1)!.t - windowMs
  return pakChoyHistory(dataTime)
    .filter((row) => row.t >= from)
    .map((row) =>
      metric === "moisture" ? { timestamp: row.t, moisture: row.moisture } : { timestamp: row.t, ph: row.ph }
    )
}
