/**
 * NgRx TESTING PATTERN: Reducer Tests (alerts feature)
 *
 * Same pure-function pattern as machines.reducer.spec.ts.
 * Demonstrates EntityAdapter helpers (addOne, updateOne, setAll)
 * and how they produce new state without mutation.
 */

import { describe, it, expect } from 'vitest';
import { alertsReducer } from './alerts.reducer';
import { initialAlertsState } from './alerts.state';
import { AlertsActions } from './alerts.actions';
import { Alert } from '../../models/alert.model';

const mockAlert: Alert = {
  id: 1,
  machineId: 1,
  machineName: 'Turbine A',
  metric: 'temperature',
  value: 95,
  threshold: 90,
  severity: 'warning',
  message: 'Temperature 95°C exceeds max 90°C',
  timestamp: 1700000000000,
  acknowledged: false,
};

describe('alertsReducer', () => {

  it('returns initial state for unknown action', () => {
    const result = alertsReducer(undefined, { type: '__unknown__' } as any);
    expect(result).toEqual(initialAlertsState);
  });

  it('loadAlerts sets loading:true', () => {
    const result = alertsReducer(initialAlertsState, AlertsActions.loadAlerts());
    expect(result.loading).toBe(true);
  });

  it('loadAlertsSuccess populates the entity collection and sets loading:false', () => {
    const loadingState = { ...initialAlertsState, loading: true };
    const result = alertsReducer(
      loadingState,
      AlertsActions.loadAlertsSuccess({ alerts: [mockAlert] })
    );

    expect(result.loading).toBe(false);
    expect(result.ids).toEqual([1]);
    expect(result.entities[1]).toEqual(mockAlert);
  });

  it('loadAlertsFailure stores error and sets loading:false', () => {
    const loadingState = { ...initialAlertsState, loading: true };
    const result = alertsReducer(
      loadingState,
      AlertsActions.loadAlertsFailure({ error: 'HTTP error' })
    );

    expect(result.loading).toBe(false);
    expect(result.error).toBe('HTTP error');
  });

  it('addAlert adds a new alert entity', () => {
    const result = alertsReducer(
      initialAlertsState,
      AlertsActions.addAlert({ alert: mockAlert })
    );

    expect(result.ids).toContain(1);
    expect(result.entities[1]).toEqual(mockAlert);
  });

  it('addAlert accumulates multiple alerts', () => {
    const second: Alert = { ...mockAlert, id: 2, metric: 'pressure' };
    let state = alertsReducer(initialAlertsState, AlertsActions.addAlert({ alert: mockAlert }));
    state = alertsReducer(state, AlertsActions.addAlert({ alert: second }));

    expect(state.ids).toHaveLength(2);
    expect(state.ids).toContain(2);
  });

  it('acknowledgeAlertSuccess flips acknowledged:true for the given alertId', () => {
    // First add the alert
    const stateWithAlert = alertsReducer(
      initialAlertsState,
      AlertsActions.addAlert({ alert: mockAlert })
    );
    expect(stateWithAlert.entities[1]!.acknowledged).toBe(false);

    // Then acknowledge it
    const result = alertsReducer(
      stateWithAlert,
      AlertsActions.acknowledgeAlertSuccess({ alertId: 1 })
    );

    expect(result.entities[1]!.acknowledged).toBe(true);
  });

  it('acknowledgeAlertSuccess only changes the targeted alert', () => {
    const second: Alert = { ...mockAlert, id: 2, acknowledged: false };
    let state = alertsReducer(initialAlertsState, AlertsActions.addAlert({ alert: mockAlert }));
    state = alertsReducer(state, AlertsActions.addAlert({ alert: second }));
    state = alertsReducer(state, AlertsActions.acknowledgeAlertSuccess({ alertId: 1 }));

    // Alert 1 acknowledged, alert 2 unchanged
    expect(state.entities[1]!.acknowledged).toBe(true);
    expect(state.entities[2]!.acknowledged).toBe(false);
  });

  it('reducer does not mutate input state', () => {
    const before = { ...initialAlertsState };
    alertsReducer(initialAlertsState, AlertsActions.loadAlerts());
    expect(initialAlertsState).toEqual(before);
  });
});
