import type { MetricStatus } from "@/types/plant"

export type PhThresholds = {
  acidicMax: number
  slightlyAcidicMax: number
  optimalMax: number
  slightlyAlkalineMax: number
}

export const DEFAULT_PH_THRESHOLDS: PhThresholds = {
  acidicMax: 5.5,
  slightlyAcidicMax: 6.0,
  optimalMax: 7.0,
  slightlyAlkalineMax: 7.5,
}

export function getPhStatus(
  value: number | null,
  thresholds: PhThresholds = DEFAULT_PH_THRESHOLDS
): MetricStatus | null {
  if (value === null) return null
  if (value < thresholds.acidicMax) {
    return { label: "Too Acidic", tone: "critical", hint: "pH is too acidic" }
  }
  if (value < thresholds.slightlyAcidicMax) {
    return { label: "Slightly Acidic", tone: "warning", hint: "A touch acidic" }
  }
  if (value <= thresholds.optimalMax) {
    return { label: "Optimal", tone: "healthy" }
  }
  if (value <= thresholds.slightlyAlkalineMax) {
    return { label: "Slightly Alkaline", tone: "warning", hint: "A touch alkaline" }
  }
  return { label: "Too Alkaline", tone: "critical", hint: "pH is too alkaline" }
}
