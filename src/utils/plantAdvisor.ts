import { getPlantById, PLANT_CATALOG } from "@/data/plantCatalog"
import { isAiPot } from "@/data/systemConfig"
import { getMoistureStatus, type MoistureThresholds } from "@/utils/moistureStatus"
import { getPhStatus, type PhThresholds } from "@/utils/phStatus"
import type {
  Ambient,
  GardenSystemData,
  PlantMatch,
  PlantMatchReason,
  PlantProfile,
  PlantAssignments,
  PotData,
  PotId,
  StatusTone,
} from "@/types/plant"

export const DEFAULT_WATERING = { min: 55, max: 75 }

const ALL_POTS: PotId[] = [1, 2, 3, 4]

const LIGHT_MEASURABLE_MIN = 1500

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function bandScore(value: number, min: number, max: number, falloff: number): number {
  if (value >= min && value <= max) return 100
  const distance = value < min ? min - value : value - max
  return clampScore(100 - (distance / falloff) * 100)
}

function scoreLabel(score: number): { label: string; tone: StatusTone } {
  if (score >= 85) return { label: "Great match", tone: "healthy" }
  if (score >= 70) return { label: "Good match", tone: "info" }
  if (score >= 50) return { label: "Possible", tone: "warning" }
  return { label: "Tough fit", tone: "critical" }
}

function tempReason(t: number, plant: PlantProfile, score: number): PlantMatchReason {
  if (t >= plant.temperature.min && t <= plant.temperature.max) {
    return { tone: "healthy", text: `Comfortable at your ${t.toFixed(1)}°C` }
  }
  if (t < plant.temperature.min) {
    return score >= 50
      ? { tone: "info", text: "Tolerates cooler rooms like yours" }
      : { tone: "critical", text: "Too cold in your room" }
  }
  return score >= 50
    ? { tone: "info", text: "Tolerates warm rooms like yours" }
    : { tone: "critical", text: "Too warm in your room" }
}

function humidityReason(h: number, plant: PlantProfile, score: number): PlantMatchReason {
  if (h >= plant.humidity.min && h <= plant.humidity.max) {
    return { tone: "healthy", text: `Loves your ${Math.round(h)}% humidity` }
  }
  if (h < plant.humidity.min) {
    return score >= 50
      ? { tone: "info", text: "Copes with your drier air" }
      : { tone: "critical", text: "Wants more humid air" }
  }
  return score >= 50
    ? { tone: "info", text: "Copes with your humid air" }
    : { tone: "critical", text: "Prefers less humid air" }
}

function lightReason(lux: number, plant: PlantProfile, score: number): PlantMatchReason {
  if (lux >= plant.light.min && lux <= plant.light.max) {
    return { tone: "healthy", text: `Your light (${(lux / 1000).toFixed(1)}k lux) suits it` }
  }
  if (lux < plant.light.min) {
    return score >= 50
      ? { tone: "info", text: "Manageable with your light levels" }
      : { tone: "critical", text: `Needs more light (~${Math.round(plant.light.min / 1000)}k+ lux)` }
  }
  return score >= 50
    ? { tone: "info", text: "Tolerates your bright spot" }
    : { tone: "critical", text: "Prefers a shadier spot" }
}

const reasonOrder: Record<StatusTone, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3,
  neutral: 4,
}

export function suggestPlants(ambient: Ambient): PlantMatch[] {
  const lightUsable = ambient.light >= LIGHT_MEASURABLE_MIN
  return PLANT_CATALOG.map((plant) => {
    const parts: { weight: number; score: number; reason: PlantMatchReason }[] = []

    const tempScore = bandScore(ambient.temperature, plant.temperature.min, plant.temperature.max, 8)
    parts.push({ weight: lightUsable ? 0.3 : 0.55, score: tempScore, reason: tempReason(ambient.temperature, plant, tempScore) })

    const humScore = bandScore(ambient.humidity, plant.humidity.min, plant.humidity.max, 20)
    parts.push({ weight: lightUsable ? 0.3 : 0.45, score: humScore, reason: humidityReason(ambient.humidity, plant, humScore) })

    if (lightUsable) {
      const lightScore = bandScore(ambient.light, plant.light.min, plant.light.max, 6000)
      parts.push({ weight: 0.4, score: lightScore, reason: lightReason(ambient.light, plant, lightScore) })
    }

    const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0)
    const score = Math.round(parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight)
    const { label, tone } = scoreLabel(score)
    const reasons = parts
      .map((p) => p.reason)
      .sort((a, b) => reasonOrder[a.tone] - reasonOrder[b.tone])
      .slice(0, 3)

    return { plant, score, label, tone, reasons }
  }).sort((a, b) => b.score - a.score)
}

