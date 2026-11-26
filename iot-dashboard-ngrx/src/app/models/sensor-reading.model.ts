/**
 * MODELS - sensor-reading.model.ts
 *
 * Defines the shape of live sensor data arriving over WebSocket.
 * Every second the WebSocket server pushes one SensorReading per machine.
 */

export interface SensorReading {
  machineId: number;
  timestamp: number;    // Unix epoch ms — use new Date(timestamp) to display
  temperature: number;  // °C
  pressure: number;     // bar
  rpm: number;          // Rotations per minute
}

/**
 * A summarised snapshot: running min / max / average over a time window.
 * Computed inside SensorService using RxJS scan() operator.
 */
export interface SensorSummary {
  machineId: number;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  avgPressure: number;
  avgRpm: number;
  sampleCount: number;  // how many readings contributed to this summary
}
