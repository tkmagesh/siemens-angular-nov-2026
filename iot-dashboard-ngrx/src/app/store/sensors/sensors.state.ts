/**
 * STATE SHAPE - sensors.state.ts
 *
 * NgRx concept: Storing real-time WebSocket data in the state tree.
 *
 * VS plain-RxJS version:
 *   Before: SensorService held a ReplaySubject(50) as an in-memory buffer.
 *           State was hidden inside the service. No DevTools visibility.
 *   Now:    Latest reading per machine lives in the store.
 *           DevTools shows EVERY '[Sensors] Sensor Readings Received' action
 *           with the full payload — instant visibility into the data flow.
 *
 * latestReadings is a map: { [machineId]: SensorReading }
 *   Storing the LATEST reading per machine is enough for the live panel.
 *   Historical data (for charts) would need a separate slice or use a
 *   dedicated time-series store (this is intentionally kept simple here).
 */

import { SensorReading } from '../../models/sensor-reading.model';

export interface SensorsState {
  latestReadings:   { [machineId: number]: SensorReading };
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export const initialSensorsState: SensorsState = {
  latestReadings:   {},
  connectionStatus: 'disconnected',
};
