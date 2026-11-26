# IoT Factory Dashboard — Training Project

A real-time factory floor monitoring app built with Angular.
Used to demonstrate: **Reactive Forms**, **RxJS**, **WebSockets**, and **Unit Testing**.

---

## Quick Start

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start BOTH backend servers
npm run servers

# 3. In a separate terminal, start Angular
npm start
```

Then open http://localhost:4200.

---

## Running Servers Individually

```bash
npm run server:rest   # json-server on http://localhost:3000
npm run server:ws     # WebSocket server on ws://localhost:8080
```

---

## Project Architecture

```
src/app/
├── models/                     ← Data shapes (TypeScript interfaces)
│   ├── machine.model.ts
│   ├── sensor-reading.model.ts
│   └── alert.model.ts
│
├── services/                   ← All domain logic, HTTP, WebSocket, state
│   ├── machine.ts              → HTTP CRUD for machines & configs
│   ├── sensor.ts               → WebSocket + RxJS stream processing
│   ├── alert.ts                → Alert detection, storage, BehaviorSubject state
│   ├── dashboard-state.ts      → Shared UI state (selected machine, search)
│   └── notification.ts         → Toast notifications via Subject
│
└── components/                 ← UI only: display + user interaction
    ├── machine-list/           → List machines, handle selection & search
    ├── sensor-dashboard/       → Display live readings & rolling summary
    ├── alert-panel/            → Show active alerts, acknowledge them
    └── machine-config-form/    → Reactive form to edit thresholds

servers/
├── db.json                     ← json-server data (machines, configs, alerts)
└── ws-server.js                ← Simulates live sensor data over WebSocket
```

---

## Architecture Rule

> **Components own UI state only. Services own everything else.**

| Lives in Component | Lives in Service |
|---|---|
| `isLoading`, `activeTab`, `isExpanded` | HTTP calls, WebSocket |
| Which tab is selected | BehaviorSubject state |
| Form group definition | RxJS operator chains |
| Calling service methods | Business logic |

---

## Concepts Demonstrated

### 1. Reactive Forms (`machine-config-form/`)
- `FormGroup` + `FormControl` with built-in validators (`required`, `min`, `max`)
- **Cross-field validator** (`temperatureRangeValidator`) — min < max
- `valueChanges$` Observable — react to every keystroke
- `patchValue()` / `markAsPristine()` — programmatic form control
- Disabling Save button while form is `invalid` or `pristine`

### 2. RxJS (`sensor.ts`, `dashboard-state.ts`)

| Operator | Where | Why |
|---|---|---|
| `webSocket()` | sensor.ts | Connect to WebSocket |
| `retry(5)` | sensor.ts | Auto-reconnect on drop |
| `throttleTime()` | sensor.ts | Limit UI update rate |
| `scan()` | sensor.ts | Rolling average over last N readings |
| `bufferTime()` | sensor.ts | Collect readings into time windows |
| `withLatestFrom()` | sensor.ts | Attach config to each reading |
| `shareReplay(1)` | sensor.ts | Share stream across components |
| `switchMap()` | sensor.ts, dashboard-state.ts | Cancel old stream, switch to new |
| `debounceTime()` | dashboard-state.ts | Wait for user to stop typing |
| `distinctUntilChanged()` | sensor.ts, dashboard-state.ts | Skip duplicate values |
| `catchError()` | both | Graceful error handling |
| `takeUntil()` | components | Unsubscribe on destroy |
| `tap()` | sensor.ts | Logging without altering stream |
| `exhaustMap()` | config form | Ignore duplicate save clicks |

### 3. RxJS Subjects

| Subject Type | Where | Why |
|---|---|---|
| `Subject` | notification.ts, destroy$ pattern | Events / one-shot triggers |
| `BehaviorSubject` | alert.ts, dashboard-state.ts | Current state with initial value |
| `ReplaySubject(50)` | sensor.ts | Buffer last 50 readings for late subscribers |

### 4. WebSockets (`servers/ws-server.js` + `sensor.ts`)
- Server: Node.js `ws` package pushes sensor readings every 1s
- Client: `webSocket()` from `rxjs/webSocket` wraps it as an Observable
- Automatic reconnection with `retry()`
- Timeout detection with `timeout()`

---

## API Reference (json-server)

| Method | URL | Description |
|---|---|---|
| GET | `/machines` | List all machines |
| GET | `/machines?name_like=turb` | Search by name |
| GET | `/machines/:id` | Get one machine |
| GET | `/configs?machineId=1` | Get config for machine |
| PUT | `/configs/:id` | Update config |
| GET | `/alerts` | List all alerts |
| POST | `/alerts` | Create alert |
| PATCH | `/alerts/:id` | Update alert (acknowledge) |
