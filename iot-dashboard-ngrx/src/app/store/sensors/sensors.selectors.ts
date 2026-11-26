/**
 * SELECTORS - sensors.selectors.ts
 *
 * NgRx concept: Memoised per-machine queries against the readings map.
 *
 * VS plain-RxJS version:
 *   Before: SensorService.getReadingsForMachine(id) returned a filtered
 *           stream from ReplaySubject — a new subscription per caller.
 *   Now:    Components call store.select(selectLatestReadingForMachine(id)).
 *           Memoisation means: if machine 1's reading hasn't changed,
 *           SensorDashboard for machine 1 does NOT re-render even when
 *           machine 2's reading arrives.
 *
 * FACTORY SELECTOR PATTERN:
 *   selectLatestReadingForMachine(id) returns a selector.
 *   This is the standard NgRx pattern for parameterised selectors.
 *   The returned selector is stable per (id, state) pair.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SensorsState } from './sensors.state';

export const selectSensorsState =
  createFeatureSelector<SensorsState>('sensors');

export const selectConnectionStatus = createSelector(
  selectSensorsState,
  state => state.connectionStatus
);

/**
 * selectSummaryForMachine: factory selector that computes a simple summary
 * from the single latest reading. Kept minimal — in a production app you'd
 * maintain a rolling window in the reducer.
 */
export const selectSummaryForMachine = (machineId: number) =>
  createSelector(
    selectLatestReadings,
    readings => {
      const r = readings[machineId];
      if (!r) return null;
      return {
        machineId,
        avgTemperature: r.temperature,
        minTemperature: r.temperature,
        maxTemperature: r.temperature,
        avgPressure:    r.pressure,
        avgRpm:         r.rpm,
        sampleCount:    1,
      };
    }
  );

export const selectLatestReadings = createSelector(
  selectSensorsState,
  state => state.latestReadings
);

/** Factory: returns a selector for a specific machine's latest reading. */
export const selectLatestReadingForMachine = (machineId: number) =>
  createSelector(
    selectLatestReadings,
    readings => readings[machineId] ?? null
  );

/** Alias used by SensorDashboardComponent */
export const selectReadingForMachine = selectLatestReadingForMachine;
