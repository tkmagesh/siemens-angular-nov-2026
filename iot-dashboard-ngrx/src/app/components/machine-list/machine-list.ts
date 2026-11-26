/**
 * COMPONENT - MachineListComponent
 *
 * ─── HOW NgRx CHANGES THIS COMPONENT ────────────────────────────────────────
 * BehaviorSubject version:
 *   - Injected MachineService (for HTTP) + DashboardStateService (for state)
 *   - Called service methods: this.dashboardState.selectMachine(m)
 *   - Triggered HTTP directly: this.machineService.getAllMachines()
 *
 * NgRx version:
 *   - Injects ONLY Store<AppState> — one dependency instead of two
 *   - Dispatches actions: this.store.dispatch(MachinesActions.selectMachine({ machine: m }))
 *   - Reads state via selectors: this.store.select(selectAllMachines)
 *
 * Data flow:
 *   User clicks row
 *     → dispatch(selectMachine)
 *     → MachinesReducer updates selectedMachineId in state
 *     → selectSelectedMachineId selector emits new value
 *     → template re-renders highlighted row
 *
 * User types in search box
 *     → dispatch(searchMachines({ term }))
 *     → MachinesEffects.searchMachines$ catches it, debounces, calls HTTP
 *     → dispatches searchMachinesSuccess({ machines })
 *     → MachinesReducer stores results in state.searchResults
 *     → selectSearchResults selector emits
 *     → template shows results
 *
 * This component has NO knowledge of:
 *   ✗ HOW machines are fetched (MachinesEffects handles that)
 *   ✗ WHERE selected machine is stored (MachinesReducer handles that)
 *   ✗ HOW search debouncing works (MachinesEffects handles that)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI state that belongs here (not in the store):
 *   showSearch — whether the search box is visible
 *   These are transient display toggles with no business meaning.
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import { MachinesActions } from '../../store/machines/machines.actions';
import {
  selectAllMachines,
  selectMachinesLoading,
  selectSelectedMachineId,
  selectSearchResults,
} from '../../store/machines/machines.selectors';
import { Machine } from '../../models/machine.model';

@Component({
  selector: 'app-machine-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './machine-list.html',
  styleUrl: './machine-list.css',
})
export class MachineListComponent implements OnInit {

  // ─── Single dependency: the Store ────────────────────────────────────────
  // Compare with the BehaviorSubject version which injected:
  //   private machineService = inject(MachineService);
  //   private dashboardState = inject(DashboardStateService);
  private store = inject(Store<AppState>);

  // ─── State from the store (read-only streams via selectors) ──────────────

  /** All machines — populated by MachinesEffects.loadMachines$ on app start */
  machines$: Observable<Machine[]> = this.store.select(selectAllMachines);

  /** True while the HTTP request to /machines is in flight */
  loading$: Observable<boolean> = this.store.select(selectMachinesLoading);

  /** ID of the currently selected machine — used to highlight the active row */
  selectedMachineId$: Observable<number | null> = this.store.select(selectSelectedMachineId);

  /** Results of the last search — empty array when no search has been run */
  searchResults$: Observable<Machine[]> = this.store.select(selectSearchResults);

  /** True when there are search results to show */
  showSearchResults$: Observable<boolean> = this.searchResults$.pipe(
    map(results => results.length > 0)
  );

  // ─── UI-only state (too transient and local for the global store) ─────────
  showSearch = false;

  ngOnInit(): void {
    // NOTE: We do NOT call loadMachines() here.
    // The root AppComponent dispatches MachinesActions.loadMachines() on init.
    // The Store already has the machines by the time this component renders.
    // This makes the component completely passive — it only reads and dispatches.
  }

  // ─── User Interaction — all actions dispatched to the Store ──────────────

  /**
   * Dispatches selectMachine action.
   * MachinesReducer updates state.machines.selectedMachineId.
   * MachinesEffects.loadConfig$ then automatically fetches the config.
   */
  onSelectMachine(machine: Machine): void {
    this.store.dispatch(MachinesActions.selectMachine({ machine }));
  }

  /**
   * Dispatches searchMachines action with the current term.
   * MachinesEffects.searchMachines$ debounces 300ms then calls HTTP.
   * No debounce logic in this component — it's entirely in the Effect.
   */
  onSearch(term: string): void {
    if (term.length < 2) {
      this.onClearSearch();
      return;
    }
    this.store.dispatch(MachinesActions.searchMachines({ term }));
  }

  /** Clears search results by dispatching a success action with empty array */
  onClearSearch(): void {
    this.store.dispatch(MachinesActions.searchMachinesSuccess({ machines: [] }));
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.onClearSearch();
  }
}
