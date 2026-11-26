# IoT Factory Dashboard — NgRx Version

> Compare with `../iot-dashboard/` which uses plain RxJS BehaviorSubjects.
> The domain is identical; the state management approach is completely different.

---

## Quick Start

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start both backend servers
npm run servers

# 3. Start Angular
npm start
```

Open http://localhost:4200.
Install [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) in Chrome to watch every action and state change.

---

## Why NgRx? The Problem It Solves

The plain-RxJS version (`iot-dashboard/`) uses `BehaviorSubject` and `Subject` in services:

```ts
// iot-dashboard: state scattered across services
class AlertService {
  private alertsSource$ = new BehaviorSubject<Alert[]>([]);
  handleBreach(...) { this.http.post(...).subscribe(saved => {
    this.alertsSource$.next([saved, ...this.alertsSource$.getValue()]);
  }); }
}

class DashboardStateService {
  private selectedMachineSource$ = new BehaviorSubject<Machine | null>(null);
  selectMachine(m: Machine) { this.selectedMachineSource$.next(m); }
}
```

This works, but as the app grows:
- **State is scattered** across multiple services — no single place to see the full picture.
- **Any service can mutate any state** — impossible to trace who changed what.
- **No DevTools** — debugging state bugs means adding `console.log` everywhere.
- **Testing effects** (HTTP calls, WS) means testing inside the service that owns them.

NgRx solves this with the **Redux pattern**:

```
User interaction
     │
     ▼
 dispatch(Action)        ← "What happened"
     │
     ├──▶ Reducer        ← "How state changes" (pure function, no side effects)
     │        │
     │        ▼
     │    New State       ← Single immutable state tree
     │        │
     │        ▼
     │    Selectors       ← "What the template needs" (memoized)
     │
     └──▶ Effects         ← "Side effects" (HTTP, WebSocket, storage)
              │
              ▼
         dispatch(Action) ← Result action back into the cycle
```

---

## Architecture Comparison

### State Location

| Concern | BehaviorSubject version | NgRx version |
|---|---|---|
| Machine list | `MachineService.getAllMachines()` returns Observable each time | `Store` → `selectAllMachines` selector |
| Selected machine | `DashboardStateService.selectedMachine$` (BehaviorSubject) | `Store` → `selectSelectedMachine` selector |
| Alert list | `AlertService.alertsSource$` (BehaviorSubject) | `Store` → `selectAllAlerts` selector |
| Sensor readings | `SensorService.readingBuffer$` (ReplaySubject) | `Store` → `selectLatestReadings` selector |
| Loading flags | Per-service local variables | `Store` → `selectMachinesLoading`, etc. |

### How State Changes

| Scenario | BehaviorSubject | NgRx |
|---|---|---|
| Select machine | `dashboardState.selectMachine(m)` | `store.dispatch(MachinesActions.selectMachine({ machine: m }))` |
| Machine loaded | `source$.next(machines)` in service | `MachinesActions.loadMachinesSuccess` → reducer updates state |
| Alert created | `alertsSource$.next([new, ...old])` | `AlertsActions.addAlert` → reducer prepends to entity collection |
| Config saved | `machineService.saveConfig().subscribe(...)` in component | `store.dispatch(MachinesActions.saveConfig(...))` → Effect handles HTTP |

### Side Effects

| Side effect | BehaviorSubject | NgRx |
|---|---|---|
| HTTP call | Inside service method, called by component | Inside `@ngrx/effects` Effect class |
| WebSocket | `SensorService.connectAndFeed()` in constructor | `SensorsEffects.connectWebSocket$` triggered by action |
| Breach detection | `SensorService.getBreachesForMachine()` | `SensorsEffects.detectBreaches$` reads state via `withLatestFrom(store.select(...))` |

---

## NgRx Concepts Demonstrated

### Actions (`*.actions.ts`)
```ts
// createActionGroup creates a family of related actions
export const MachinesActions = createActionGroup({
  source: 'Machines',
  events: {
    'Load Machines': emptyProps(),
    'Load Machines Success': props<{ machines: Machine[] }>(),
    'Select Machine': props<{ machine: Machine }>(),
  }
});

