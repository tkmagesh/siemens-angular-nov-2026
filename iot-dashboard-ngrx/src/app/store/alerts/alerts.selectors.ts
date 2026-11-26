/**
 * SELECTORS - alerts.selectors.ts
 *
 * NgRx concept: Derived state computed once and memoised.
 *
 * VS plain-RxJS version:
 *   Before: alertService.activeAlerts$ was:
 *             this.alerts$.pipe(map(alerts => alerts.filter(a => !a.acknowledged)))
 *           This ran the filter on EVERY emission of alerts$.
 *   Now:    selectActiveAlerts is a memoised selector — the filter only runs
 *           when the alerts array actually changes.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AlertsState, alertAdapter } from './alerts.state';

export const selectAlertsState = createFeatureSelector<AlertsState>('alerts');

const { selectAll: selectAllAlertsRaw } = alertAdapter.getSelectors();

export const selectAllAlerts = createSelector(selectAlertsState, selectAllAlertsRaw);

export const selectActiveAlerts = createSelector(
  selectAllAlerts,
  alerts => alerts.filter(a => !a.acknowledged)
);

export const selectActiveAlertCount = createSelector(
  selectActiveAlerts,
  alerts => alerts.length
);

export const selectAlertsLoading = createSelector(
  selectAlertsState,
  state => state.loading
);
