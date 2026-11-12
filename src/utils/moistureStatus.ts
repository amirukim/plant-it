import type { MetricStatus } from "@/types/plant"

export type MoistureThresholds = {
  veryLowMax: number
  lowMax: number
  optimalMax: number
  highMax: number
}

export const DEFAULT_MOISTURE_THRESHOLDS: MoistureThresholds = {
  veryLowMax: 30,
  lowMax: 55,
  optimalMax: 75,
  highMax: 85,
}

export function getMoistureStatus(
  value: number | null,
  thresholds: MoistureThresholds = DEFAULT_MOISTURE_THRESHOLDS
): MetricStatus | null {
  if (value === null) return null
  if (value < thresholds.veryLowMax) {
    return { label: "Very Low", tone: "critical", hint: "Soil is very dry" }
  }
  if (value < thresholds.lowMax) {
    return { label: "Low", tone: "warning", hint: "Soil is getting dry" }
  }
  if (value <= thresholds.optimalMax) {
    return { label: "Optimal", tone: "healthy" }
  }
  if (value <= thresholds.highMax) {
    return { label: "High", tone: "warning", hint: "Soil is wetter than needed" }
  }
  return { label: "Very High", tone: "critical", hint: "Too wet, check drainage" }
}
