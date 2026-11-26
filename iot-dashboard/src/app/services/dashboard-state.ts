/**
 * SERVICE - DashboardStateService
 *
 * Responsibility: Shared UI state and coordination between services.
 *
 * This is the "glue" service. It doesn't do HTTP or WebSocket directly —
 * it orchestrates MachineService, SensorService, and AlertService together.
 *
 * Think of it as the "brain" of the dashboard page:
 *   - Tracks which machine the user has selected
 *   - Manages the search box stream
 *   - Loads config when selection changes
 *   - Wires SensorService breach detection to AlertService
 *
 * RxJS SUBJECTS USED:
 *   BehaviorSubject — selectedMachine$, currentConfig$ (always have a current value)
 *   Subject         — searchTerm$ (no initial value needed; triggers on user input)
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, Observable, EMPTY } from 'rxjs';
import {
  debounceTime, distinctUntilChanged, switchMap,
  catchError, tap, filter, map
} from 'rxjs/operators';
import { Machine, MachineConfig } from '../models/machine.model';
import { MachineService } from './machine';
import { SensorService } from './sensor';
import { AlertService } from './alert';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {

  private machineService = inject(MachineService);
  private sensorService  = inject(SensorService);
  private alertService   = inject(AlertService);

  // ─── Selected Machine State ────────────────────────────────────────────────

  /**
   * BehaviorSubject<Machine | null>
   *
   * Holds the machine the user is currently viewing.
   * Initial value null = no selection yet.
   *
   * Why BehaviorSubject?
   *   - Any component that subscribes gets the CURRENT selection immediately.
   *   - If two components (e.g. SensorDashboard + AlertPanel) both need to
   *     know the selected machine, they both just subscribe to selectedMachine$
   *     — no @Input() passing needed.
   */
  private selectedMachineSource$ = new BehaviorSubject<Machine | null>(null);
  readonly selectedMachine$: Observable<Machine | null> = this.selectedMachineSource$.asObservable();

  // ─── Current Config State ──────────────────────────────────────────────────

  /**
   * BehaviorSubject<MachineConfig | null>
   *
   * Holds the config for the currently selected machine.
   * Updated automatically when selectedMachine$ changes (see wireConfigToSelection).
   * SensorService.getBreachesForMachine() reads from this to compare thresholds.
   */
  private currentConfigSource$ = new BehaviorSubject<MachineConfig | null>(null);
  readonly currentConfig$: Observable<MachineConfig | null> = this.currentConfigSource$.asObservable();

  // ─── Search State ──────────────────────────────────────────────────────────

  /**
   * Subject<string>: fires when the user types in the search box.
   *
   * Why plain Subject (not BehaviorSubject)?
   *   - There's no meaningful "current search term" before the user types.
   *   - The search input component pushes values in; this service transforms them.
   */
  private searchTermSource$ = new Subject<string>();

  /**
   * The search RESULTS stream — derived from searchTermSource$.
   *
   * Key operators demonstrated:
   *   debounceTime(300)     — wait 300ms after the user stops typing
   *                           before sending the HTTP request. Prevents
   *                           one request per keystroke.
   *   distinctUntilChanged  — don't re-search if the term hasn't changed
   *                           (e.g. user types "a", deletes it, types "a" again)
   *   switchMap             — cancel the previous HTTP call when a new search
   *                           term arrives. Without this, slow responses could
   *                           arrive out of order and show stale results.
   *   catchError            — if the HTTP call fails, return empty array
   *                           so the UI shows "no results" rather than crashing.
   */
  readonly searchResults$: Observable<Machine[]> = this.searchTermSource$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term =>
      term.length < 2
        ? [[] as Machine[]]                             // don't search for 1 char
        : this.machineService.searchMachines(term).pipe(
            catchError(() => [[] as Machine[]])
          )
    ),
  );

  // ─── Initialisation ───────────────────────────────────────────────────────

  constructor() {
    this.wireConfigToSelection();
  }

  /**
   * Whenever the selected machine changes, automatically load its config.
   *
   * Key operator: switchMap
   *   If the user rapidly clicks different machines, switchMap cancels
   *   any in-flight HTTP request for the previous machine and starts a
   *   new one for the latest selection.
   */
  private wireConfigToSelection(): void {
    this.selectedMachine$.pipe(
      filter((m): m is Machine => m !== null),
      switchMap(machine =>
        this.machineService.getConfigForMachine(machine.id).pipe(
          map(configs => configs[0] ?? null),
          catchError(() => [null]),
        )
      ),
    ).subscribe(config => {
      this.currentConfigSource$.next(config);
    });
  }

  // ─── Public Actions — called by components ────────────────────────────────

  /**
   * Called by MachineListComponent when user clicks a machine row.
   * This is the ONLY way to change the selected machine.
   */
  selectMachine(machine: Machine): void {
    this.selectedMachineSource$.next(machine);
  }

  /**
   * Called by the search input component on every keyup event.
   * The heavy lifting (debounce, HTTP call) happens inside searchResults$.
   */
  updateSearchTerm(term: string): void {
    this.searchTermSource$.next(term);
  }

  /**
   * Called by MachineConfigFormComponent after a successful save.
   * Updates the in-memory config so threshold checks use the new values
   * immediately — without needing a full page reload.
   */
  updateConfig(config: MachineConfig): void {
    this.currentConfigSource$.next(config);
  }
}
