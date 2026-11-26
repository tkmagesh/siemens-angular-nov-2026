/**
 * COMPONENT - AlertPanelComponent
 *
 * ─── HOW NgRx CHANGES THIS COMPONENT ────────────────────────────────────────
 * BehaviorSubject version:
 *   - Injected AlertService
 *   - activeAlerts$ = this.alertService.activeAlerts$ (direct service property)
 *   - alertCount$ = this.alertService.activeAlertCount$
 *   - onAcknowledge(id) called this.alertService.acknowledgeAlert(id)
 *     which made an HTTP PATCH + updated the BehaviorSubject in one method
 *
 * NgRx version:
 *   - Injects ONLY Store<AppState>
 *   - activeAlerts$ = this.store.select(selectActiveAlerts)
 *   - alertCount$ = this.store.select(selectActiveAlertCount)
 *   - onAcknowledge(id) dispatches AlertsActions.acknowledgeAlert({ alertId: id })
 *     The HTTP call happens in AlertsEffects.acknowledgeAlert$
 *
 * Why does this matter for the student?
 *   The acknowledge workflow is now TRACEABLE in Redux DevTools:
 *   [Alerts] Acknowledge Alert     ← action dispatched here
 *   [Alerts] Acknowledge Alert Success ← effect completed HTTP
 *   Each step is timestamped, logged, and replayable.
 *   With BehaviorSubject, acknowledging was a black box.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI state that belongs here (not in the store):
 *   isExpanded — panel open/closed toggle, purely cosmetic
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import { AlertsActions } from '../../store/alerts/alerts.actions';
import {
  selectActiveAlerts,
  selectActiveAlertCount,
} from '../../store/alerts/alerts.selectors';
import { Alert } from '../../models/alert.model';

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-panel.html',
  styleUrl: './alert-panel.css',
})
export class AlertPanelComponent {

  // ─── Single dependency: the Store ────────────────────────────────────────
  private store = inject(Store<AppState>);

  // ─── State from the store ─────────────────────────────────────────────────

  /**
   * Active (unacknowledged) alerts.
   * AlertsReducer filters out acknowledged ones.
   * selectActiveAlerts = createSelector(selectAll, alerts => alerts.filter(a => !a.acknowledged))
   */
  activeAlerts$: Observable<Alert[]> = this.store.select(selectActiveAlerts);

  /**
   * Count for the badge in the panel header.
   * selectActiveAlertCount = createSelector(selectActiveAlerts, alerts => alerts.length)
   * Memoized — only recomputes when the filtered list actually changes.
   */
  alertCount$: Observable<number> = this.store.select(selectActiveAlertCount);

  // ─── UI-only State ────────────────────────────────────────────────────────

  /** Panel open/closed. Purely cosmetic — does not belong in global store. */
  isExpanded = true;

  // ─── User Interaction ─────────────────────────────────────────────────────

  /**
   * Dispatches acknowledgeAlert action.
   *
   * BehaviorSubject version: this.alertService.acknowledgeAlert(id)
   *   → one method did HTTP PATCH + BehaviorSubject update
   *
   * NgRx version: this.store.dispatch(AlertsActions.acknowledgeAlert({ alertId }))
   *   → AlertsEffects.acknowledgeAlert$ makes the HTTP PATCH
   *   → On success, dispatches acknowledgeAlertSuccess({ alert })
   *   → AlertsReducer marks the alert as acknowledged
   *   → selectActiveAlerts excludes it
   *   → Template re-renders
   *
   * The component has ZERO knowledge of HTTP. Pure UI → action dispatch.
   */
  onAcknowledge(alertId: number): void {
    this.store.dispatch(AlertsActions.acknowledgeAlert({ alertId }));
  }

  /** Toggle panel visibility. Pure UI concern — stays in the component. */
  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
