/**
 * NgRx TESTING PATTERN: Selector Tests
 *
 * Selectors are also pure functions: (AppState) => derivedValue.
 * Tests are equally simple: build a mock AppState, call the selector,
 * assert the result.
 *
 * Key insight for students:
 *   Memoisation means if the input slices haven't changed, the selector
 *   returns the SAME object reference. This is what prevents unnecessary
 *   re-renders in Angular components.
 *   Test: call the selector twice with the same state → same reference.
 */

import { describe, it, expect } from 'vitest';
import {
  selectAllMachines,
  selectMachinesLoading,
  selectSelectedMachineId,
  selectSelectedMachine,
  selectCurrentConfig,
  selectSearchResults,
  selectMachinesSaving,
  selectMachinesError,
} from './machines.selectors';
import { machineAdapter, initialMachinesState, MachinesState } from './machines.state';
import { initialAlertsState } from '../alerts/alerts.state';
import { initialSensorsState } from '../sensors/sensors.state';
import { initialDashboardState } from '../dashboard/dashboard.state';
import { AppState } from '../app.state';
import { Machine, MachineConfig } from '../../models/machine.model';

const machine1: Machine = {
  id: 1, name: 'Turbine A', type: 'Turbine', location: 'Hall B', status: 'online',
};
const machine2: Machine = {
  id: 2, name: 'Compressor B', type: 'Compressor', location: 'Hall C', status: 'offline',
};
const mockConfig: MachineConfig = {
  id: 10, machineId: 1, minTemperature: 20, maxTemperature: 90, maxPressure: 10, maxRpm: 3000,
};

function buildAppState(overrides: Partial<MachinesState> = {}): AppState {
  const machines: MachinesState = {
    ...initialMachinesState,
    ...overrides,
  };
  return {
    machines,
    alerts:    initialAlertsState,
    sensors:   initialSensorsState,
    dashboard: initialDashboardState,
  };
}

function stateWithMachines(...machines: Machine[]): MachinesState {
  return machineAdapter.setAll(machines, initialMachinesState);
}

describe('machines selectors', () => {

  describe('selectAllMachines', () => {
    it('returns empty array for initial state', () => {
      expect(selectAllMachines(buildAppState())).toEqual([]);
    });

    it('returns all machines as an array', () => {
      const state = buildAppState(stateWithMachines(machine1, machine2));
      const result = selectAllMachines(state);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(machine1);
      expect(result).toContainEqual(machine2);
    });
  });

  describe('selectMachinesLoading', () => {
    it('returns false initially', () => {
      expect(selectMachinesLoading(buildAppState())).toBe(false);
    });

    it('returns true when loading is true', () => {
      const state = buildAppState({ loading: true });
      expect(selectMachinesLoading(state)).toBe(true);
    });
  });

  describe('selectSelectedMachineId', () => {
    it('returns null initially', () => {
      expect(selectSelectedMachineId(buildAppState())).toBeNull();
    });

    it('returns the selected machine id', () => {
      const state = buildAppState({ selectedMachineId: 2 });
      expect(selectSelectedMachineId(state)).toBe(2);
    });
  });

  describe('selectSelectedMachine', () => {
    it('returns null when no machine is selected', () => {
      const state = buildAppState(stateWithMachines(machine1));
      expect(selectSelectedMachine(state)).toBeNull();
    });

    it('returns null when selected id does not match any machine', () => {
      const machines = stateWithMachines(machine1);
      const state = buildAppState({ ...machines, selectedMachineId: 999 });
      expect(selectSelectedMachine(state)).toBeNull();
    });

    it('returns the correct machine when id matches', () => {
      const machines = stateWithMachines(machine1, machine2);
      const state = buildAppState({ ...machines, selectedMachineId: 2 });
      expect(selectSelectedMachine(state)).toEqual(machine2);
    });

    it('is memoised — same input state returns same reference', () => {
      const state = buildAppState({ ...stateWithMachines(machine1), selectedMachineId: 1 });
      const first  = selectSelectedMachine(state);
      const second = selectSelectedMachine(state);
      expect(first).toBe(second); // same object reference
    });
  });

  describe('selectCurrentConfig', () => {
    it('returns null initially', () => {
      expect(selectCurrentConfig(buildAppState())).toBeNull();
    });

    it('returns the config when set', () => {
      const state = buildAppState({ currentConfig: mockConfig });
      expect(selectCurrentConfig(state)).toEqual(mockConfig);
    });
  });

  describe('selectSearchResults', () => {
    it('returns empty array initially', () => {
      expect(selectSearchResults(buildAppState())).toEqual([]);
    });

    it('returns search results when present', () => {
      const state = buildAppState({ searchResults: [machine1] });
      expect(selectSearchResults(state)).toEqual([machine1]);
    });
  });

  describe('selectMachinesSaving', () => {
    it('returns false initially', () => {
      expect(selectMachinesSaving(buildAppState())).toBe(false);
    });

    it('returns true when saving', () => {
      const state = buildAppState({ saving: true });
      expect(selectMachinesSaving(state)).toBe(true);
    });
  });

  describe('selectMachinesError', () => {
    it('returns null initially', () => {
      expect(selectMachinesError(buildAppState())).toBeNull();
    });

    it('returns the error string when present', () => {
      const state = buildAppState({ error: 'Network error' });
      expect(selectMachinesError(state)).toBe('Network error');
    });
  });
});
