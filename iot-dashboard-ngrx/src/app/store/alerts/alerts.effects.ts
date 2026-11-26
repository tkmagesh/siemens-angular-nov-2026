/**
 * EFFECTS - alerts.effects.ts
 *
 * NgRx concept: Effects keep components and reducers free of HTTP calls.
 *
 * VS plain-RxJS version:
 *   Before: AlertService.loadAlerts() called this.http.get() and then
 *           called this.alertsSource$.next(alerts) directly.
 *   Now:    Effect listens for AlertsActions.loadAlerts, calls HTTP,
 *           dispatches AlertsActions.loadAlertsSuccess.
 *           The reducer handles the rest. Clear separation of concerns.
 *
 * Note: addAlert is NOT handled here — it is dispatched directly by
 * SensorsEffects.detectBreaches$ when a threshold breach is found.
 * This shows how NgRx features can communicate via shared actions
 * without importing each other.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, mergeMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AlertsActions } from './alerts.actions';
import { Alert } from '../../models/alert.model';

const BASE = 'http://localhost:3000';

@Injectable()
export class AlertsEffects {

  private actions$ = inject(Actions);
  private http      = inject(HttpClient);

  loadAlerts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AlertsActions.loadAlerts),
      switchMap(() =>
        this.http.get<Alert[]>(`${BASE}/alerts`).pipe(
          map(alerts => AlertsActions.loadAlertsSuccess({ alerts })),
          catchError(err => of(AlertsActions.loadAlertsFailure({ error: err.message }))),
        )
      ),
    )
  );

  // When a breach alert is added to the store, also persist it to json-server.
  // mergeMap: allow concurrent saves (multiple breaches can happen simultaneously).
  persistAlert$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AlertsActions.addAlert),
      mergeMap(({ alert }) =>
        this.http.post<Alert>(`${BASE}/alerts`, alert).pipe(
          // We already have the alert in-store (addOne in reducer).
          // The POST result gives us the server-assigned id — we could
          // upsert it here, but for simplicity we ignore the response.
          catchError(() => of({ type: '[Alerts] Persist Failed (silent)' })),
        )
      ),
    ),
    { dispatch: false }   // ← this effect does NOT dispatch a follow-up action
  );

  acknowledgeAlert$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AlertsActions.acknowledgeAlert),
      mergeMap(({ alertId }) =>
        this.http.patch<Alert>(`${BASE}/alerts/${alertId}`, { acknowledged: true }).pipe(
          map(() => AlertsActions.acknowledgeAlertSuccess({ alertId })),
          catchError(err => of(AlertsActions.loadAlertsFailure({ error: err.message }))),
        )
      ),
    )
  );
}
