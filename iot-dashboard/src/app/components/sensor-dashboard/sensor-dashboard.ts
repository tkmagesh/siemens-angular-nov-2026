/**
 * COMPONENT - SensorDashboardComponent
 *
 * Responsibility: Display live sensor readings and rolling summary for the
 *                 currently selected machine.
 *
 * ─── ARCHITECTURE RULE ───────────────────────────────────────────────────────
 * This component contains ONLY:
 *   ✓ UI state    — are we showing the chart or the table? which tab is active?
 *   ✓ Subscriptions — connects service streams to template-ready Observables
 *
 * This component does NOT contain:
 *   ✗ WebSocket logic  — that's in SensorService
 *   ✗ Stream operators — that's in SensorService
 *   ✗ Machine selection state — that's in DashboardStateService
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RxJS PATTERN: switchMap on machine selection
 *   When the user selects a different machine, we need to SWITCH from one
 *   sensor stream to another. switchMap does exactly this — it cancels the
 *   subscription to the old stream and subscribes to the new one.
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil, filter, map } from 'rxjs/operators';
import { SensorReading, SensorSummary } from '../../models/sensor-reading.model';
import { Machine } from '../../models/machine.model';
import { SensorService } from '../../services/sensor';
import { DashboardStateService } from '../../services/dashboard-state';

@Component({
  selector: 'app-sensor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-dashboard.html',
  styleUrl: './sensor-dashboard.css'
})
export class SensorDashboardComponent implements OnInit, OnDestroy {

  // ─── Dependencies ─────────────────────────────────────────────────────────
  private sensorService  = inject(SensorService);
  private dashboardState = inject(DashboardStateService);

  // ─── Subscription cleanup (takeUntil pattern) ─────────────────────────────

  /**
   * Subject used to signal "unsubscribe from everything" in ngOnDestroy.
   *
   * Pattern:
   *   someStream$.pipe(takeUntil(this.destroy$)).subscribe(...)
   *
   * When ngOnDestroy calls this.destroy$.next(), every stream that uses
   * takeUntil(this.destroy$) automatically unsubscribes.
   * This prevents memory leaks — without this, streams would keep running
   * even after the component is removed from the page.
   */
  private destroy$ = new Subject<void>();

  // ─── Template Observables ─────────────────────────────────────────────────

  /** Latest single sensor reading — displayed in the "current values" panel. */
  latestReading$!: Observable<SensorReading>;

  /** Rolling average/min/max over last 20 readings — displayed in stats panel. */
  summary$!: Observable<SensorSummary>;

  /** The currently selected machine — used in the template for the heading. */
  selectedMachine$!: Observable<Machine | null>;

  // ─── UI-only State ────────────────────────────────────────────────────────

  /** Which display mode the user has toggled. Pure UI concern, lives here. */
  activeTab: 'live' | 'summary' = 'live';

  /**
   * Observable<boolean> — true when no machine is selected.
   * Used with | async in the template so Angular's markForCheck() fires
   * on each emission, regardless of zone.js configuration.
   */
  noSelection$ = this.dashboardState.selectedMachine$.pipe(map(m => m === null));

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.selectedMachine$ = this.dashboardState.selectedMachine$;

    /**
     * switchMap: when selectedMachine$ emits a new machine,
     * SWITCH to that machine's sensor stream.
     *
     * Without switchMap: old streams would pile up — we'd be subscribed
     * to Machine 1, Machine 2, Machine 3... all at once.
     *
     * With switchMap: when machine 2 is selected, the stream for machine 1
     * is cancelled automatically.
     */
    this.latestReading$ = this.dashboardState.selectedMachine$.pipe(
      filter((m): m is Machine => m !== null),
      switchMap(machine => this.sensorService.getReadingsForMachine(machine.id)),
      takeUntil(this.destroy$),
    );

    this.summary$ = this.dashboardState.selectedMachine$.pipe(
      filter((m): m is Machine => m !== null),
      switchMap(machine => this.sensorService.getSummaryForMachine(machine.id, 20)),
      takeUntil(this.destroy$),
    );

  }

  ngOnDestroy(): void {
    // Signal all takeUntil(this.destroy$) subscriptions to complete
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── User Interaction ─────────────────────────────────────────────────────

  /** Called when user clicks a tab button. Pure UI state change. */
  setTab(tab: 'live' | 'summary'): void {
    this.activeTab = tab;
  }
}
