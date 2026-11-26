/**
 * STATE SHAPE - dashboard.state.ts
 *
 * The dashboard slice holds UI coordination state:
 * the current search term typed by the user.
 *
 * NOTE: selectedMachineId lives in MachinesState (not here) because
 * the selection affects which config is loaded — it is domain state,
 * not pure UI state.
 *
 * The search term is here because it is transient UI input that does
 * not belong with machine entity data.
 *
 * VS plain-RxJS version:
 *   Before: DashboardStateService held:
 *     - selectedMachineSource$ (BehaviorSubject<Machine|null>)
 *     - searchTermSource$ (Subject<string>)
 *     - searchResults$ (derived pipeline with debounceTime+switchMap)
 *   Now:
 *     - selectedMachineId → MachinesState.selectedMachineId
 *     - searchResults    → MachinesState.searchResults
 *     - searchTerm       → DashboardState.searchTerm (triggers effect)
 *     - debounce+switchMap → MachinesEffects.searchMachines$
 *   The DashboardState slice becomes very thin; the heavy lifting
 *   moved into the machines effect and machines state.
 */

export interface DashboardState {
  searchTerm: string;
}

export const initialDashboardState: DashboardState = {
  searchTerm: '',
};
