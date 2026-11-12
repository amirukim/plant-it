import type { PotId } from "@/types/plant"
import { DEFAULT_MOISTURE_THRESHOLDS, type MoistureThresholds } from "@/utils/moistureStatus"
import { DEFAULT_PH_THRESHOLDS, type PhThresholds } from "@/utils/phStatus"

export type PotMeta = {
  id: PotId
  name: string
  emoji: string
  moistureThresholds: MoistureThresholds
  phThresholds: PhThresholds
}

export const POT_META: Record<PotId, PotMeta> = {
  1: {
    id: 1,
    name: "Pot 1",
    emoji: "🪴",
    moistureThresholds: DEFAULT_MOISTURE_THRESHOLDS,
    phThresholds: DEFAULT_PH_THRESHOLDS,
  },
  2: {
    id: 2,
    name: "Pot 2",
    emoji: "🌿",
    moistureThresholds: DEFAULT_MOISTURE_THRESHOLDS,
    phThresholds: DEFAULT_PH_THRESHOLDS,
  },
  3: {
    id: 3,
    name: "Pot 3",
    emoji: "🌱",
    moistureThresholds: DEFAULT_MOISTURE_THRESHOLDS,
    phThresholds: DEFAULT_PH_THRESHOLDS,
  },
  4: {
    id: 4,
    name: "Pot 4",
    emoji: "🪷",
    moistureThresholds: DEFAULT_MOISTURE_THRESHOLDS,
    phThresholds: DEFAULT_PH_THRESHOLDS,
  },
}

export const TANK_THRESHOLDS = {
  goodMin: 75,
  normalMin: 30,
  lowMin: 10,
}

export const TANK_CAPACITY_L = 16

export const AI_MANAGED_POTS: readonly PotId[] = [3, 4]

export function isAiPot(potId: PotId): boolean {
  return AI_MANAGED_POTS.includes(potId)
}
