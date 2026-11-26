/**
 * ACTIONS - alerts.actions.ts
 *
 * NgRx concept: Every state-changing event is a named, logged action.
 *
 * VS plain-RxJS version:
 *   Before: alertService.acknowledgeAlert(id) patched HTTP and called
 *           this.alertsSource$.next(updatedArray) all in one method —
 *           invisible to DevTools, untraceable.
 *   Now:    component dispatches AlertsActions.acknowledgeAlert({ alertId }).
 *           DevTools shows: "[Alerts] Acknowledge Alert" at timestamp T.
 *           Then: "[Alerts] Acknowledge Alert Success" at T+230ms.
 *           Full audit trail with no extra instrumentation.
 *
 * addAlert is dispatched by the SENSORS EFFECT when a threshold breach is
 * detected — the alerts feature never needs to know about WebSocket.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Alert } from '../../models/alert.model';

export const AlertsActions = createActionGroup({
  source: 'Alerts',
  events: {
    'Load Alerts':         emptyProps(),
    'Load Alerts Success': props<{ alerts: Alert[] }>(),
    'Load Alerts Failure': props<{ error: string }>(),

    // Dispatched when sensor breach detected (by sensors.effects.ts)
    'Add Alert': props<{ alert: Alert }>(),

    // Operator acknowledges an alert
    'Acknowledge Alert':         props<{ alertId: number }>(),
    'Acknowledge Alert Success': props<{ alertId: number }>(),
  },
});
