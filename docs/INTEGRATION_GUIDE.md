# Integration Guide — Connecting Real Raspberry Pi Sensors to the Dashboard

This guide takes your team from the current mock-data dashboard to live sensor data, step by step.
No frontend framework knowledge is required beyond copying the provided files.

---

## Table of contents

1. [Big picture — how data flows](#1-big-picture--how-data-flows)
2. [The contract — what the dashboard expects](#2-the-contract--what-the-dashboard-expects)
3. [Step 1 — Backend API (FastAPI + SQLite)](#step-1--backend-api-fastapi--sqlite)
4. [Step 2 — Raspberry Pi sensor service](#step-2--raspberry-pi-sensor-service)
5. [Step 3 — Switch the dashboard to live data](#step-3--switch-the-dashboard-to-live-data)
6. [Step 4 — Optional: real-time push (WebSocket)](#step-4--optional-real-time-push-websocket)
7. [Step 5 — Tuning thresholds per pot](#step-5--tuning-thresholds-per-pot)
8. [Step 6 — Deployment (run it on the Pi 24/7)](#step-6--deployment-run-it-on-the-pi-247)
9. [Testing checklist](#testing-checklist)
10. [Common pitfalls & FAQ](#common-pitfalls--faq)

---

## 1. Big picture — how data flows

The dashboard never talks to hardware. There are exactly three pieces:

```
┌─────────────────────┐      every 2–10 s       ┌──────────────────────┐     poll every 5 s    ┌─────────────────────┐
│  Raspberry Pi       │  ─────────────────────► │  Backend API         │  ◄─────────────────── │  React Dashboard    │
│  sensor service     │   POST /api/snapshots   │  (FastAPI + SQLite)  │   GET /api/system     │  (this project)     │
│  (Python)           │                          │  stores history      │   GET /api/pots/...   │                     │
└─────────────────────┘                          └──────────────────────┘                       └─────────────────────┘
```

- The **Pi service** reads sensors, controls pumps, and POSTs one small JSON snapshot every few seconds.
- The **backend** stores every reading in SQLite (for history/analytics) and serves the latest state.
- The **dashboard** polls the backend (TanStack Query, already built in) and renders.

The backend can run **on the Pi itself** (recommended — one box, no CORS, no extra server).

Where the mock data lives today (you will **not** delete these files):

```
src/data/mockPlantData.ts     ← simulator (used in dev)
src/data/pakChoyDataset.csv   ← recorded sample data for one Pak Choy plant (Sep 1 – Oct 1)
src/data/pakChoyDataset.ts    ← parses the CSV + replay clock (used by the mock)
src/data/api.ts               ← real API adapter  ← already written for you
src/data/index.ts             ← picks mock or real based on VITE_USE_MOCK
src/hooks/usePlantData.ts     ← React hooks — do not change
```

Switching from mock to live data is literally **one environment variable** (see Step 3).

---

## 2. The contract — what the dashboard expects

All timestamps are **epoch milliseconds** (JavaScript `Date.now()` style, e.g. `1760000000000`).
All keys are **camelCase**. Sensors that have no current value must be `null` — **never send a stale value as current**.

### `GET /api/system` — current state

```jsonc
{
  "pots": [
    {
      "id": 1,
      "moisture": 68,                 // number, or null if the sensor has no current value
      "ph": 6.4,                      // number, or null
      "moistureSensor": "healthy",    // "healthy" | "warning" | "fault" | "offline" | "no-data"
      "phSensor": "healthy",
      "lastReadingAt": 1760000000000, // when this pot last reported; null if it has no sensors yet
      "lastValidMoisture": { "value": 68, "at": 1760000000000 },  // shown when the sensor faults
      "lastValidPh": { "value": 6.4, "at": 1760000000000 },
      "sparklines": {                 // last 24 h, one point per 30 min (48 points max)
        "moisture": [{ "timestamp": 1759913000000, "moisture": 65 }],
        "ph": [{ "timestamp": 1759913000000, "ph": 6.3 }]
      }
    },
    {
      "id": 3,
      "moisture": 45,
      "ph": null,                     // ← pH sensor is faulty: null, not a stale number
      "moistureSensor": "healthy",
      "phSensor": "fault",
      "lastReadingAt": 1760000000000,
      "lastValidMoisture": { "value": 45, "at": 1760000000000 },
      "lastValidPh": { "value": 5.9, "at": 1759999900000 },
      "sparklines": {
        "moisture": [{ "timestamp": 1759913000000, "moisture": 47 }],
        "ph": [{ "timestamp": 1759913000000, "ph": 5.9 }]
      }
    }
    // pots 2 and 4 follow the same shape
  ],
  "tank": { "levelPct": 78, "capacityL": 16 },
  "pumps": [
    { "id": 1, "potId": 1, "status": "off", "lastActivatedAt": 1759942320000, "lastRunDurationSec": 14 },
    { "id": 3, "potId": 3, "status": "on", "lastActivatedAt": 1759999988000, "lastRunDurationSec": null }
  ],
  "ambient": { "temperature": 28.4, "humidity": 72, "light": 8420 },
  "raspberryPi": { "status": "online", "lastUpdate": 1760000000000 }
}
```

**Important semantics the UI depends on:**

| Field | Rule |
|---|---|
| `moisture` / `ph` | `null` renders as `--` with fault messaging. `0` is a *valid* reading — don't use 0 to mean "missing". |
| `moistureSensor` / `phSensor` | `"fault"` makes the pot show the red badge + "sensor unavailable" + last valid value |
| `raspberryPi.lastUpdate` | Must be the **real** time of the last received snapshot. Older than 2 min ⇒ UI switches to "Reconnecting…"; `status: "offline"` ⇒ red "Pi Offline" banner. Don't fake it. |
| `sparklines` | Only needed for the mini charts on the pot cards. 24 h @ 30-min buckets. |
| `tank.capacityL` | Optional — defaults to 16 L (see `src/data/systemConfig.ts`) |

The **statuses you don't send** — "Optimal", "Low", "Too Acidic", tank "Good/Low", trends, hints — are all **computed by the frontend** from thresholds in `src/data/systemConfig.ts`. The backend only ships raw numbers. Thresholds stay in one place.

### `GET /api/pots/{id}/history?metric=moisture|ph&range=24H|7D|30D`

```jsonc
[
  { "timestamp": 1759913000000, "moisture": 65 },
  { "timestamp": 1759914200000, "moisture": 66 }
]
```

- `metric` selects which key each point carries (`moisture` or `ph`).
- Recommended bucket sizes (matches the chart, ~50–72 points per range):
  - `24H` → one point per 20 min
  - `7D` → one point per 3 h
  - `30D` → one point per 12 h
- For a faulted sensor, simply stop the series when the fault began — the analytics card shows a "history ends HH:MM" note automatically.

---

## Step 1 — Backend API (FastAPI + SQLite)

Create a folder next to the dashboard project, e.g. `garden-api/`:

```
garden-api/
├── main.py
└── requirements.txt    # fastapi, uvicorn[standard]
```

`requirements.txt`:

```
fastapi>=0.115
uvicorn[standard]>=0.30
```

`main.py` — complete, runnable:

```python
import json
import sqlite3
import time
from contextlib import closing
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DB_PATH = Path(__file__).parent / "garden.db"

FAULT_AFTER_MS = 120_000                       # sensor silent > 2 min  -> fault
PI_OFFLINE_AFTER_MS = 120_000                  # no snapshot > 2 min    -> Pi offline
SPARK_WINDOW_MS = 24 * 3600 * 1000
SPARK_STEP_MS = 30 * 60 * 1000

WINDOWS = {"24H": 24 * 3600 * 1000, "7D": 7 * 24 * 3600 * 1000, "30D": 30 * 24 * 3600 * 1000}
STEPS = {"24H": 20 * 60 * 1000, "7D": 3 * 3600 * 1000, "30D": 12 * 3600 * 1000}

app = FastAPI(title="Smart Garden API")

# Only needed if the dashboard runs on a different origin than the API.
# If you serve the dashboard from this server (Step 6), you can remove this.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


with closing(db()) as conn:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS readings (
            ts       INTEGER NOT NULL,
            pot_id   INTEGER NOT NULL,
            moisture REAL,
            ph       REAL
        );
        CREATE INDEX IF NOT EXISTS idx_readings ON readings (pot_id, ts);

        CREATE TABLE IF NOT EXISTS state (
            id   INTEGER PRIMARY KEY CHECK (id = 1),
            json TEXT NOT NULL,
            ts   INTEGER NOT NULL
        );
        """
    )


def now_ms() -> int:
    return int(time.time() * 1000)


# ---------- ingestion ----------

class PotIn(BaseModel):
    id: int
    moisture: Optional[float] = None
    ph: Optional[float] = None
    lastReadingAt: Optional[int] = None


class PumpIn(BaseModel):
    id: int
    potId: int
    status: str                       # "on" | "off" | "unavailable" (no pump data for this pot)
    lastActivatedAt: Optional[int] = None
    lastRunDurationSec: Optional[int] = None


class SnapshotIn(BaseModel):
    pots: list[PotIn]
    tank: dict                        # {"levelPct": 78, "capacityL": 16}
    pumps: list[PumpIn]
    ambient: dict                     # {"temperature": 28.4, "humidity": 72, "light": 8420}


@app.post("/api/snapshots")
def ingest(snap: SnapshotIn):
    ts = now_ms()
    with closing(db()) as conn, conn:
        for pot in snap.pots:
            reading_ts = pot.lastReadingAt or ts
            if pot.moisture is not None or pot.ph is not None:
                conn.execute(
                    "INSERT INTO readings (ts, pot_id, moisture, ph) VALUES (?, ?, ?, ?)",
                    (reading_ts, pot.id, pot.moisture, pot.ph),
                )
        conn.execute(
            "INSERT OR REPLACE INTO state (id, json, ts) VALUES (1, ?, ?)",
            (snap.model_dump_json(), ts),
        )
    return {"ok": True}


# ---------- helpers ----------

def bucketed(pot_id: int, metric: str, window_ms: int, step_ms: int) -> list[dict]:
    """Averages readings into fixed time buckets. metric: 'moisture' | 'ph'."""
    start = now_ms() - window_ms
    with closing(db()) as conn:
        rows = conn.execute(
            f"""
            SELECT (ts / {step_ms}) * {step_ms} AS bucket, AVG({metric}) AS v
            FROM readings
            WHERE pot_id = ? AND ts > ? AND {metric} IS NOT NULL
            GROUP BY bucket ORDER BY bucket
            """,
            (pot_id, start),
        ).fetchall()
    return [{"timestamp": r["bucket"], metric: round(r["v"], 2)} for r in rows]


def sensor_health(pot_id: int, metric: str) -> str:
    with closing(db()) as conn:
        row = conn.execute(
            f"SELECT MAX(ts) AS m FROM readings WHERE pot_id = ? AND {metric} IS NOT NULL",
            (pot_id,),
        ).fetchone()
    last = row["m"] if row else None
    if last is None:
        return "no-data"
    return "healthy" if now_ms() - last < FAULT_AFTER_MS else "fault"


def last_valid(pot_id: int, metric: str) -> Optional[dict]:
    with closing(db()) as conn:
        row = conn.execute(
            f"SELECT ts, {metric} AS v FROM readings WHERE pot_id = ? AND {metric} IS NOT NULL "
            f"ORDER BY ts DESC LIMIT 1",
            (pot_id,),
        ).fetchone()
    return {"value": row["v"], "at": row["ts"]} if row else None


# ---------- dashboard endpoints ----------

@app.get("/api/system")
def system():
    with closing(db()) as conn:
        row = conn.execute("SELECT json, ts FROM state WHERE id = 1").fetchone()
    if row is None:
        raise HTTPException(503, "No snapshot received yet — start the Pi sensor service")

    snap = json.loads(row["json"])
    online = now_ms() - row["ts"] < PI_OFFLINE_AFTER_MS

    pots = []
    for pot in snap["pots"]:
        pots.append(
            {
                "id": pot["id"],
                "moisture": pot["moisture"],
                "ph": pot["ph"],
                "moistureSensor": sensor_health(pot["id"], "moisture"),
                "phSensor": sensor_health(pot["id"], "ph"),
                "lastReadingAt": pot.get("lastReadingAt") or row["ts"],
                "lastValidMoisture": last_valid(pot["id"], "moisture"),
                "lastValidPh": last_valid(pot["id"], "ph"),
                "sparklines": {
                    "moisture": bucketed(pot["id"], "moisture", SPARK_WINDOW_MS, SPARK_STEP_MS),
                    "ph": bucketed(pot["id"], "ph", SPARK_WINDOW_MS, SPARK_STEP_MS),
                },
            }
        )

    return {
        "pots": pots,
        "tank": snap["tank"],
        "pumps": snap["pumps"],
        "ambient": snap["ambient"],
        "raspberryPi": {"status": "online" if online else "offline", "lastUpdate": row["ts"]},
    }


@app.get("/api/pots/{pot_id}/history")
def history(
    pot_id: int,
    metric: str = Query("moisture"),
    range: str = Query("24H"),
):
    if metric not in ("moisture", "ph"):
        raise HTTPException(400, "metric must be 'moisture' or 'ph'")
    if range not in WINDOWS:
        raise HTTPException(400, "range must be 24H, 7D or 30D")
    return bucketed(pot_id, metric, WINDOWS[range], STEPS[range])


# ---------- optional: serve the built dashboard (see Step 6) ----------
# dist_path = Path(__file__).parent / "dashboard-dist"
# if dist_path.exists():
#     app.mount("/", StaticFiles(directory=dist_path, html=True), name="dashboard")
```

Run it:

```bash
cd garden-api
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Sanity check:

```bash
# post one fake snapshot
curl -X POST http://localhost:8000/api/snapshots -H "Content-Type: application/json" -d '{
  "pots": [{"id":1,"moisture":68,"ph":6.4}],
  "tank": {"levelPct":78,"capacityL":16},
  "pumps": [{"id":1,"potId":1,"status":"off","lastActivatedAt":0,"lastRunDurationSec":14}],
  "ambient": {"temperature":28.4,"humidity":72,"light":8420}
}'

# then verify
curl http://localhost:8000/api/system
```

> **Note:** when the Pi service is running and posting snapshots, **stop curl-ing fake ones** — everything the dashboard shows comes from the last snapshot + the readings table.

---

## Step 2 — Raspberry Pi sensor service

This skeleton covers: 4 moisture sensors + 4 pH probes (analog, via two ADS1115 ADCs), ambient (DHT22 + BH1750), water level, and 4 pump relays with a simple auto-watering loop.

```
garden-api/
└── pi/
    ├── sensor_service.py
    └── requirements.txt
```

`pi/requirements.txt`:

```
requests>=2.31
board>=1.0
busio>=1.0
adafruit-circuitpython-ads1x15>=2.2
adafruit-circuitpython-dht>=4.0
adafruit-circuitpython-bh1750>=1.1
gpiozero>=2.0
```

`pi/sensor_service.py`:

```python
"""
Smart Garden Pi sensor service.
Reads sensors, runs the auto-watering loop, POSTs a snapshot to the backend every READ_INTERVAL sec.

Adapt the PIN / CHANNEL constants to your wiring. Calibrate MOISTURE_CAL and PH_CAL first!
"""
import time
import logging

import board
import busio
import requests
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
import adafruit_dht
import adafruit_bh1750
from gpiozero import OutputDevice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("garden")

API_URL = "http://localhost:8000"        # backend on the same Pi; change if remote
READ_INTERVAL = 5                        # seconds between posts (2–10 s is fine)
POST_TIMEOUT = 5

# ---- wiring (ADJUST TO YOUR SETUP) -------------------------------------------
I2C = busio.I2C(board.S3, board.S2)
ADC_MAIN = ADS.ADS1115(I2C, address=0x48)       # pots 1–2 moisture + pH  (channels 0–3)
ADC_AUX = ADS.ADS1115(I2C, address=0x49)        # pots 3–4 moisture + pH  (channels 0–3)

MOISTURE_CHAN = {                              # pot id -> (adc, channel)
    1: (ADC_MAIN, 0), 2: (ADC_MAIN, 1), 3: (ADC_AUX, 0), 4: (ADC_AUX, 1),
}
PH_CHAN = {
    1: (ADC_MAIN, 2), 2: (ADC_MAIN, 3), 3: (ADC_AUX, 2), 4: (ADC_AUX, 3),
}

DHT = adafruit_dht.DHT22(board.D4)              # ambient temperature + humidity
LIGHT = adafruit_bh1750.BH1750(I2C)             # ambient light (lux)

WATER_LEVEL_PIN = "GPIO17"                      # e.g. float switch / level sensor
PUMP_PINS = {1: "GPIO27", 2: "GPIO22", 3: "GPIO23", 4: "GPIO24"}

PUMPS = {pid: OutputDevice(pin, active_high=True, initial_value=False)
         for pid, pin in PUMP_PINS.items()}

# ---- calibration (DO THIS BEFORE TRUSTING VALUES) ----------------------------
# 1. Put the moisture sensor in dry air  -> note the voltage  (e.g. 2.90)
# 2. Put it in a glass of water          -> note the voltage  (e.g. 1.20)
MOISTURE_CAL = {"dry_v": 2.90, "wet_v": 1.20}   # volts;  dry -> 0%,  wet -> 100%

# pH: measure two buffer solutions and note voltages.
PH_CAL = {"ph4_v": 3.05, "ph7_v": 2.53}         # volts in pH 4.0 and pH 7.0 buffer

# ---- auto-watering ------------------------------------------------------------
MOISTURE_MIN = {1: 55, 2: 55, 3: 55, 4: 55}     # pump starts below this %
MOISTURE_MAX = {1: 65, 2: 65, 3: 65, 4: 65}     # pump stops above this %
WATER_LOW_PCT = 10                              # never pump below this tank level


def read_voltage(adc, channel) -> float:
    return AnalogIn(adc, channel).voltage


def volts_to_moisture_pct(v: float) -> float:
    lo, hi = MOISTURE_CAL["wet_v"], MOISTURE_CAL["dry_v"]
    pct = (hi - v) / (hi - lo) * 100.0
    return max(0.0, min(100.0, pct))


def volts_to_ph(v: float) -> float:
    slope = (4.0 - 7.0) / (PH_CAL["ph4_v"] - PH_CAL["ph7_v"])
    return 7.0 + (v - PH_CAL["ph7_v"]) * slope


def read_pot(pot_id: int) -> dict:
    """Read one pot. If a sensor read fails, send None — never a stale value."""
    moisture = None
    ph = None
    try:
        adc, ch = MOISTURE_CHAN[pot_id]
        moisture = round(volts_to_moisture_pct(read_voltage(adc, ch)), 1)
    except Exception as e:
        log.warning("pot %d moisture read failed: %s", pot_id, e)
    try:
        adc, ch = PH_CHAN[pot_id]
        ph = round(volts_to_ph(read_voltage(adc, ch)), 1)
    except Exception as e:
        log.warning("pot %d pH read failed: %s", pot_id, e)
    return {"id": pot_id, "moisture": moisture, "ph": ph}


def read_ambient() -> dict:
    try:
        temperature = round(DHT.temperature, 1)
    except Exception:
        temperature = None
    try:
        humidity = round(DHT.humidity, 0)
    except Exception:
        humidity = None
    try:
        light = round(LIGHT.lux, 0)
    except Exception:
        light = None
    return {"temperature": temperature, "humidity": humidity, "light": light}


def read_tank() -> dict:
    # Simplest version: float switch -> 2 states. Better: pressure/ultrasonic -> %.
    # Replace with your real formula. Example maps a voltage 0–3.3 V to 0–100 %.
    try:
        v = read_voltage(ADC_MAIN, 0)          # ← replace with your level sensor input
        level_pct = max(0.0, min(100.0, v / 3.3 * 100.0))
        return {"levelPct": round(level_pct, 1), "capacityL": 16}
    except Exception as e:
        log.warning("tank read failed: %s", e)
        return {"levelPct": 0, "capacityL": 16}


def post(snapshot: dict):
    try:
        r = requests.post(f"{API_URL}/api/snapshots", json=snapshot, timeout=POST_TIMEOUT)
        r.raise_for_status()
    except Exception as e:
        log.error("posting snapshot failed: %s", e)


def main():
    log.info("sensor service starting")
    pump_last = {pid: {"lastActivatedAt": None, "lastRunDurationSec": None} for pid in PUMPS}

    while True:
        now = int(time.time() * 1000)
        tank = read_tank()
        pots = []
        for pid in sorted(PUMPS):
            reading = read_pot(pid)
            reading["lastReadingAt"] = now
            pots.append(reading)

        # ---- auto-watering loop ----
        for reading in pots:
            pid = reading["id"]
            m = reading["moisture"]
            if m is None or tank["levelPct"] < WATER_LOW_PCT:
                PUMPS[pid].off()
                continue
            if m < MOISTURE_MIN[pid] and not PUMPS[pid].value:
                PUMPS[pid].on()
                pump_last[pid]["lastActivatedAt"] = now
                log.info("pump %d ON (moisture %.1f%%)", pid, m)
            elif m > MOISTURE_MAX[pid] and PUMPS[pid].value:
                PUMPS[pid].off()
                started = pump_last[pid]["lastActivatedAt"]
                if started:
                    pump_last[pid]["lastRunDurationSec"] = (now - started) // 1000
                log.info("pump %d OFF (moisture %.1f%%)", pid, m)

        pumps_out = []
        for pid in sorted(PUMPS):
            pumps_out.append({
                "id": pid,
                "potId": pid,
                "status": "on" if PUMPS[pid].value else "off",
                "lastActivatedAt": pump_last[pid]["lastActivatedAt"] or now,
                "lastRunDurationSec": pump_last[pid]["lastRunDurationSec"],
            })

        post({"pots": pots, "tank": tank, "pumps": pumps_out, "ambient": read_ambient()})
        time.sleep(READ_INTERVAL)


if __name__ == "__main__":
    main()
```

Key behaviors to preserve whatever hardware you use:

1. **A failed read posts `null`**, not the previous value. After 2 min of nulls the backend marks the sensor `fault` and the UI shows `--` + last valid value — that's the whole fault system.
2. **The pump states posted must reflect real GPIO state** — the dashboard shows live "Running N sec" from `lastActivatedAt` while `status: "on"`.
3. Calibrate before trusting values: moisture (dry/wet voltages) and pH (buffer 4.0 / 7.0). Wrong calibration shows as permanently "Very Low"/"Too Acidic" statuses — the thresholds are fine, the raw values are not.

---

## Step 3 — Switch the dashboard to live data

Everything in this step is already wired in the repo. You only configure it.

1. Copy `.env.example` to `.env` in the dashboard project.
2. Set:

```bash
VITE_USE_MOCK=false
VITE_API_BASE_URL=            # empty = same origin (recommended, see Step 6)
# or during development, when the backend runs on the Pi:
# VITE_API_BASE_URL=http://raspberrypi.local:8000
```

3. Restart the dev server (`npm run dev`).

That's it. How it works internally (for reference):

```
src/data/index.ts     ← picks mock or api from VITE_USE_MOCK  (no code changes needed)
src/data/api.ts       ← fetches /api/system + history, computes statuses/trends from
                        thresholds in src/data/systemConfig.ts (the only place they live)
src/hooks/usePlantData.ts  ← TanStack Query: polls /api/system every 5 s,
                        history every 30 s, retries once, shows error card if the API dies
```

> Vite env vars are **build-time**. If you rebuild for a new API URL, run `npm run build` again — or keep the URL empty and serve dashboard + API from the same origin (next step), so no rebuild is ever needed.

---

## Step 4 — Optional: real-time push (WebSocket)

Polling every 5 s is usually plenty (that's what the mock simulates). If you want instant updates:

Backend — add to `main.py`:

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.clients: list[WebSocket] = []

    async def broadcast(self, payload: dict):
        for ws in list(self.clients):
            try:
                await ws.send_json(payload)
            except Exception:
                self.clients.remove(ws)

manager = ConnectionManager()

@app.websocket("/ws/system")
async def ws_system(ws: WebSocket):
    await ws.accept()
    manager.clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.clients.remove(ws)
```

…and in `ingest()`, after saving, push the fresh system state to all dashboards:

```python
from fastapi.concurrency import run_in_threadpool

@app.post("/api/snapshots")
async def ingest(snap: SnapshotIn):
    await run_in_threadpool(_ingest_sync, snap)          # keep the sync DB code above
    await manager.broadcast(system())                     # reuses the GET /api/system body
    return {"ok": True}
```

Frontend — create `src/realtime.ts`:

```ts
import type { QueryClient } from "@tanstack/react-query"
import { fetchGardenSystemData } from "@/data/api"

export function connectRealtime(queryClient: QueryClient) {
  const protocol = location.protocol === "https:" ? "wss" : "ws"
  const ws = new WebSocket(`${protocol}://${location.host}/ws/system`)
  ws.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data)
      // reuse the same enrichment as the HTTP adapter
      queryClient.setQueryData(["garden-system"], enrich(raw))   // import enrich from api.ts
    } catch {
      /* ignore malformed frames */
    }
  }
  ws.onclose = () => setTimeout(() => connectRealtime(queryClient), 3000)
  return () => ws.close()
}
```

Call it once in `src/App.tsx` inside a `useEffect`, keep the 5 s polling as a fallback, and consider raising the poll interval to 60 s once WebSocket is verified. (If you want this fully wired up rather than as a snippet, `enrich` needs a small export in `api.ts` — one-line change.)

---

## Step 5 — Tuning thresholds per pot

All status logic lives in **one file**: `src/data/systemConfig.ts`.

```ts
export const POT_META: Record<PotId, PotMeta> = {
  1: {
    id: 1,
    name: "Pot 1",
    emoji: "🪴",
    moistureThresholds: { veryLowMax: 30, lowMax: 55, optimalMax: 75, highMax: 85 },
    phThresholds: { acidicMax: 5.5, slightlyAcidicMax: 6.0, optimalMax: 7.0, slightlyAlkalineMax: 7.5 },
  },
  // give pot 3 different plants? just change its numbers:
  3: {
    ...
    phThresholds: { acidicMax: 5.0, slightlyAcidicMax: 5.5, optimalMax: 6.5, slightlyAlkalineMax: 7.0 },
  },
}
```

- Moisture bands: `< veryLowMax` → Very Low · `< lowMax` → Low · `≤ optimalMax` → Optimal · `≤ highMax` → High · above → Very High
- pH bands follow the same idea (acidic → alkaline, 5 states)
- Water tank bands and capacity: `TANK_THRESHOLDS` / `TANK_CAPACITY_L` in the same file

No backend changes are needed to retune — refresh the browser and the statuses recompute.

---

## Step 6 — Deployment (run it on the Pi 24/7)

Recommended layout on the Pi — **one box serves everything**:

```
Pi
├── garden-api/main.py             ← uvicorn on :8000
├── garden-api/dashboard-dist/     ← the built React app (npm run build -> copy dist/)
└── garden-api/pi/sensor_service.py
```

1. Build the dashboard on your dev machine and copy it over:

```bash
# dev machine (in the dashboard project)
VITE_USE_MOCK=false npm run build
scp -r dist/* pi@raspberrypi.local:garden-api/dashboard-dist/
```

2. Serve it from the API (same origin → no CORS, no env URL). In `main.py` uncomment the last lines:

```python
dist_path = Path(__file__).parent / "dashboard-dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="dashboard")
```

3. Keep both processes alive with systemd. `/etc/systemd/system/garden-api.service`:

```ini
[Unit]
Description=Smart Garden API
After=network.target

[Service]
WorkingDirectory=/home/pi/garden-api
ExecStart=/home/pi/garden-api/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/garden-sensors.service`:

```ini
[Unit]
Description=Smart Garden sensor service
After=network.target garden-api.service

[Service]
WorkingDirectory=/home/pi/garden-api
ExecStart=/home/pi/garden-api/.venv/bin/python pi/sensor_service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now garden-api garden-sensors
```

4. Dedicated screen — run a browser in kiosk mode on the Pi (or any PC on the LAN):

```bash
chromium-browser --kiosk --noerrdialogs http://localhost:8000
```

Turn on **Display Mode** in the dashboard header for the wall layout.

---

## Testing checklist

Work through this in order — each item is observable in the UI:

- [ ] `curl http://<pi>:8000/api/system` returns JSON shaped like §2
- [ ] Dashboard loads with `VITE_USE_MOCK=false`, four pots show live numbers
- [ ] Values change smoothly (number transition, no full-page flash) — the Pi posts every few seconds
- [ ] "Updated just now" in the header advances correctly
- [ ] **Fault:** unplug a pH sensor → after ~2 min that pot shows `--`, "pH sensor unavailable", red badge, last valid value frozen; Sensor Status card shows "pH · Sensor Fault"
- [ ] **Offline:** stop `garden-sensors` → after 2 min header shows "Reconnecting…"/"Pi Offline" banner; restart it → recovers automatically
- [ ] **API down:** stop `garden-api` → dashboard shows the "Can't reach your garden" error card with retry
- [ ] **Pump:** trigger auto-watering (dry the sensor) → pump card flips to ON with a live "Running N sec" counter
- [ ] **Tank:** pour water out / in → level bar animates, status crosses Good/Normal/Low bands
- [ ] **Analytics:** switch pots, Moisture ↔ pH, 24H/7D/30D — chart + Current/Average/Min/Max/Trend update
- [ ] **Display Mode:** toggle in header, Esc exits
- [ ] Mobile (390 px) and tablet (820 px): no horizontal scrolling
- [ ] `npm run build` and browser console show zero errors

---

## Common pitfalls & FAQ

**Timestamps in seconds, not milliseconds.**
Everything is epoch **milliseconds**. If your readings all show "Updated 53 years ago", you sent seconds (`× 1000`).

**Using `0` to mean "no data".**
`0%` moisture is a valid reading and will render as a real value. Missing data must be `null`.

**Sending stale values while a sensor is disconnected.**
The dashboard is explicitly designed to distinguish current / last valid / none. Keep sending the pot in the snapshot with `ph: null` — the fault UI takes over.

**CORS errors in the dev console.**
Either set `VITE_API_BASE_URL` correctly and keep the FastAPI CORS middleware (dev), or serve the dashboard from the API itself (prod — no CORS at all).

**Statuses look wrong (everything "Very Low" / "Too Acidic").**
Almost always sensor calibration, not thresholds. Re-check the dry/wet voltages and pH buffer points in `MOISTURE_CAL` / `PH_CAL`.

**Dashboard shows old data after changing `VITE_API_BASE_URL`.**
Vite bakes env vars at build time. Restart `npm run dev`, or rebuild for production.

**Key naming.**
The API must send camelCase (`lastReadingAt`, not `last_reading_at`) to match the frontend types in `src/types/plant.ts`. If you prefer snake_case on the wire, map the keys inside `src/data/api.ts`.

**Database growth.**
One reading per pot every 5 s ≈ 70k rows/day. Either keep it (SQLite is fine at millions of rows) or add a nightly cleanup: `DELETE FROM readings WHERE ts < strftime('%s','now','-40 days') * 1000;`

**Where do I change poll rates?**
`src/hooks/usePlantData.ts` — `refetchInterval: 5_000` (current) and `30_000` (history).

---

## Appendix — Plant Advisor & plant assignments

The Plant Advisor engine still runs even though its card is unmounted in the minimal layout —
it decides the plant name shown on each AI pot card:

- **AI-managed pots** (`AI_MANAGED_POTS = [3, 4]` in `src/data/systemConfig.ts`) —
  **Pot 3 is pinned to Pak Choy** (`AI_PINNED_PLANTS` in `src/utils/plantAdvisor.ts`) because it
  replays the recorded Pak Choy dataset; **Pot 4** gets the best ambient match from
  `suggestPlants()`. Bands are retuned from the plant's preferred ranges
  (`plantMoistureThresholds` / `plantPhThresholds`).
- **Manual pots** (1 & 2) — always use the fixed default bands; not AI-managed.
- The advisor UI (`PlantAdvisorCard`) is unmounted but kept in `src/components/dashboard/` —
  re-add it to `src/pages/Dashboard.tsx` to bring back match scores, the 13-plant catalog
  (Malaysian common names: Pudina, Lidah Jin, Selasih, Pak Choy, …) and per-pot assignment chips.

- **How matching works** — `suggestPlants(ambient)` in `src/utils/plantAdvisor.ts` scores every
  plant in `src/data/plantCatalog.ts` against the current temperature, humidity and light
  (light is skipped with a note at night). Scores and reasons are computed locally and are fully
  explainable — no external AI service required. Swap `suggestPlants` for an LLM call later if you
  want conversational recommendations; the UI contract is just `PlantMatch[]`.
- **Assignments** — user overrides are stored in the browser (`localStorage`, key
  `garden-plant-assignments`) via `usePlantAssignments`; removing an override falls back to the
  AI pick (Pak Choy on pot 3). `applyAssignments()` (called in `usePlantData`) applies everything,
  so mock and live data behave identically.

### Making the Pi honor per-plant watering

Right now the Pi auto-waters at a fixed threshold (55%). To make it plant-aware:

1. Persist assignments server-side (so they survive browser changes). Suggested endpoints:

```
GET  /api/assignments                  -> { "1": "basil", "3": "monstera" }
PUT  /api/assignments/{pot_id}         -> body { "plantId": "basil" }   (or null to clear)
GET  /api/watering-plan                -> [ { "potId": 1, "min": 55, "max": 75, "waterBelow": 60 } ]
```

2. The frontend keeps working during the transition — move the storage by replacing the body of
   `usePlantAssignments` (`src/hooks/usePlantAssignments.ts`) with two API calls; every consumer
   (Advisor, PotCard, Pump card, `applyAssignments`) stays unchanged.
3. On the Pi, replace the fixed `MOISTURE_MIN` / `MOISTURE_MAX` dicts with a periodic fetch of
   `GET /api/watering-plan`, e.g. once a minute:

```python
def fetch_watering_plan():
    try:
        r = requests.get(f"{API_URL}/api/watering-plan", timeout=5)
        return {row["potId"]: row for row in r.json()}
    except Exception:
        return {}
```

Use `plan[pot_id]["waterBelow"]` as the pump-on threshold and `plan[pot_id]["max"]` as the
pump-off target. If the fetch fails, keep the last known plan — never fall back silently to a
default that overwaters a succulent.
