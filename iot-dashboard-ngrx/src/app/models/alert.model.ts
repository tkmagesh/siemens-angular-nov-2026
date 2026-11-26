/**
 * MODELS - alert.model.ts
 *
 * Defines the shape of an alert — generated when a sensor reading
 * crosses a configured threshold (e.g. temperature > maxTemperature).
 *
 * Alerts are both:
 *   - Generated in real-time by SensorService (using RxJS operators)
 *   - Persisted to json-server (POST /alerts) for history
 */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id?: number;            // assigned by json-server on save; absent before save
  machineId: number;
  machineName: string;
  metric: 'temperature' | 'pressure' | 'rpm';
  value: number;          // the reading that triggered the alert
  threshold: number;      // the limit that was crossed
  severity: AlertSeverity;
  message: string;        // human-readable: e.g. "Temperature 95°C exceeds max 90°C"
  timestamp: number;      // Unix epoch ms
  acknowledged: boolean;  // true once an operator has seen and dismissed it
}
