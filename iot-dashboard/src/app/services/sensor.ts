/**
 * SERVICE - SensorService
 *
 * Responsibility: WebSocket connection + ALL RxJS stream processing of live sensor data.
 *
 * This is the most RxJS-rich service in the app. Every operator used here
 * has a comment explaining WHY it's used, not just what it does.
 *
 * WHAT THIS SERVICE DOES:
 *   1. Opens a WebSocket connection to ws://localhost:8080
 *   2. Parses the incoming JSON array of SensorReadings
 *   3. Splits it into per-machine streams
 *   4. Applies operators: throttle, distinctUntilChanged, scan, etc.
 *   5. Exposes ready-to-use Observables for components to subscribe to
 *
 * RULE: Components never touch WebSocket directly. They only call methods
 * on this service and get back clean, typed Observables.
 */

import { Injectable } from '@angular/core';
import {
  Observable, Subject, ReplaySubject,
  merge, interval, timer,
} from 'rxjs';
import {
  map, filter, throttleTime, distinctUntilChanged,
  scan, bufferTime, withLatestFrom,
  catchError, retry, switchMap,
  share, shareReplay, takeUntil,
  tap, finalize, timeout,
} from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { SensorReading, SensorSummary } from '../models/sensor-reading.model';
import { MachineConfig } from '../models/machine.model';

const WS_URL = 'ws://localhost:8080';

@Injectable({ providedIn: 'root' })
export class SensorService {

  // ─── WebSocket Setup ───────────────────────────────────────────────────────

  /**
   * webSocket() from 'rxjs/webSocket' wraps a native WebSocket in an Observable.
   * - Automatically serialises outgoing messages as JSON
   * - Automatically deserialises incoming messages from JSON
   * - Reconnects on error when combined with retry()
   */
  private socket$: WebSocketSubject<SensorReading[]> = webSocket(WS_URL);

  /**
   * ReplaySubject(50): stores the last 50 sensor readings in memory.
   * Any component that subscribes LATER (e.g. a chart loaded lazily)
   * immediately receives the 50 most recent readings without waiting
   * for the next WebSocket push.
   *
   * Compare with Subject: a plain Subject gives late subscribers nothing.
   * Compare with BehaviorSubject: that holds only 1 value.
   */
  private readingBuffer$ = new ReplaySubject<SensorReading>(50);

  /**
   * Subject used to cleanly shut down all streams (takeUntil pattern).
   * When destroy() is called, this emits once and all streams complete.
   */
  private destroy$ = new Subject<void>();

  constructor() {
    this.connectAndFeed();
  }

  // ─── Connection & Stream Pipeline ─────────────────────────────────────────

  /**
   * Opens the WebSocket and pipes each reading into readingBuffer$.
   *
   * The pipeline demonstrates several key RxJS operators:
   */
  private connectAndFeed(): void {
    this.socket$.pipe(

      // retry(5): if the WebSocket connection drops, automatically
      // reconnect up to 5 times before giving up.
      retry(5),

      // The server sends an ARRAY of readings (one per machine) each tick.
      // mergeMap would flatten that array into individual emissions.
      // Here we use a simple map + feed approach via the loop below.

      // tap: a side-effect operator — perfect for logging without
      // altering the stream. Remove in production.
      tap(readings => console.log('[SensorService] Received batch:', readings.length)),

      // timeout: if no message arrives for 15 seconds, treat the
      // connection as dead and throw an error (which retry() catches).
      timeout(15_000),

      // catchError: if retry gives up, emit an empty array so the
      // rest of the app doesn't crash.
      catchError(err => {
        console.error('[SensorService] Connection failed:', err);
        return [];
      }),

      // takeUntil: when destroy$ emits, this subscription completes.
      // Prevents memory leaks when the service is eventually destroyed.
      takeUntil(this.destroy$),

    ).subscribe(readings => {
      // Feed each individual reading into readingBuffer$
      readings.forEach(r => this.readingBuffer$.next(r));
    });
  }

  // ─── Public API — called by components and other services ─────────────────