export function isLightMeasurable(ambient: Ambient): boolean {
  return ambient.light >= LIGHT_MEASURABLE_MIN
}

export function plantMoistureThresholds(plant: PlantProfile): MoistureThresholds {
  return {
    veryLowMax: Math.max(5, plant.moisture.min - 15),
    lowMax: plant.moisture.min,
    optimalMax: plant.moisture.max,
    highMax: plant.moisture.max + 10,
  }
}

export function plantPhThresholds(plant: PlantProfile): PhThresholds {
  return {
    acidicMax: Math.max(4, plant.ph.min - 0.6),
    slightlyAcidicMax: plant.ph.min,
    optimalMax: plant.ph.max,
    slightlyAlkalineMax: plant.ph.max + 0.5,
  }
}

/**
 * AI-managed pots whose plant is fixed rather than picked from ambient matches.
 * Pot 3 replays the recorded Pak Choy dataset, so the advisor keeps it on pak-choy.
 */
export const AI_PINNED_PLANTS: Partial<Record<PotId, string>> = {
  3: "pak-choy",
}

export function applyAssignments(
  data: GardenSystemData,
  assignments: PlantAssignments
): GardenSystemData {
  const suggestions = suggestPlants(data.ambient)
  const aiPots = ALL_POTS.filter(isAiPot)
  const takenAuto = new Set<string>(
    aiPots
      .map((id) => AI_PINNED_PLANTS[id])
      .filter((id): id is string => typeof id === "string")
  )
  return {
    ...data,
    pots: data.pots.map((pot) => {
      if (!isAiPot(pot.id)) {
        return { ...pot, aiPowered: false, plant: undefined, plantAutoSelected: false }
      }
      const userPlant = getPlantById(assignments[pot.id])
      const pinnedPlant = getPlantById(AI_PINNED_PLANTS[pot.id])
      const autoPlant =
        pinnedPlant ?? suggestions.find((match) => !takenAuto.has(match.plant.id))?.plant
      const plant = userPlant ?? autoPlant
      if (!userPlant && autoPlant) takenAuto.add(autoPlant.id)
      const base = plant ? applyPlantToPot(pot, plant) : pot
      return { ...base, aiPowered: true, plantAutoSelected: !userPlant && !!plant }
    }),
  }
}

export function applyPlantToPot(pot: PotData, plant: PlantProfile): PotData {
  return {
    ...pot,
    name: plant.name,
    emoji: plant.emoji,
    plant,
    moistureStatus: getMoistureStatus(pot.moisture, plantMoistureThresholds(plant)),
    phStatus: getPhStatus(pot.ph, plantPhThresholds(plant)),
  }
}

export type WateringTarget = {
  potId: number
  plantName: string | null
  ai: boolean
  min: number
  max: number
  waterBelow: number
}

function adaptiveWaterBelow(plant: PlantProfile, now: number = Date.now()): number {
  const d = new Date(now)
  const hour = d.getHours() + d.getMinutes() / 60
  const bias = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 2
  return Math.round(plant.moisture.min + 5 + bias)
}

export function getWateringTargets(pots: PotData[]): WateringTarget[] {
  return pots.map((pot) => {
    const ai = pot.aiPowered ?? false
    if (ai && pot.plant) {
      const min = pot.plant.moisture.min
      const max = pot.plant.moisture.max
      return { potId: pot.id, plantName: pot.plant.name, ai, min, max, waterBelow: adaptiveWaterBelow(pot.plant) }
    }
    return {
      potId: pot.id,
      plantName: null,
      ai,
      min: DEFAULT_WATERING.min,
      max: DEFAULT_WATERING.max,
      waterBelow: DEFAULT_WATERING.min + 5,
    }
  })
}
