# Smart Garden — 4-Pot Plant Monitoring Dashboard

A bento-style, real-time dashboard for a Raspberry Pi powered smart garden system with four plant pots.
Designed to run continuously on a dedicated screen — warm, friendly, and readable from across the room.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui (Radix)
- Recharts (trends & sparklines)
- Motion (subtle animations)
- TanStack Query (polling / live refresh)
- Lucide icons

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # serve the production build
npm run lint     # oxlint
```

## What's on the dashboard

- **Four pot cards** (the stars of the show) — every card shows the same per-pot set:
  overall status, soil moisture, soil pH, room temperature, pump status, and a history strip
  - **Pot 3** is the sample-data pot: it replays a recorded Pak Choy dataset
    (`src/data/pakChoyDataset.csv`, a month of 6-hourly moisture/pH/pump readings, Sep 1 – Oct 1)
    at 30 dataset-minutes per real second — values drift live, the pump follows the recorded
    ON/OFF schedule, and the card's history strip shows all 120 recorded readings
  - **Pot 4** demonstrates the sensor-fault UI: its pH sensor shows a `Sensor Fault` badge with
    the last valid reading; its moisture slot shows `Unavailable`
  - **Pots 1 & 2** have no sensors installed yet — every metric slot shows `--` / `Unavailable`
    (never fake values)
- **Water tank** — animated fill level, remaining liters, and configurable status thresholds
- **Ambient** — room temperature/humidity/light (shown per pot card as "Room" temp too)
- **Display Mode** — fullscreen layout with oversized pot cards, clock, and system strip
  (toggle in the header, Esc to exit)
- **Offline / stale states** — if the Pi stops reporting, the dashboard keeps showing the last valid
  data but clearly marks it as stale

Sensor Status, Watering Plan, Plant Analytics and Plant Advisor cards are **unmounted** in the
minimal layout but their components still exist under `src/components/dashboard/` and can be
re-added to `src/pages/Dashboard.tsx` at any time. The Plant Advisor engine
(`src/utils/plantAdvisor.ts`, `src/data/plantCatalog.ts`) still runs: it names Pot 3 **Pak Choy**
(pinned via `AI_PINNED_PLANTS`) and gives Pot 4 the best ambient match.

## Data layer

All readings come from `src/data/mockPlantData.ts`. Pot 3 replays the recorded Pak Choy dataset
(`src/data/pakChoyDataset.csv`, parsed in `src/data/pakChoyDataset.ts` — one real second = 30
dataset minutes, ~24 min per loop, restarting from the first row on page load). Pots 1/2 report
no sensors (`null` everywhere) and pot 4 carries a pH sensor fault. The UI consumes everything
through `usePlantData` / `usePotHistory` (TanStack Query, 5s polling) — no sensor values are
hardcoded in components.

To connect the real system (sensors → MQTT/REST → dashboard), replace the `fetch*` functions
in `src/data/mockPlantData.ts` with real API calls:

- Types: `src/types/plant.ts` (`GardenSystemData`, `PotData`, `Pump`, `WaterTank`, …)
- Per-pot moisture/pH thresholds: `src/data/systemConfig.ts`
- Status logic: `src/utils/moistureStatus.ts`, `src/utils/phStatus.ts`, `src/utils/sensorHealth.ts`

Simulate a disconnected Pi for UI testing with `?offline=1` (e.g. `http://localhost:5173/?offline=1`).

## Connecting real Raspberry Pi data

The dashboard ships with a ready-made API adapter (`src/data/api.ts`) and a mock/live switch
(`src/data/index.ts`, controlled by `VITE_USE_MOCK` — see `.env.example`).

For the full backend + Pi sensor service code, deployment steps, and a testing checklist, read
**[docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)**.
