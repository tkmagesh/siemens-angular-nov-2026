/**
 * UNIT TESTS — DashboardStateService
 *
 * CONCEPTS UNDER TEST:
 *
 * 1. BehaviorSubject as shared UI state:
 *    selectedMachine$ and currentConfig$ always hold a current value.
 *    Components across the app subscribe to these instead of @Input() drilling.
 *
 * 2. Auto-loading config on machine selection (switchMap):
 *    Whenever the user picks a machine, wireConfigToSelection() automatically
 *    fires an HTTP request to load that machine's config.
 *
 * 3. Search with debounceTime + distinctUntilChanged + switchMap:
 *    - Waits 300ms after last keystroke before calling the server.
 *    - Skips repeated identical terms.
 *    - Cancels in-flight requests when a new term arrives.
 *
 * MOCKING DEPENDENCIES:
 *   DashboardStateService injects MachineService, SensorService, AlertService.
 *   We REPLACE them with mock objects so:
 *     - Tests are fast (no real HTTP, no WebSocket).
 *     - Tests are focused (only testing DashboardStateService logic).
 *     - SensorService's WebSocket connection is never started.
 *
 * FAKE TIMERS (vi.useFakeTimers):
 *   debounceTime(300) uses JavaScript's setTimeout internally.
 *   vi.useFakeTimers() replaces setTimeout with a controllable fake.
 *   vi.advanceTimersByTime(ms) moves the fake clock forward.
 *   This lets us test debounce without actually waiting 300ms.
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardStateService } from './dashboard-state';
import { MachineService } from './machine';
import { SensorService } from './sensor';
import { AlertService } from './alert';
import { Machine, MachineConfig } from '../models/machine.model';

// ─── Test data ───────────────────────────────────────────────────────────────

const mockMachine: Machine = {
  id: 1, name: 'Turbine A', type: 'Turbine', location: 'Hall B', status: 'online',
};

const mockMachine2: Machine = {
  id: 2, name: 'Compressor X', type: 'Compressor', location: 'Hall C', status: 'online',
};

const mockConfig: MachineConfig = {
  id: 1, machineId: 1, minTemperature: 20, maxTemperature: 90, maxPressure: 10, maxRpm: 3000,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DashboardStateService', () => {

  let service: DashboardStateService;
  let machineServiceMock: { searchMachines: ReturnType<typeof vi.fn>; getConfigForMachine: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Create mock functions that return Observables (like the real service would)
    machineServiceMock = {
      searchMachines:      vi.fn().mockReturnValue(of([])),
      getConfigForMachine: vi.fn().mockReturnValue(of([mockConfig])),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStateService,
        // Replace MachineService with our mock — no real HTTP calls
        { provide: MachineService, useValue: machineServiceMock },
        // SensorService has a WebSocket in its constructor — provide an empty stub
        { provide: SensorService, useValue: {} },
        // AlertService not used in current DashboardStateService logic — empty stub
        { provide: AlertService, useValue: {} },
      ],
    });

    service = TestBed.inject(DashboardStateService);

    // Use fake timers so we control debounceTime(300) in tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── selectedMachine$ ───────────────────────────────────────────────────────

  describe('selectedMachine$ (BehaviorSubject)', () => {

    it('starts as null — no machine selected on initialisation', () => {
      let current: Machine | null = mockMachine; // set to non-null to prove it changes
      service.selectedMachine$.subscribe(m => current = m);
      expect(current).toBeNull();
    });

    it('selectMachine() updates selectedMachine$', () => {
      let current: Machine | null = null;
      service.selectedMachine$.subscribe(m => current = m);

      service.selectMachine(mockMachine);

      expect(current).toEqual(mockMachine);
    });

    it('selecting a different machine replaces the previous selection', () => {
      const history: (Machine | null)[] = [];
      service.selectedMachine$.subscribe(m => history.push(m));

      service.selectMachine(mockMachine);
      service.selectMachine(mockMachine2);

      // null (initial), mockMachine, mockMachine2
      expect(history).toHaveLength(3);
      expect(history[2]).toEqual(mockMachine2);
    });
  });

  // ─── currentConfig$ — auto-loaded on selection ──────────────────────────────

  describe('currentConfig$ (auto-loaded via switchMap)', () => {

    it('starts as null before any machine is selected', () => {
      let config: MachineConfig | null = mockConfig; // non-null to verify it changes
      service.currentConfig$.subscribe(c => config = c);
      expect(config).toBeNull();
    });

    it('loads config from MachineService when a machine is selected', () => {
      let config: MachineConfig | null = null;
      service.currentConfig$.subscribe(c => config = c);

      service.selectMachine(mockMachine);

      // wireConfigToSelection() calls getConfigForMachine with the machine's id
      expect(machineServiceMock.getConfigForMachine).toHaveBeenCalledWith(mockMachine.id);
      expect(config).toEqual(mockConfig);
    });

    it('updateConfig() replaces currentConfig$ directly (no HTTP)', () => {
      const updatedConfig: MachineConfig = { ...mockConfig, maxTemperature: 100 };
      let config: MachineConfig | null = null;
      service.currentConfig$.subscribe(c => config = c);

      service.updateConfig(updatedConfig);

      expect(config).toEqual(updatedConfig);
    });

    it('switches to new machine config when a different machine is selected (switchMap)', () => {
      const config2: MachineConfig = { ...mockConfig, id: 2, machineId: 2, maxRpm: 2500 };

      // First machine's config call returns mockConfig
      // Second machine's config call returns config2
      machineServiceMock.getConfigForMachine
        .mockReturnValueOnce(of([mockConfig]))
        .mockReturnValueOnce(of([config2]));

      let config: MachineConfig | null = null;
      service.currentConfig$.subscribe(c => config = c);

      service.selectMachine(mockMachine);
      expect(config).toEqual(mockConfig);

      service.selectMachine(mockMachine2);
      expect(config).toEqual(config2);

      // getConfigForMachine called once per machine selection
      expect(machineServiceMock.getConfigForMachine).toHaveBeenCalledTimes(2);
    });
  });

  // ─── searchResults$ — debounce + switchMap ───────────────────────────────────

  describe('searchResults$ (debounceTime + switchMap)', () => {

    it('does NOT call searchMachines before 300ms debounce window', () => {
      service.searchResults$.subscribe();

      service.updateSearchTerm('turb');
      vi.advanceTimersByTime(299); // just under the debounce threshold

      expect(machineServiceMock.searchMachines).not.toHaveBeenCalled();
    });

    it('calls searchMachines after 300ms debounce window', () => {
      service.searchResults$.subscribe();

      service.updateSearchTerm('turb');
      vi.advanceTimersByTime(300); // exactly at debounce threshold

      expect(machineServiceMock.searchMachines).toHaveBeenCalledWith('turb');
    });

    it('skips the HTTP call for terms shorter than 2 characters', () => {
      service.searchResults$.subscribe();

      service.updateSearchTerm('t');
      vi.advanceTimersByTime(300);

      // Single-char term should not trigger a search
      expect(machineServiceMock.searchMachines).not.toHaveBeenCalled();
    });

    it('does NOT re-search if the same term is submitted twice (distinctUntilChanged)', () => {
      service.searchResults$.subscribe();

      service.updateSearchTerm('turb');
      vi.advanceTimersByTime(300);
      service.updateSearchTerm('turb'); // same term again
      vi.advanceTimersByTime(300);

      // Despite two updates, only one HTTP call should be made
      expect(machineServiceMock.searchMachines).toHaveBeenCalledTimes(1);
    });

    it('emits search results when server responds', () => {
      machineServiceMock.searchMachines.mockReturnValue(of([mockMachine]));

      let results: Machine[] | undefined;
      service.searchResults$.subscribe(r => results = r);

      service.updateSearchTerm('turb');
      vi.advanceTimersByTime(300);

      expect(results).toHaveLength(1);
      expect(results![0].name).toBe('Turbine A');
    });

    it('emits empty array for short terms (no HTTP call)', () => {
      let results: Machine[] | undefined;
      service.searchResults$.subscribe(r => results = r);

      service.updateSearchTerm('t');
      vi.advanceTimersByTime(300);

      expect(results).toEqual([]);
    });
  });
});
