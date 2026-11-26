/**
 * SELECTORS - machines.selectors.ts
 *
 * NgRx concept: Selectors are MEMOISED QUERIES against the state tree.
 *
 * A selector is a pure function: (state) => derivedValue.
 * createSelector() wraps it with memoisation: if the input slice hasn't
 * changed since last call, the cached result is returned immediately —
 * the projection function does NOT run again.
 *
 * VS plain-RxJS version:
 *   Before: components imported DashboardStateService and subscribed to
 *           selectedMachine$ directly — coupling component to service.
 *   Now:    components call this.store.select(selectSelectedMachine).
 *           No service import. Selector is a simple testable function.
 *
 * Why selectors matter:
 *   ✓ Memoisation prevents unnecessary re-renders in components
 *   ✓ Derived state (e.g. selectSelectedMachine) is computed ONCE and cached
 *   ✓ Components only re-render when the specific slice they care about changes
 *   ✓ All "how to query state" logic lives here — not scattered in components
 *
 * Pattern:
 *   1. createFeatureSelector<FeatureState>('featureKey') — select the slice
 *   2. createSelector(inputSelector, projectionFn) — derive a value from it
 *   3. Chain: createSelector(selector1, selector2, (a, b) => compute(a, b))
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MachinesState, machineAdapter } from './machines.state';

// ── Step 1: Select the 'machines' slice from the root store ──────────────────
export const selectMachinesState =
  createFeatureSelector<MachinesState>('machines');

// ── Step 2: Use EntityAdapter's built-in selector factories ─────────────────
// getSelectors() returns { selectAll, selectEntities, selectIds, selectTotal }
const { selectAll, selectEntities } = machineAdapter.getSelectors();

// All machines as an array — used by the machine list
export const selectAllMachines = createSelector(selectMachinesState, selectAll);

// ── Step 3: Derive additional values ─────────────────────────────────────────

export const selectMachinesLoading = createSelector(
  selectMachinesState,
  state => state.loading
);

export const selectSelectedMachineId = createSelector(
  selectMachinesState,
  state => state.selectedMachineId
);

/**
 * Derived selector: combines TWO input selectors.
 * createSelector() re-runs only when selectEntities OR selectSelectedMachineId
 * changes — not on every store update.
 */
export const selectSelectedMachine = createSelector(
  createSelector(selectMachinesState, selectEntities),
  selectSelectedMachineId,
  (entities, id) => (id != null ? entities[id] ?? null : null)
);

export const selectCurrentConfig = createSelector(
  selectMachinesState,
  state => state.currentConfig
);

export const selectSearchResults = createSelector(
  selectMachinesState,
  state => state.searchResults
);

export const selectMachinesSaving = createSelector(
  selectMachinesState,
  state => state.saving
);

export const selectMachinesError = createSelector(
  selectMachinesState,
  state => state.error
);
