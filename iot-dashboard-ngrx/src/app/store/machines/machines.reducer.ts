/**
 * REDUCER - machines.reducer.ts
 *
 * NgRx concept: Reducers are PURE FUNCTIONS that compute new state.
 * They are the ONLY place state can change.
 *
 * A reducer signature:  (currentState, action) => newState
 *
 * VS plain-RxJS version:
 *   Before (AlertService):
 *     acknowledgeAlert(id) {
 *       const updated = current.map(a => a.id === id ? {...a, acknowledged:true} : a);
 *       this.alertsSource$.next(updated);   // ← imperative mutation inside a service
 *     }
 *   Now (reducer):
 *     on(AlertsActions.acknowledgeAlertSuccess, (state, { alertId }) =>
 *       alertAdapter.updateOne({ id: alertId, changes: { acknowledged: true } }, state)
 *     )
 *
 * Why is this better?
 *   ✓ State changes are PURE — same inputs always produce same outputs
 *   ✓ Every change is logged as a named action in Redux DevTools
 *   ✓ No service can mutate state — only this file can
 *   ✓ Trivially unit-testable: reducer(initialState, action) → expectedState
 *
 * RULES for reducer functions:
 *   ✗ No HTTP calls, no console.log, no randomness, no Date.now()
 *   ✗ Never mutate the state argument — always spread: { ...state, field: newValue }
 *   ✗ Always return a value — including default (the current state)
 */

import { createReducer, on } from '@ngrx/store';
import { MachinesActions } from './machines.actions';
import { machineAdapter, initialMachinesState } from './machines.state';

export const machinesReducer = createReducer(
  initialMachinesState,

  // ── Loading ──────────────────────────────────────────────────────────────

  // User or app requests the machine list → flip loading flag
  on(MachinesActions.loadMachines, state => ({
    ...state,
    loading: true,
    error: null,
  })),

  // HTTP succeeded → replace entity collection, clear loading
  on(MachinesActions.loadMachinesSuccess, (state, { machines }) =>
    machineAdapter.setAll(machines, { ...state, loading: false })
  ),

  // HTTP failed → store message, clear loading
  on(MachinesActions.loadMachinesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // ── Selection ─────────────────────────────────────────────────────────────

  // User clicks a machine row → record its id; config loaded by effect
  on(MachinesActions.selectMachine, (state, { machine }) => ({
    ...state,
    selectedMachineId: machine.id,
    currentConfig: null,  // clear stale config until new one arrives
  })),

  // ── Search ────────────────────────────────────────────────────────────────

  on(MachinesActions.searchMachinesSuccess, (state, { machines }) => ({
    ...state,
    searchResults: machines,
  })),

  // ── Config ────────────────────────────────────────────────────────────────

  on(MachinesActions.loadConfigSuccess, (state, { config }) => ({
    ...state,
    currentConfig: config,
  })),

  // ── Save ──────────────────────────────────────────────────────────────────

  on(MachinesActions.saveConfig, state => ({
    ...state,
    saving: true,
    error: null,
  })),

  on(MachinesActions.saveConfigSuccess, (state, { config }) => ({
    ...state,
    saving: false,
    currentConfig: config,
  })),

  on(MachinesActions.saveConfigFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error,
  })),
);