  /**
   * Returns a stream of readings for ONE specific machine.
   *
   * Operators applied:
   *   filter         — only pass readings for the requested machine
   *   throttleTime   — max 1 emission per second (UI can't redraw faster anyway)
   *   shareReplay(1) — share ONE subscription across multiple subscribers;
   *                    new subscribers get the last value immediately
   */
  getReadingsForMachine(machineId: number): Observable<SensorReading> {
    return this.readingBuffer$.pipe(
      filter(r => r.machineId === machineId),
      throttleTime(1000),
      shareReplay(1),
    );
  }

  /**
   * Returns a rolling summary (avg/min/max) over the last N readings.
   *
   * Key operator: scan()
   *   scan() is like Array.reduce() but for streams.
   *   It accumulates state across emissions without waiting for the stream to end.
   *   Here it tracks a sliding window of the last `windowSize` readings
   *   and recalculates summary statistics on each new reading.
   */
  getSummaryForMachine(machineId: number, windowSize = 20): Observable<SensorSummary> {
    return this.getReadingsForMachine(machineId).pipe(

      // scan(accumulator, seed)
      // accumulator: (currentState, newValue) => newState
      // seed: initial state ({ readings: [] })
      scan((acc: { readings: SensorReading[] }, reading: SensorReading) => {
        // Keep only the last `windowSize` readings (sliding window)
        const readings = [...acc.readings, reading].slice(-windowSize);
        return { readings };
      }, { readings: [] }),

      // map: transform the accumulated readings into summary statistics
      map(({ readings }) => {
        const temps = readings.map(r => r.temperature);
        const pressures = readings.map(r => r.pressure);
        const rpms = readings.map(r => r.rpm);
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

        return {
          machineId,
          avgTemperature: parseFloat(avg(temps).toFixed(1)),
          minTemperature: Math.min(...temps),
          maxTemperature: Math.max(...temps),
          avgPressure:    parseFloat(avg(pressures).toFixed(2)),
          avgRpm:         Math.round(avg(rpms)),
          sampleCount:    readings.length,
        } as SensorSummary;
      }),
    );
  }

  /**
   * Returns a stream of recent readings (last 50) for a machine.
   * Used by the chart component: thanks to ReplaySubject(50),
   * a chart that mounts 10 seconds after startup still gets 50 data points.
   */
  getReadingHistoryForMachine(machineId: number): Observable<SensorReading> {
    return this.readingBuffer$.pipe(
      filter(r => r.machineId === machineId),
    );
  }

  /**
   * Detects threshold breaches for a machine.
   *
   * Key operators:
   *   bufferTime      — collect readings over a 5s window into an array
   *   withLatestFrom  — attach the current MachineConfig to each buffer emission
   *   filter          — only emit when at least one reading exceeds a threshold
   *
   * The result is a stream that emits the breaching SensorReading whenever
   * a threshold is crossed. AlertService subscribes to this.
   */
  getBreachesForMachine(
    machineId: number,
    config$: Observable<MachineConfig>
  ): Observable<{ reading: SensorReading; config: MachineConfig }> {

    return this.getReadingsForMachine(machineId).pipe(

      // withLatestFrom: on each reading emission, grab the latest config value.
      // The config doesn't drive the stream — the readings do.
      // This is different from combineLatest (which re-emits on either source).
      withLatestFrom(config$),

      // map: reshape [reading, config] tuple into a named object
      map(([reading, config]) => ({ reading, config })),

      // filter: only pass through when a reading actually exceeds a threshold
      filter(({ reading, config }) =>
        reading.temperature > config.maxTemperature ||
        reading.temperature < config.minTemperature ||
        reading.pressure > config.maxPressure ||
        reading.rpm > config.maxRpm
      ),
    );
  }

  /**
   * Checks whether the sensor for a machine has gone silent.
   * If no reading arrives within 10 seconds, the machine is considered offline.
   *
   * Key operator: timeout()
   * Returns an Observable<boolean> — true = online, false = offline.
   */
  getMachineOnlineStatus(machineId: number): Observable<boolean> {
    return this.getReadingsForMachine(machineId).pipe(
      map(() => true),
      timeout({ each: 10_000, with: () => [false] as unknown as Observable<boolean> }),
      distinctUntilChanged(), // don't re-emit if status hasn't changed
      shareReplay(1),
    );
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
