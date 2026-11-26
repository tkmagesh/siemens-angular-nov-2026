/**
 * STORE ROOT - app.state.ts
 *
 * NgRx concept: The SINGLE STATE TREE.
 *
 * In the plain-RxJS version, state was scattered across multiple services:
 *   - DashboardStateService held selectedMachine$ (BehaviorSubject)
 *   - AlertService held alertsSource$ (BehaviorSubject)
 *   - SensorService held readingBuffer$ (ReplaySubject)
 *
 * Problem: state was hidden inside service instances, invisible to developer tools,
 * and any service could mutate any BehaviorSubject at any time.
 *
 * In NgRx, ALL application state lives in one immutable object: the Store.
 * Shape defined here, populated by reducers, read by selectors.
 *
 * Benefits of a single state tree:
 *   ✓ Redux DevTools shows the entire app state at any point in time
 *   ✓ Time-travel debugging: replay any sequence of actions
 *   ✓ State is never mutated — reducers return new objects
 *   ✓ Every state change is caused by a named, logged Action
 *   ✓ Easier to reason about: one place to look for all data
 */

import { MachinesState } from './machines/machines.state';
import { AlertsState } from './alerts/alerts.state';
import { SensorsState } from './sensors/sensors.state';
import { DashboardState } from './dashboard/dashboard.state';

export interface AppState {
  machines: MachinesState;
  alerts:   AlertsState;
  sensors:  SensorsState;
  dashboard: DashboardState;
}
