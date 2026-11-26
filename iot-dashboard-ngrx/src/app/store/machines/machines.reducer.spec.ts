/**
 * NgRx TESTING PATTERN: Reducer Tests
 *
 * Reducers are pure functions — the simplest thing to test in NgRx.
 * No TestBed, no Angular DI, no HTTP mocks, no async.
 * Just: reducer(state, action) → expectedState
 *
 * Key insight for students:
 *   Because the reducer is a pure function (no side effects, no I/O),
 *   tests are fast, deterministic, and readable.
 *   This is one of the main testing benefits of the NgRx pattern.
 */

import { describe, it, expect } from 'vitest';
import { machinesReducer } from './machines.reducer';
import { initialMachinesState } from './machines.state';
import { MachinesActions } from './machines.actions';
import { Machine, MachineConfig } from '../../models/machine.model';

const mockMachine: Machine = {
  id: 1,
  name: 'Turbine A',
  type: 'Turbine',
  location: 'Hall B',
  status: 'online',
};

const mockConfig: MachineConfig = {
  id: 10,
  machineId: 1,
  minTemperature: 20,
  maxTemperature: 90,
  maxPressure: 10,
  maxRpm: 3000,
};

describe('machinesReducer', () => {

  it('returns initial state for unknown action', () => {
    const result = machinesReducer(undefined, { type: '__unknown__' } as any);
    expect(result).toEqual(initialMachinesState);
  });

  it('loadMachines sets loading:true and clears error', () => {
    const state = { ...initialMachinesState, error: 'previous error' };
    const result = machinesReducer(state, MachinesActions.loadMachines());

    expect(result.loading).toBe(true);
    expect(result.error).toBeNull();
  });

  it('loadMachinesSuccess sets loading:false and populates entity collection', () => {
    const loadingState = { ...initialMachinesState, loading: true };
    const result = machinesReducer(
      loadingState,
      MachinesActions.loadMachinesSuccess({ machines: [mockMachine] })
    );

    expect(result.loading).toBe(false);
    expect(result.ids).toEqual([1]);
    expect(result.entities[1]).toEqual(mockMachine);
  });

  it('loadMachinesSuccess replaces all existing entities', () => {
    const anotherMachine: Machine = { ...mockMachine, id: 2, name: 'Compressor B' };
    // Start with machine 1 in state
    const stateWithMachine1 = machinesReducer(
      initialMachinesState,
      MachinesActions.loadMachinesSuccess({ machines: [mockMachine] })
    );
    // Now load with machine 2 only — machine 1 should be gone
    const result = machinesReducer(
      stateWithMachine1,
      MachinesActions.loadMachinesSuccess({ machines: [anotherMachine] })
    );

    expect(result.ids).toEqual([2]);
    expect(result.entities[1]).toBeUndefined();
  });

  it('loadMachinesFailure stores error message and sets loading:false', () => {
    const loadingState = { ...initialMachinesState, loading: true };
    const result = machinesReducer(
      loadingState,
      MachinesActions.loadMachinesFailure({ error: 'Network error' })
    );

    expect(result.loading).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('selectMachine updates selectedMachineId', () => {
    const result = machinesReducer(
      initialMachinesState,
      MachinesActions.selectMachine({ machine: mockMachine })
    );

    expect(result.selectedMachineId).toBe(1);
  });

  it('selectMachine clears currentConfig (stale config from previous selection)', () => {
    const stateWithConfig = { ...initialMachinesState, currentConfig: mockConfig };
    const result = machinesReducer(
      stateWithConfig,
      MachinesActions.selectMachine({ machine: mockMachine })
    );

    expect(result.currentConfig).toBeNull();
  });

  it('searchMachinesSuccess stores search results', () => {
    const result = machinesReducer(
      initialMachinesState,
      MachinesActions.searchMachinesSuccess({ machines: [mockMachine] })
    );

    expect(result.searchResults).toEqual([mockMachine]);
  });

  it('searchMachinesSuccess with empty array clears results', () => {
    const stateWithResults = { ...initialMachinesState, searchResults: [mockMachine] };
    const result = machinesReducer(
      stateWithResults,
      MachinesActions.searchMachinesSuccess({ machines: [] })
    );

    expect(result.searchResults).toEqual([]);
  });

  it('loadConfigSuccess stores the config', () => {
    const result = machinesReducer(
      initialMachinesState,
      MachinesActions.loadConfigSuccess({ config: mockConfig })
    );

    expect(result.currentConfig).toEqual(mockConfig);
  });

  it('saveConfig sets saving:true and clears error', () => {
    const state = { ...initialMachinesState, error: 'old error' };
    const result = machinesReducer(state, MachinesActions.saveConfig({ config: mockConfig }));

    expect(result.saving).toBe(true);
    expect(result.error).toBeNull();
  });

  it('saveConfigSuccess sets saving:false and updates currentConfig', () => {
    const savingState = { ...initialMachinesState, saving: true };
    const updatedConfig: MachineConfig = { ...mockConfig, maxTemperature: 95 };
    const result = machinesReducer(
      savingState,
      MachinesActions.saveConfigSuccess({ config: updatedConfig })
    );

    expect(result.saving).toBe(false);
    expect(result.currentConfig).toEqual(updatedConfig);
  });

  it('saveConfigFailure sets saving:false and stores error', () => {
    const savingState = { ...initialMachinesState, saving: true };
    const result = machinesReducer(
      savingState,
      MachinesActions.saveConfigFailure({ error: 'Save failed' })
    );

    expect(result.saving).toBe(false);
    expect(result.error).toBe('Save failed');
  });

  it('reducer does not mutate the input state', () => {
    const before = { ...initialMachinesState };
    machinesReducer(initialMachinesState, MachinesActions.loadMachines());

    // initialMachinesState should be unchanged
    expect(initialMachinesState.loading).toBe(false);
    expect(initialMachinesState).toEqual(before);
  });
});
