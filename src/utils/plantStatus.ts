import type { StatusTone, Trend } from "@/types/plant"

export function buildTrend(
  current: number | null,
  past: number | null,
  options: { unit?: string; relative?: boolean; minDelta?: number; decimals?: number }
): Trend | null {
  if (current === null || past === null) return null
  const delta = current - past
  const threshold = options.minDelta ?? (options.relative ? Math.abs(past) * 0.005 : 0.05)
  if (Math.abs(delta) < threshold) {
    return { direction: "flat", text: "Stable" }
  }
  const direction = delta > 0 ? "up" : "down"
  let text: string
  if (options.relative) {
    const pct = Math.round((delta / past) * 100)
    text = `${pct > 0 ? "+" : ""}${pct}%`
  } else {
    const decimals = options.decimals ?? 1
    text = `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}${options.unit ?? ""}`
  }
  return { direction, text: `${text} vs yesterday` }
}

export const toneBadge: Record<StatusTone, string> = {
  healthy: "bg-leaf-light text-leaf-dark",
  warning: "bg-warning/12 text-warning",
  critical: "bg-critical/10 text-critical",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
}

export const toneDot: Record<StatusTone, string> = {
  healthy: "bg-leaf",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}
