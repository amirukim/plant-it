import type { MetricStatus, PotData, SensorHealth, StatusTone } from "@/types/plant"

export const SENSOR_HEALTH_META: Record<SensorHealth, { label: string; tone: StatusTone }> = {
  healthy: { label: "Healthy", tone: "healthy" },
  warning: { label: "Needs Attention", tone: "warning" },
  fault: { label: "Sensor Fault", tone: "critical" },
  offline: { label: "Offline", tone: "neutral" },
  "no-data": { label: "No Data", tone: "neutral" },
}

export function getPotOverallStatus(pot: PotData): MetricStatus {
  const sensors = [pot.moistureSensor, pot.phSensor]
  if (sensors.includes("fault")) {
    return { label: "Sensor Fault", tone: "critical" }
  }
  if (sensors.includes("offline") || sensors.includes("no-data")) {
    return { label: "No Data", tone: "neutral" }
  }
  const statuses = [pot.moistureStatus, pot.phStatus]
  if (statuses.some((s) => s?.tone === "critical")) {
    return { label: "Needs Attention", tone: "critical" }
  }
  if (statuses.some((s) => s?.tone === "warning") || sensors.includes("warning")) {
    return { label: "Needs Attention", tone: "warning" }
  }
  return { label: "Healthy", tone: "healthy" }
}

export function getPotsSummary(pots: PotData[]): { message: string; tone: StatusTone } {
  const faulted = pots.filter((p) => p.moistureSensor === "fault" || p.phSensor === "fault")
  if (faulted.length > 0) {
    const names = faulted.map((p) => p.name).join(", ")
    return {
      message: `⚠ ${names} sensor fault${faulted.length > 1 ? "s" : ""}`,
      tone: "critical",
    }
  }
  const needing = pots.filter((p) => getPotOverallStatus(p).tone !== "healthy")
  if (needing.length === 0) {
    return { message: "🌱 All 4 pots healthy", tone: "healthy" }
  }
  const optimal = pots.length - needing.length
  if (optimal === 0) {
    return { message: "⚠ All pots need attention", tone: "critical" }
  }
  return {
    message: `✨ ${optimal} of ${pots.length} pots in optimal condition`,
    tone: "info",
  }
}
