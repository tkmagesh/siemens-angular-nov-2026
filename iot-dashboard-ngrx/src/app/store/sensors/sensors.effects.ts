/**
 * EFFECTS - sensors.effects.ts
 *
 * NgRx concept: Effects handling a persistent WebSocket connection.
 * This is one of the more advanced NgRx patterns — a long-lived effect.
 *
 * ─── KEY CONCEPT: Long-lived vs Request/Response Effects ─────────────────
 *
 * Most effects follow the pattern:
 *   action → HTTP call (short-lived) → result action
 *
 * WebSocket is different: the connection stays open and pushes data
 * continuously. We model this by returning a NEVER-COMPLETING observable
 * from the switchMap — the WebSocket subject stream itself.
 *
 * VS plain-RxJS version:
 *   Before: SensorService opened the WebSocket in the constructor and pushed
 *           readings directly into readingBuffer$ (ReplaySubject).
 *           Components subscribed to SensorService — tight coupling.
 *   Now:    SensorsEffects opens the WebSocket on 'connectWebSocket' action.
 *           Each reading batch is dispatched as 'sensorReadingsReceived' action.
 *           Components never know WebSocket exists — they read from the store.
 *
 * ─── BREACH DETECTION ────────────────────────────────────────────────────
 *
 * VS plain-RxJS version:
 *   Before: SensorService.getBreachesForMachine() used withLatestFrom(config$)
 *           to compare a reading against thresholds. Called per-machine.
 *   Now:    detectBreaches$ effect runs after every batch lands in the store.
 *           It reads the config from the store (withLatestFrom selectCurrentConfig),
 *           compares each reading, and dispatches AlertsActions.addAlert() for
 *           any breach found. The alerts feature handles the rest.
 *
 * WHY { dispatch: false } ON connectAndStream$?
 *   This effect returns void (it dispatches inside the pipe).
 *   Without dispatch:false NgRx would try to dispatch the stream output as
 *   actions, causing an error.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { webSocket } from 'rxjs/webSocket';
import { switchMap, tap, withLatestFrom, map } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { SensorsActions } from './sensors.actions';
import { AlertsActions } from '../alerts/alerts.actions';
import { selectCurrentConfig } from '../machines/machines.selectors';
import { selectAllMachines } from '../machines/machines.selectors';
import { SensorReading } from '../../models/sensor-reading.model';
import { Alert } from '../../models/alert.model';
import { AppState } from '../app.state';

const WS_URL = 'ws://localhost:8080';

@Injectable()
export class SensorsEffects {

  private actions$ = inject(Actions);
  private store    = inject(Store<AppState>);

  // ── Open WebSocket and stream readings into the store ─────────────────────
  //
  // switchMap: if connectWebSocket is dispatched again (e.g. reconnect),
  // the previous WS connection is closed and a new one opens.
  //
  // { dispatch: false }: this effect dispatches inside the pipe rather
  // than returning an action from the observable.

  connectAndStream$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SensorsActions.connectWebSocket),
      switchMap(() => {
        const ws$ = webSocket<SensorReading[]>(WS_URL);

        // Notify the store that the connection opened
        this.store.dispatch(SensorsActions.connected());

        return ws$.pipe(
          tap(readings => {
            this.store.dispatch(SensorsActions.sensorReadingsReceived({ readings }));
          }),
        );
      }),
    ),
    { dispatch: false }
  );

  // ── Breach detection ──────────────────────────────────────────────────────
  //
  // VS plain-RxJS version's withLatestFrom(config$) per machine:
  //   Now we use withLatestFrom(selectCurrentConfig) on the SELECTED machine's
  //   config and compare each incoming reading for that machine.
  //
  // Runs after every batch. Only checks the SELECTED machine's config
  // (the one the operator is currently looking at) to match the original demo.
  // A production system might check all machines.

  detectBreaches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SensorsActions.sensorReadingsReceived),
      withLatestFrom(
        this.store.select(selectCurrentConfig),
        this.store.select(selectAllMachines),
      ),
      switchMap(([{ readings }, config, machines]) => {
        if (!config) return EMPTY;

        const reading = readings.find(r => r.machineId === config.machineId);
        if (!reading) return EMPTY;

        const machine = machines.find(m => m.id === config.machineId);
        const name = machine?.name ?? `Machine ${config.machineId}`;
        const now = Date.now();
        const breachActions: ReturnType<typeof AlertsActions.addAlert>[] = [];

        if (reading.temperature > config.maxTemperature) {
          breachActions.push(AlertsActions.addAlert({ alert: buildAlert({
            machineId: config.machineId, machineName: name, metric: 'temperature',
            value: reading.temperature, threshold: config.maxTemperature,
            severity: reading.temperature > config.maxTemperature * 1.1 ? 'critical' : 'warning',
            message: `Temperature ${reading.temperature.toFixed(1)}°C exceeds max ${config.maxTemperature}°C`,
            timestamp: now,
          })}));
        }

        if (reading.temperature < config.minTemperature) {
          breachActions.push(AlertsActions.addAlert({ alert: buildAlert({
            machineId: config.machineId, machineName: name, metric: 'temperature',
            value: reading.temperature, threshold: config.minTemperature,
            severity: 'warning',
            message: `Temperature ${reading.temperature.toFixed(1)}°C below min ${config.minTemperature}°C`,
            timestamp: now,
          })}));
        }

        if (reading.pressure > config.maxPressure) {
          breachActions.push(AlertsActions.addAlert({ alert: buildAlert({
            machineId: config.machineId, machineName: name, metric: 'pressure',
            value: reading.pressure, threshold: config.maxPressure,
            severity: 'critical',
            message: `Pressure ${reading.pressure.toFixed(2)} bar exceeds max ${config.maxPressure} bar`,
            timestamp: now,
          })}));
        }

        if (reading.rpm > config.maxRpm) {
          breachActions.push(AlertsActions.addAlert({ alert: buildAlert({
            machineId: config.machineId, machineName: name, metric: 'rpm',
            value: reading.rpm, threshold: config.maxRpm,
            severity: 'warning',
            message: `RPM ${reading.rpm.toFixed(0)} exceeds max ${config.maxRpm}`,
            timestamp: now,
          })}));
        }

        return breachActions;
      }),
    )
  );
}

// ── Helper — avoids repeating the full Alert shape in every branch ───────────
function buildAlert(partial: Omit<Alert, 'acknowledged'>): Alert {
  return { ...partial, acknowledged: false };
}
