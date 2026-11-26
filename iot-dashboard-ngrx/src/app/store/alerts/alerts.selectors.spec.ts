/**
 * TESTS - alerts.selectors.spec.ts
 *
 * Tests selectActiveAlerts — the most important derived selector.
 *
 * VS plain-RxJS version:
 *   Before: alertService.activeAlerts$ was a derived pipe.
 *   Testing it required subscribing and asserting emissions.
 *   Now:    selectActiveAlerts is just a function. Call it, check the return.
 */

import { describe, it, expect } from 'vitest';
import {
  selectAllAlerts,
  selectActiveAlerts,
  selectActiveAlertCount,
} from './alerts.selectors';
import { AlertsState, alertAdapter, initialAlertsState } from './alerts.state';
import { AppState } from '../app.state';
import { initialMachinesState } from '../machines/machines.state';
import { initialSensorsState } from '../sensors/sensors.state';
import { initialDashboardState } from '../dashboard/dashboard.state';
import { Alert } from '../../models/alert.model';

const alert1: Alert = { id: 1, machineId: 1, machineName: 'Turbine A', metric: 'temperature', value: 95, threshold: 90, severity: 'warning', message: '', timestamp: 1000, acknowledged: false };
const alert2: Alert = { id: 2, machineId: 2, machineName: 'Pump X',    metric: 'pressure',    value: 6,  threshold: 5,  severity: 'critical', message: '', timestamp: 2000, acknowledged: true  };

function buildState(partial: Partial<AlertsState>): AppState {
  return {
    machines:  initialMachinesState,
    alerts:    { ...initialAlertsState, ...partial },
    sensors:   initialSensorsState,
    dashboard: initialDashboardState,
  };
}

describe('alerts selectors', () => {

  it('selectAllAlerts returns all alerts regardless of acknowledged status', () => {
    const entities = alertAdapter.setAll([alert1, alert2], initialAlertsState);
    const state = buildState(entities);
    expect(selectAllAlerts(state)).toHaveLength(2);
  });

  it('selectActiveAlerts filters out acknowledged alerts', () => {
    const entities = alertAdapter.setAll([alert1, alert2], initialAlertsState);
    const state = buildState(entities);
    const active = selectActiveAlerts(state);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(1);
  });

  it('selectActiveAlerts returns empty array when all acknowledged', () => {
    const acked = { ...alert1, acknowledged: true };
    const entities = alertAdapter.setAll([acked, alert2], initialAlertsState);
    const state = buildState(entities);
    expect(selectActiveAlerts(state)).toHaveLength(0);
  });

  it('selectActiveAlertCount reflects filtered count', () => {
    const entities = alertAdapter.setAll([alert1, alert2], initialAlertsState);
    const state = buildState(entities);
    expect(selectActiveAlertCount(state)).toBe(1);
  });

  it('selectActiveAlertCount is 0 with empty alerts', () => {
    const state = buildState({});
    expect(selectActiveAlertCount(state)).toBe(0);
  });
});
