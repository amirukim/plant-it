export type PotId = 1 | 2 | 3 | 4

export type PotMetric = "moisture" | "ph"

export type TimeRange = "24H" | "7D" | "30D"

export type StatusTone = "healthy" | "warning" | "critical" | "info" | "neutral"

export type MetricStatus = {
  label: string
  tone: StatusTone
  hint?: string
}

export type SensorHealth = "healthy" | "warning" | "fault" | "offline" | "no-data"

export type TrendDirection = "up" | "down" | "flat"

export type Trend = {
  direction: TrendDirection
  text: string
}

export type SensorReading = {
  timestamp: number
  moisture?: number
  ph?: number
}

export type LastValidReading = {
  value: number
  at: number
}

export type PlantDifficulty = "easy" | "moderate" | "expert"

export type PlantProfile = {
  id: string
  name: string
  botanical?: string
  emoji: string
  description: string
  difficulty: PlantDifficulty
  moisture: { min: number; max: number }
  ph: { min: number; max: number }
  light: { min: number; max: number }
  temperature: { min: number; max: number }
  humidity: { min: number; max: number }
  wateringNote: string
}

export type PlantMatchReason = {
  tone: StatusTone
  text: string
}

export type PlantMatch = {
  plant: PlantProfile
  score: number
  label: string
  tone: StatusTone
  reasons: PlantMatchReason[]
}

export type PlantAssignments = Partial<Record<PotId, string>>

export type PotData = {
  id: PotId
  name: string
  emoji: string
  plant?: PlantProfile
  aiPowered?: boolean
  plantAutoSelected?: boolean
  moisture: number | null
  ph: number | null
  moistureStatus: MetricStatus | null
  phStatus: MetricStatus | null
  moistureSensor: SensorHealth
  phSensor: SensorHealth
  /** Timestamp of the latest reading; null when this pot has no sensors reporting yet. */
  lastReadingAt: number | null
  lastValidMoisture: LastValidReading | null
  lastValidPh: LastValidReading | null
  trends: { moisture: Trend | null; ph: Trend | null }
  sparklines: { moisture: SensorReading[]; ph: SensorReading[] }
}

export type Pump = {
  id: PotId
  potId: PotId
  /** "unavailable" = this pot has no pump data (no sensors installed yet). */
  status: "on" | "off" | "unavailable"
  lastActivatedAt: number
  lastRunDurationSec: number | null
}

export type WaterTank = {
  levelPct: number
  capacityL: number
  litersRemaining: number
  status: MetricStatus
}

export type Ambient = {
  temperature: number
  humidity: number
  light: number
}

export type PiStatus = {
  status: "online" | "offline"
  lastUpdate: number
}

export type GardenSystemData = {
  pots: PotData[]
  tank: WaterTank
  pumps: Pump[]
  ambient: Ambient
  raspberryPi: PiStatus
  fetchedAt: number
}
