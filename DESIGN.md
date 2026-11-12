# DESIGN.md — Smart Garden Dashboard

Design direction for the 4-pot Raspberry Pi smart garden dashboard. This file is the source of
truth for visual decisions; `antislop.md` (when present) applies on top of it as a filter.

> Authored from the product owner's stated requirements, 2026-10-30. Edit freely; every decision
> below should keep a one-line reason (R-31 discipline).

## Identity

A real-time monitoring screen for a four-pot smart garden driven by a Raspberry Pi, intended to
run 24/7 on a dedicated wall/desk display in a Malaysian home grow. It must be readable from
across the room and stay calm enough to live with all day.

## Personality

Warm and friendly, never techy-cold. The reference blend: **Duolingo** (playful, encouraging
language and rounded shapes) × **Apple Health** (big clear numbers, restrained color) ×
**smart-home dashboards** (glanceable status, everything at a distance).

## Palette

Core palette (2 greens + cream neutrals, per R-29 discipline):

| Token | Hex | Role |
|---|---|---|
| Leaf green | `#58A65C` | Brand accent: decorative fills, dots, sparkline tint, shadows. Not used under white text. |
| Deep leaf | `#2F6B3C` | Text-safe green: surfaces that carry white text (chips, buttons, header tile), dark text on leaf-light. `--primary` resolves here for 4.5:1+ contrast. |
| Leaf light | `#E8F5E9` | Green tint surface for chips and icon tiles. |
| Cream | `#F8F6EF` | Page background. |
| Ink | `#26352A` | Foreground text. |

Status tones (semantic, separate from the brand greens) — always rendered as **text + icon + dot,
never color alone**:

- Healthy: deep leaf text on leaf-light
- Warning: `#8A5A10` amber text (4.5:1+ on its tint and on white)
- Critical: `#B03A3A` red text
- Info: `#3568A8` blue text
- Neutral: muted gray

## Typography

**Geist Variable** — chosen for neutrality and legibility at distance; tabular numerals on live
values so digits don't jitter as readings update.

## Layout

Bento grid (owner-requested direction, 2026-10-30): four **equal** pot cards in the primary grid —
equal because the pots are equals in the real system, and the pots are the stars of the show.
Water Tank (5/12) and Ambient (7/12) form a visually secondary row. Display Mode is the fullscreen
variant of the same hierarchy: oversized pot tiles, clock, and a one-line system strip.

## Motion

Subtle, purposeful only (MOTION 1): entrance stagger so the grid assembles calmly on load, a soft
pulse on the active pump dot and online indicator, animated number transitions when values change.
No parallax, no scroll choreography, no decorative loops.

## Content rules

- **No fabricated data**: pots without sensors show `--` / "Unavailable"; never invent values
  (R-17/R-38 discipline).
- Sample data is labeled: the replay pot reads "recorded readings · replaying live".
- Thresholds live in `src/data/systemConfig.ts`; components never hardcode sensor values.
- Offline/stale states keep the last valid data and say so.

## Dials

**ENERGY 1 / RHYTHM 2 / MOTION 1** — a calm ambient screen: uniform, quiet surfaces with slight
variation between the pot row and the system row, minimal motion.
