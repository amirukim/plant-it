const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
})

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

export function formatTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp))
}

export function formatClock(timestamp: number): string {
  return clockFormatter.format(new Date(timestamp))
}

export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

export function formatChartTick(timestamp: number, range: string): string {
  const d = new Date(timestamp)
  if (range === "24H") {
    const hour = d.getHours()
    const label = d.getHours() === 0 ? 12 : d.getHours() > 12 ? d.getHours() - 12 : d.getHours()
    return `${label}${hour < 12 ? "am" : "pm"}`
  }
  if (range === "7D") return weekdayFormatter.format(d)
  return shortDateFormatter.format(d)
}

export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((now - timestamp) / 1000))
  if (diffSec < 10) return "just now"
  if (diffSec < 60) return `${diffSec} sec ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const days = Math.round(diffHr / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}

export function formatDayLabel(timestamp: number, now: number = Date.now()): string {
  const startOfDay = (t: number) => {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const dayDiff = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000)
  if (dayDiff === 0) return "Today"
  if (dayDiff === 1) return "Yesterday"
  return `${dayDiff} days ago`
}

export function formatDayTime(timestamp: number, now: number = Date.now()): string {
  const startOfDay = (t: number) => {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const dayDiff = Math.round((startOfDay(timestamp) - startOfDay(now)) / 86_400_000)
  const time = formatTime(timestamp)
  if (dayDiff === 0) return `Today, ${time}`
  if (dayDiff === 1) return `Tomorrow, ${time}`
  if (dayDiff === -1) return `Yesterday, ${time}`
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(timestamp))
  return `${weekday}, ${time}`
}

export function formatUptime(totalSec: number): string {
  const days = Math.floor(totalSec / 86_400)
  const hours = Math.floor((totalSec % 86_400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatLight(lux: number): string {
  if (lux >= 1000) return `${(lux / 1000).toFixed(1)}k lux`
  return `${Math.round(lux)} lux`
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
