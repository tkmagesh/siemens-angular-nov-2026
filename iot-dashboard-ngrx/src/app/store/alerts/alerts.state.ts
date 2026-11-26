/**
 * STATE SHAPE - alerts.state.ts
 *
 * NgRx/Entity normalises the alert collection identically to machines:
 *   { ids: [1, 2], entities: { 1: Alert, 2: Alert } }
 *
 * VS plain-RxJS version:
 *   Before: AlertService held a BehaviorSubject<Alert[]> whose array was
 *           prepended/filtered by imperative calls inside the service.
 *   Now:    alerts live in the store. Reducer uses EntityAdapter.addOne/updateOne.
 *           Any component can read them via selectors.
 */

import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { Alert } from '../../models/alert.model';

export interface AlertsState extends EntityState<Alert> {
  loading: boolean;
  error:   string | null;
}

export const alertAdapter = createEntityAdapter<Alert>();

export const initialAlertsState: AlertsState = alertAdapter.getInitialState({
  loading: false,
  error:   null,
});
