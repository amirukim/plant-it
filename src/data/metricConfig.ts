import { Droplets, FlaskConical, Sun, Thermometer } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { PotMetric } from "@/types/plant"

export type MetricDisplay = {
  key: PotMetric
  label: string
  shortLabel: string
  unit: string
  color: string
  decimals: number
  format: (value: number) => string
  trendDecimals: number
}

export const METRIC_DISPLAY: Record<PotMetric, MetricDisplay> = {
  moisture: {
    key: "moisture",
    label: "Soil Moisture",
    shortLabel: "Moisture",
    unit: "%",
    color: "#58a65c",
    decimals: 0,
    format: (v) => `${Math.round(v)}%`,
    trendDecimals: 0,
  },
  ph: {
    key: "ph",
    label: "Soil pH",
    shortLabel: "pH",
    unit: "",
    color: "#6fa8dc",
    decimals: 1,
    format: (v) => v.toFixed(1),
    trendDecimals: 1,
  },
}

export type AmbientDisplay = {
  key: "temperature" | "humidity" | "light"
  label: string
  icon: LucideIcon
  color: string
  format: (value: number) => string
}

export const AMBIENT_DISPLAY: AmbientDisplay[] = [
  {
    key: "temperature",
    label: "Temperature",
    icon: Thermometer,
    color: "#e0a33c",
    format: (v) => `${v.toFixed(1)}°C`,
  },
  {
    key: "humidity",
    label: "Humidity",
    icon: Droplets,
    color: "#6fa8dc",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "light",
    label: "Light",
    icon: Sun,
    color: "#d99a2b",
    format: (v) => `${Math.round(v).toLocaleString("en-US")} lux`,
  },
]

export const METRIC_ICONS: Record<PotMetric, LucideIcon> = {
  moisture: Droplets,
  ph: FlaskConical,
}
