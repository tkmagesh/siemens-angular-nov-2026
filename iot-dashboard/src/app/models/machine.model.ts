/**
 * MODELS - machine.model.ts
 *
 * Models (also called interfaces) define the SHAPE of data objects used
 * throughout the app. Think of them as contracts: any object that claims
 * to be a "Machine" must have exactly these properties.
 *
 * Why use models?
 * - TypeScript catches mistakes at compile time (e.g. typo in property name)
 * - IDE auto-complete works correctly
 * - Code is self-documenting — the model tells you what a Machine looks like
 */

/**
 * Represents a physical machine on the factory floor.
 * Data comes from json-server (GET /machines).
 */
export interface Machine {
  id: number;
  name: string;         // e.g. "Turbine A"
  type: string;         // e.g. "Turbine" | "Compressor" | "Pump"
  location: string;     // e.g. "Hall B - Slot 3"
  status: 'online' | 'offline' | 'maintenance';
}

/**
 * Configuration thresholds for a machine.
 * Stored separately so they can be updated independently of machine metadata.
 * Data comes from json-server (GET /configs/:machineId).
 */
export interface MachineConfig {
  id: number;
  machineId: number;
  minTemperature: number;   // °C — alert if reading drops below this
  maxTemperature: number;   // °C — alert if reading exceeds this
  maxPressure: number;      // bar — alert if reading exceeds this
  maxRpm: number;           // RPM — alert if reading exceeds this
}
