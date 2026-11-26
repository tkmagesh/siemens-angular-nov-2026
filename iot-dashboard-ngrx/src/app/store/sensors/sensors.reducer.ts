/**
 * REDUCER - sensors.reducer.ts
 *
 * NgRx concept: Storing real-time streaming data in an immutable state tree.
 *
 * VS plain-RxJS version:
 *   Before: SensorService used a ReplaySubject(50) as an in-memory ring buffer.
 *           State mutated inside the Subject on every push.
 *   Now:    Each batch of readings triggers an immutable state update.
 *           latestReadings is a plain object map: { [machineId]: SensorReading }.
 *           Storing only the LATEST reading per machine keeps the state lean.
 *
 * SPREAD PATTERN for maps:
 *   The reducer spreads the existing latestReadings and overwrites individual
 *   machine keys — this produces a NEW object reference, which NgRx change
 *   detection picks up efficiently.
 *
 *   readings.reduce((map, r) => ({ ...map, [r.machineId]: r }), state.latestReadings)
 *   This is a standard pattern for updating a map immutably in one pass.
 */

import { createReducer, on } from '@ngrx/store';
import { SensorsActions } from './sensors.actions';
import { initialSensorsState } from './sensors.state';

export const sensorsReducer = createReducer(
  initialSensorsState,

  on(SensorsActions.connectWebSocket, state => ({
    ...state,
    connectionStatus: 'connecting' as const,
  })),

  on(SensorsActions.connected, state => ({
    ...state,
    connectionStatus: 'connected' as const,
  })),

  on(SensorsActions.disconnected, state => ({
    ...state,
    connectionStatus: 'disconnected' as const,
  })),

  // ── Core update: batch of sensor readings arrives ────────────────────────
  // For each reading, overwrite the entry for that machineId.
  // Components subscribed via selectLatestReadingForMachine will re-render
  // only if THEIR machine's reading changed (selector memoisation).
  on(SensorsActions.sensorReadingsReceived, (state, { readings }) => ({
    ...state,
    latestReadings: readings.reduce(
      (map, r) => ({ ...map, [r.machineId]: r }),
      state.latestReadings,
    ),
  })),
);
