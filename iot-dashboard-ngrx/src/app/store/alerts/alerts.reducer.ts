/**
 * REDUCER - alerts.reducer.ts
 *
 * NgRx concept: Immutable state updates via EntityAdapter helpers.
 *
 * VS plain-RxJS version:
 *   Before: this.alertsSource$.next([saved, ...current])
 *           ↑ Direct mutation of BehaviorSubject — works but invisible.
 *   Now:    alertAdapter.addOne(alert, state)
 *           ↑ Returns a NEW state object. The old state is untouched.
 *           Redux DevTools can show the diff between old and new state.
 *
 * addOne/setAll/updateOne all return a NEW state — no mutation.
 */

import { createReducer, on } from '@ngrx/store';
import { AlertsActions } from './alerts.actions';
import { alertAdapter, initialAlertsState } from './alerts.state';

export const alertsReducer = createReducer(
  initialAlertsState,

  on(AlertsActions.loadAlerts, state => ({
    ...state, loading: true, error: null,
  })),

  on(AlertsActions.loadAlertsSuccess, (state, { alerts }) =>
    alertAdapter.setAll(alerts, { ...state, loading: false })
  ),

  on(AlertsActions.loadAlertsFailure, (state, { error }) => ({
    ...state, loading: false, error,
  })),

  // New alert prepended: use addOne (EntityAdapter adds to entities map and ids array)
  on(AlertsActions.addAlert, (state, { alert }) =>
    alertAdapter.addOne(alert, state)
  ),

  // Mark acknowledged in-memory immediately on success (optimistic update)
  on(AlertsActions.acknowledgeAlertSuccess, (state, { alertId }) =>
    alertAdapter.updateOne(
      { id: alertId, changes: { acknowledged: true } },
      state
    )
  ),
);
