/**
 * ACTIONS - sensors.actions.ts
 *
 * NgRx concept: Real-time WebSocket data modelled as a stream of Actions.
 *
 * VS plain-RxJS version:
 *   Before: SensorService held a ReplaySubject(50) as `readingBuffer$`.
 *           Any component that subscribed got the last 50 readings replayed.
 *           The buffer was invisible — no DevTools trace, no audit log.
 *   Now:    Every batch of readings becomes a '[Sensors] Sensor Readings Received'
 *           action visible in Redux DevTools.
 *           You can literally watch the sensor data stream in the action log.
 *
 * BREACH DETECTION NOTE:
 *   In the plain-RxJS version, breach detection lived in SensorService using
 *   withLatestFrom(config$) + filter. In NgRx, the effect detects breaches and
 *   dispatches AlertsActions.addAlert() — keeping sensor and alert concerns
 *   cleanly separated as action types rather than tangled observables.
 *
 * CONNECTION LIFECYCLE:
 *   connectWebSocket → (effect opens WS) → connected / disconnected
 *   These let components and DevTools see the connection lifecycle.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { SensorReading } from '../../models/sensor-reading.model';

export const SensorsActions = createActionGroup({
  source: 'Sensors',
  events: {
    // ── Connection lifecycle ───────────────────────────────────────────────
    'Connect Web Socket':    emptyProps(),
    'Connected':             emptyProps(),
    'Disconnected':          emptyProps(),

    // ── Live readings ──────────────────────────────────────────────────────
    // 'readings' is an array — the WS server sends one batch per second,
    // one SensorReading per machine. Storing as a batch keeps the action log
    // readable: one action per second instead of four.
    'Sensor Readings Received': props<{ readings: SensorReading[] }>(),
  },
});
