/**
 * SERVICE - AlertService
 *
 * Responsibility: Alert detection, storage, and retrieval.
 *
 * WHAT THIS SERVICE DOES:
 *   1. Subscribes to SensorService.getBreachesForMachine() for each machine
 *   2. Converts a breach into an Alert object
 *   3. Saves it to json-server (POST /alerts)
 *   4. Pushes it onto an in-memory BehaviorSubject so the UI updates instantly
 *      (without waiting for a full reload from the server)
 *   5. Exposes observables for the AlertPanel component to subscribe to
 *
 * RxJS SUBJECTS USED:
 *   BehaviorSubject — holds the current list of active alerts.
 *                     New subscribers immediately get the current list.
 *   Subject         — used as event bus when an alert is acknowledged.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, groupBy, mergeMap, toArray } from 'rxjs/operators';
import { Alert, AlertSeverity } from '../models/alert.model';
import { MachineConfig } from '../models/machine.model';
import { SensorReading } from '../models/sensor-reading.model';

@Injectable({ providedIn: 'root' })
export class AlertService {

  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000';

  // ─── Shared State (BehaviorSubject) ────────────────────────────────────────

  /**
   * BehaviorSubject: holds the current alert list.
   *
   * Why BehaviorSubject over plain Subject?
   *   - Any component that subscribes (even after alerts were created)
   *     immediately receives the current value — no empty screen on load.
   *   - getValue() lets us read the current value synchronously when needed.
   *
   * Private: only AlertService can push new values.
   * Public read-only access via alerts$ below.
   */
  private alertsSource$ = new BehaviorSubject<Alert[]>([]);

  /**
   * Public read-only view of the alerts stream.
   * Components subscribe to this — they cannot push into it.
   */
  readonly alerts$: Observable<Alert[]> = this.alertsSource$.asObservable();

  /**
   * Subject: fires whenever an alert is acknowledged.
   * NotificationService subscribes to this to show a toast message.
   *
   * Why Subject (not BehaviorSubject)?
   *   - There is no "current value" — it's a one-time event.
   *   - Subscribers only care about future acknowledgements, not past ones.
   */
  readonly acknowledged$ = new Subject<Alert>();

  // ─── Derived Streams (computed from alerts$) ──────────────────────────────

  /**
   * Stream of unacknowledged alerts only.
   * Uses map() to filter the array every time alerts$ emits.
   */
  readonly activeAlerts$: Observable<Alert[]> = this.alerts$.pipe(
    map(alerts => alerts.filter(a => !a.acknowledged))
  );

  /**
   * Count of active (unacknowledged) alerts — used by the nav badge.
   */
  readonly activeAlertCount$: Observable<number> = this.activeAlerts$.pipe(
    map(alerts => alerts.length)
  );

  // ─── Initialisation ───────────────────────────────────────────────────────

  /**
   * Loads historical alerts from json-server on startup.
   * Called once from AppComponent or a route guard.
   */
  loadAlerts(): void {
    this.http.get<Alert[]>(`${this.baseUrl}/alerts`).subscribe(alerts => {
      this.alertsSource$.next(alerts);
    });
  }

  // ─── Core: Receive a Breach and Create an Alert ───────────────────────────

  /**
   * Called by DashboardStateService when SensorService detects a breach.
   * Builds an Alert, saves it to the server, then updates the in-memory stream.
   */
  handleBreach(
    reading: SensorReading,
    config: MachineConfig,
    machineName: string
  ): void {

    const alert = this.buildAlert(reading, config, machineName);

    // Save to json-server for persistence
    this.http.post<Alert>(`${this.baseUrl}/alerts`, alert).subscribe(saved => {
      // saved has the id assigned by json-server
      const current = this.alertsSource$.getValue();
      // Prepend to list so newest alert appears first
      this.alertsSource$.next([saved, ...current]);
    });
  }

  /**
   * Marks an alert as acknowledged (operator has seen it).
   * Sends PATCH to server, updates in-memory list, fires acknowledged$ event.
   */
  acknowledgeAlert(alertId: number): void {
    this.http
      .patch<Alert>(`${this.baseUrl}/alerts/${alertId}`, { acknowledged: true })
      .subscribe(updated => {
        // Replace the old version of this alert in the in-memory list
        const current = this.alertsSource$.getValue();
        const updated$ = current.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
        this.alertsSource$.next(updated$);

        // Notify other parts of the app via the event Subject
        const acknowledgedAlert = updated$.find(a => a.id === alertId);
        if (acknowledgedAlert) this.acknowledged$.next(acknowledgedAlert);
      });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private buildAlert(
    reading: SensorReading,
    config: MachineConfig,
    machineName: string
  ): Alert {

    // Determine which metric was breached and build the message
    if (reading.temperature > config.maxTemperature) {
      return this.makeAlert(reading, machineName, 'temperature', reading.temperature, config.maxTemperature, 'critical', '°C exceeds max');
    }
    if (reading.temperature < config.minTemperature) {
      return this.makeAlert(reading, machineName, 'temperature', reading.temperature, config.minTemperature, 'warning', '°C below min');
    }
    if (reading.pressure > config.maxPressure) {
      return this.makeAlert(reading, machineName, 'pressure', reading.pressure, config.maxPressure, 'critical', 'bar exceeds max');
    }
    return this.makeAlert(reading, machineName, 'rpm', reading.rpm, config.maxRpm, 'warning', 'RPM exceeds max');
  }

  private makeAlert(
    reading: SensorReading,
    machineName: string,
    metric: Alert['metric'],
    value: number,
    threshold: number,
    severity: AlertSeverity,
    suffix: string
  ): Alert {
    return {
      machineId: reading.machineId,
      machineName,
      metric,
      value,
      threshold,
      severity,
      message: `${machineName}: ${metric} ${value} ${suffix} ${threshold}`,
      timestamp: reading.timestamp,
      acknowledged: false,
    };
  }
}
