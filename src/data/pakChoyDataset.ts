import raw from "./pakChoyDataset.csv?raw"

/**
 * Recorded sample data for one Pak Choy plant (2026-09-01 → 2026-10-01,
 * four readings a day). The dashboard replays this dataset for the AI-managed
 * sample pot (Pot 3) so history, live values and pump activity all come from
 * real measurements instead of the synthetic simulator.
 *
 * Replay clock: one real second maps to 30 dataset minutes, so the full month
 * loops in ~24 minutes and values drift visibly between polls. Every page load
 * restarts the loop from the dataset's first row, which keeps manual testing
 * and automated checks deterministic.
 */

export type PakChoySample = {
  /** Epoch milliseconds of the recording (local time). */
  t: number
  moisture: number
  ph: number
  pumpOn: boolean
}

function parseDataset(): PakChoySample[] {
  const lines = raw.trim().split(/\r?\n/)
  const samples: PakChoySample[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",")
    if (cols.length < 5) continue
    const t = new Date(`${cols[0]}T${cols[1]}`).getTime()
    const moisture = Number.parseFloat(cols[2])
    const ph = Number.parseFloat(cols[3])
    if (Number.isNaN(t) || Number.isNaN(moisture) || Number.isNaN(ph)) continue
    samples.push({ t, moisture, ph, pumpOn: cols[4].trim().toUpperCase() === "ON" })
  }
  return samples.sort((a, b) => a.t - b.t)
}

export const PAK_CHOY_SAMPLES = parseDataset()

const FIRST_T = PAK_CHOY_SAMPLES[0].t
const LAST_T = PAK_CHOY_SAMPLES[PAK_CHOY_SAMPLES.length - 1].t
const SPAN_MS = LAST_T - FIRST_T
const REPLAY_SPEED = 1800 // dataset ms per real ms
const MODULE_LOAD = Date.now()

/** Dataset-domain timestamp that `realMs` maps to on the looping replay clock. */
export function pakChoyReplayTime(realMs: number): number {
  const pos = ((((realMs - MODULE_LOAD) * REPLAY_SPEED) % SPAN_MS) + SPAN_MS) % SPAN_MS
  return FIRST_T + pos
}

/** Index of the last sample recorded at or before `time` (dataset domain). */
function sampleIndexAt(time: number): number {
  let lo = 0
  let hi = PAK_CHOY_SAMPLES.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (PAK_CHOY_SAMPLES[mid].t > time) hi = mid - 1
    else lo = mid
  }
  return lo
}

function interpolate(field: "moisture" | "ph", time: number): number {
  const i = sampleIndexAt(time)
  const a = PAK_CHOY_SAMPLES[i]
  const b = PAK_CHOY_SAMPLES[Math.min(i + 1, PAK_CHOY_SAMPLES.length - 1)]
  if (b.t === a.t) return a[field]
  const frac = Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t)))
  return a[field] + (b[field] - a[field]) * frac
}

/** Soil moisture (%) at `t`, linearly interpolated between recorded readings. */
export function pakChoyMoistureAt(t: number): number {
  return Math.round(interpolate("moisture", pakChoyReplayTime(t)) * 10) / 10
}

/** Soil pH at `t`, linearly interpolated between recorded readings. */
export function pakChoyPhAt(t: number): number {
  return Math.round(interpolate("ph", pakChoyReplayTime(t)) * 100) / 100
}

export type PakChoyPumpState = {
  pumpOn: boolean
  /** Start (epoch ms) of the current pump run, or of the most recent finished one. */
  pumpActivatedAt: number
  /** Length of the most recent finished run in seconds; null while a run is active. */
  lastRunDurationSec: number | null
}

function pumpStateAt(time: number): PakChoyPumpState {
  const i = sampleIndexAt(time)
  const on = PAK_CHOY_SAMPLES[i].pumpOn
  // Walk back to where the current ON/OFF stretch began.
  let start = i
  while (start > 0 && PAK_CHOY_SAMPLES[start - 1].pumpOn === on) start--
  if (on) {
    return { pumpOn: true, pumpActivatedAt: PAK_CHOY_SAMPLES[start].t, lastRunDurationSec: null }
  }
  if (start === 0) {
    // The dataset begins mid-drought — no completed run on record yet.
    return { pumpOn: false, pumpActivatedAt: PAK_CHOY_SAMPLES[0].t, lastRunDurationSec: null }
  }
  // OFF: report when the previous (completed) ON run started and how long it ran.
  const runEnd = PAK_CHOY_SAMPLES[start].t
  let runBegin = start - 1
  while (runBegin > 0 && PAK_CHOY_SAMPLES[runBegin - 1].pumpOn) runBegin--
  const runStartTs = PAK_CHOY_SAMPLES[runBegin].t
  return {
    pumpOn: false,
    pumpActivatedAt: runStartTs,
    lastRunDurationSec: Math.max(1, Math.round((runEnd - runStartTs) / 1000)),
  }
}

/** Pump state at `t` following the recorded Water Pump Status column. */
export function pakChoyPumpStateAt(t: number): PakChoyPumpState {
  return pumpStateAt(pakChoyReplayTime(t))
}

/**
 * The recorded readings, timestamps shifted onto the replay clock so the last
 * sample ends at the current position — i.e. "the recording up to now".
 */
export function pakChoyHistory(realMs: number): PakChoySample[] {
  const offset = pakChoyReplayTime(realMs) - LAST_T
  return PAK_CHOY_SAMPLES.map((s) => ({ ...s, t: s.t + offset }))
}