// Usage in component:
this.store.dispatch(MachinesActions.loadMachines());
this.store.dispatch(MachinesActions.selectMachine({ machine }));
```

### Reducers (`*.reducer.ts`)
```ts
// Pure function: (currentState, action) => newState
// Never mutates state — always returns a NEW object
export const machinesReducer = createReducer(
  initialMachinesState,
  on(MachinesActions.loadMachinesSuccess, (state, { machines }) =>
    machineAdapter.setAll(machines, { ...state, loading: false })
  ),
  on(MachinesActions.selectMachine, (state, { machine }) => ({
    ...state, selectedMachineId: machine.id
  })),
);
```

### Selectors (`*.selectors.ts`)
```ts
// Memoized: only recomputes when inputs change
export const selectSelectedMachine = createSelector(
  selectAllMachines,
  selectSelectedMachineId,
  (machines, id) => machines.find(m => m.id === id) ?? null
);
// If the machine list hasn't changed and the selected ID hasn't changed,
// the selector returns the same object reference → no re-render.
```

### Effects (`*.effects.ts`)
```ts
// @Injectable class — the ONLY place side effects are allowed
loadMachines$ = createEffect(() =>
  this.actions$.pipe(
    ofType(MachinesActions.loadMachines),    // listen for this action
    switchMap(() =>
      this.machineService.getAllMachines().pipe(
        map(machines => MachinesActions.loadMachinesSuccess({ machines })),
        catchError(err => of(MachinesActions.loadMachinesFailure({ error: err.message })))
      )
    )
  )
);
```

### Entity Adapter (`*.state.ts`)
```ts
// @ngrx/entity normalises collections:
// { ids: [1, 2, 3], entities: { 1: {...}, 2: {...}, 3: {...} } }
// Avoids array scans — O(1) lookup by ID
export const machineAdapter = createEntityAdapter<Machine>();

// Pre-built methods:
machineAdapter.setAll(machines, state)   // replace entire collection
machineAdapter.addOne(machine, state)    // add one
machineAdapter.upsertOne(machine, state) // add or update
machineAdapter.removeOne(id, state)      // remove by id

// Pre-built selectors:
const { selectAll, selectTotal, selectEntities } = machineAdapter.getSelectors();
```

---

## Project Structure

```
src/app/
├── models/              ← Same as iot-dashboard/ (unchanged)
│
├── store/               ← All NgRx state management
│   ├── app.state.ts     ← Root AppState interface
│   ├── machines/        ← Feature: machines + configs
│   │   ├── machines.actions.ts
│   │   ├── machines.state.ts
│   │   ├── machines.reducer.ts
│   │   ├── machines.selectors.ts
│   │   └── machines.effects.ts
│   ├── alerts/
│   ├── sensors/         ← WebSocket as an Effect
│   └── dashboard/       ← UI state (search term)
│
├── services/
│   ├── machine.ts       ← Pure HTTP (called by Effects, never by components)
│   └── notification.ts  ← Toast notifications (Subject, unchanged)
│
└── components/          ← Inject Store only; dispatch + select
    ├── machine-list/
    ├── sensor-dashboard/
    ├── alert-panel/
    └── machine-config-form/
```

---

## Key NgRx Rules (enforced by convention)

1. **Components never call service methods** — they dispatch actions.
2. **Components never hold state** — they select from the store.
3. **Reducers are pure functions** — no HTTP, no WebSocket, no subscriptions.
4. **Effects own all side effects** — HTTP, WebSocket, localStorage, router navigation.
5. **State is immutable** — always spread (`{ ...state, field: newValue }`), never mutate.

---

## Redux DevTools Usage

With the Chrome extension installed:
- Open DevTools → Redux tab
- Watch every dispatched action in the log
- Click any action to inspect the state before and after
- Use **time-travel**: click earlier actions to rewind state
- Use **diff view** to see exactly what each action changed

This is impossible in the BehaviorSubject version — a key reason teams choose NgRx for large applications.

---

## API Reference (json-server — same as iot-dashboard)

| Method | URL | Used by |
|---|---|---|
| GET | `/machines` | `MachinesEffects.loadMachines$` |
| GET | `/machines?name_like=` | `MachinesEffects.searchMachines$` |
| GET | `/configs?machineId=` | `MachinesEffects.loadConfig$` |
| PUT | `/configs/:id` | `MachinesEffects.saveConfig$` |
| GET | `/alerts` | `AlertsEffects.loadAlerts$` |
| POST | `/alerts` | `AlertsEffects.addAlert$` |
| PATCH | `/alerts/:id` | `AlertsEffects.acknowledgeAlert$` |
