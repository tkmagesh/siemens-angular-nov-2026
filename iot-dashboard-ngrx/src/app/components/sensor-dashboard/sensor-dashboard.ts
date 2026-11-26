/**
 * COMPONENT - SensorDashboardComponent
 *
 * ─── HOW NgRx CHANGES THIS COMPONENT ────────────────────────────────────────
 * BehaviorSubject version:
 *   - Injected SensorService + DashboardStateService
 *   - Manually wired switchMap: selectedMachine$.pipe(switchMap(m => sensor.getReadings(m.id)))
 *   - Needed takeUntil(destroy$) + ngOnDestroy() for cleanup
 *   - Subscriptions were explicit: .subscribe(m => this.noSelection = m === null)
 *
 * NgRx version:
 *   - Injects ONLY Store<AppState>
 *   - No switchMap wiring — SensorsEffects handles WebSocket connection
 *   - No manual subscriptions at all — all Observables consumed via async pipe
 *   - No ngOnDestroy needed — no manual subscriptions to clean up
 *
 * Data flow for live readings:
 *   WebSocket message arrives
 *     → SensorsEffects.receiveReading$ catches it
 *     → dispatches SensorsActions.readingReceived({ reading })
 *     → SensorsReducer stores reading in state.sensors.latestReadings[machineId]
 *     → selectReadingForMachine(id) selector emits the new value
 *     → template updates with the latest reading
 *
 * Data flow for machine selection:
 *   User clicks machine row in MachineListComponent
 *     → MachineListComponent dispatches MachinesActions.selectMachine()
 *     → MachinesReducer updates state.machines.selectedMachineId
 *     → selectSelectedMachine selector (derived from id + entities) emits
 *     → THIS component's selectedMachine$ gets the new machine automatically
 *     → No communication between components needed — the Store is the hub
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI state that belongs here (not in the store):
 *   activeTab — 'live' | 'summary' — a display toggle, not business data
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import { selectSelectedMachine } from '../../store/machines/machines.selectors';
import {
  selectReadingForMachine,
  selectSummaryForMachine,
  selectConnectionStatus,
} from '../../store/sensors/sensors.selectors';
import { SensorReading, SensorSummary } from '../../models/sensor-reading.model';
import { Machine } from '../../models/machine.model';
import { of } from 'rxjs';

@Component({
  selector: 'app-sensor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-dashboard.html',
  styleUrl: './sensor-dashboard.css',
})
export class SensorDashboardComponent {

  // ─── Single dependency: the Store ────────────────────────────────────────
  private store = inject(Store<AppState>);

  // ─── State from the store ─────────────────────────────────────────────────

  /** The currently selected machine — provides the heading and machine id */
  selectedMachine$: Observable<Machine | null> = this.store.select(selectSelectedMachine);

  /** True when no machine is selected — controls placeholder visibility */
  noSelection$: Observable<boolean> = this.selectedMachine$.pipe(
    map(m => m === null)
  );

  /**
   * WebSocket connection status.
   * SensorsEffects.connectWebSocket$ sets this via connectWebSocketSuccess action.
   * Shows a "connecting..." indicator when the socket is not yet open.
   */
  connectionStatus$: Observable<'connecting' | 'connected' | 'disconnected'> =
    this.store.select(selectConnectionStatus);

  /**
   * Latest reading for the selected machine.
   *
   * In the BehaviorSubject version, we had to wire switchMap manually:
   *   this.latestReading$ = selectedMachine$.pipe(
   *     filter(m => m !== null),
   *     switchMap(machine => this.sensorService.getReadingsForMachine(machine.id))
   *   );
   *
   * With NgRx, we compose selectors instead — no operator wiring here:
   *   The state has readings indexed by machineId.
   *   The selector selects the right slice based on selectedMachineId.
   */
  /**
   * Latest reading for the selected machine.
   * switchMap: when the selected machine changes, automatically switches to
   * watching the new machine's readings. No manual subscribe/unsubscribe.
   */
  latestReading$: Observable<SensorReading | null> = this.selectedMachine$.pipe(
    switchMap(machine =>
      machine ? this.store.select(selectReadingForMachine(machine.id)) : of(null)
    )
  );

  /** Summary (avg/min/max) for the selected machine */
  summary$: Observable<SensorSummary | null> = this.selectedMachine$.pipe(
    switchMap(machine =>
      machine ? this.store.select(selectSummaryForMachine(machine.id)) : of(null)
    )
  );

  // ─── UI-only state ────────────────────────────────────────────────────────

  /** Which tab is visible — pure display toggle, stays in component */
  activeTab: 'live' | 'summary' = 'live';

  // ─── User Interaction ─────────────────────────────────────────────────────

  /** Switches which tab is visible. Pure UI — no store dispatch needed. */
  setTab(tab: 'live' | 'summary'): void {
    this.activeTab = tab;
  }

  /** Template helper: parameterised selector call for per-machine readings */
  getReadingForMachine$(machineId: number): Observable<SensorReading | null> {
    return this.store.select(selectReadingForMachine(machineId));
  }

  getSummaryForMachine$(machineId: number): Observable<SensorSummary | null> {
    return this.store.select(selectSummaryForMachine(machineId));
  }
}
