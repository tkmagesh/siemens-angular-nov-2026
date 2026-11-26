/**
 * UNIT TESTS — SensorService
 *
 * CONCEPTS UNDER TEST:
 *
 * 1. Mocking a WebSocket connection:
 *    SensorService opens a WebSocket in its constructor via webSocket() from
 *    'rxjs/webSocket'. We MOCK that import so tests run without a real server.
 *    The mock returns a plain Subject that we control from outside the service.
 *
 * 2. filter() — per-machine stream isolation:
 *    The WebSocket delivers readings for ALL machines at once.
 *    getReadingsForMachine(id) uses filter() to isolate one machine's stream.
 *
 * 3. throttleTime() — rate limiting:
 *    Ensures the UI receives at most one update per second.
 *    We test this by advancing fake timers.
 *
 * 4. scan() — stateful accumulation:
 *    getSummaryForMachine() uses scan() to build a rolling avg/min/max.
 *    We push multiple readings over time and verify the accumulation.
 *
 * 5. withLatestFrom() + filter() — breach detection:
 *    getBreachesForMachine() attaches the current config to each reading,
 *    then filters to only emit when a threshold is crossed.
 *
 * 6. ReplaySubject(50) — late subscriber buffering:
 *    getReadingHistoryForMachine() uses readingBuffer$ which replays the
 *    last 50 readings. A subscriber that connects late still gets them.
 *
 * FAKE TIMERS:
 *   throttleTime(1000) uses setTimeout internally.
 *   vi.useFakeTimers() freezes time; vi.advanceTimersByTime(ms) advances it.
 *   This lets us test time-based operators without real waiting.
 *
 * MOCKING rxjs/webSocket:
 *   vi.mock() is HOISTED by Vitest — it runs before any imports.
 *   This means when SensorService imports webSocket, it gets our mock.
 *   We set mockReturnValue in beforeEach to give each test a fresh Subject.
 */

// vi.mock is hoisted before all imports by Vitest.
// This ensures that when SensorService is imported and instantiated,
// webSocket() is already replaced with our mock function.
vi.mock('rxjs/webSocket', () => ({
  webSocket: vi.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { SensorService } from './sensor';
import { SensorReading, SensorSummary } from '../models/sensor-reading.model';
import { MachineConfig } from '../models/machine.model';

// ─── Test data ───────────────────────────────────────────────────────────────

const mockConfig: MachineConfig = {
  id: 1, machineId: 1, minTemperature: 20, maxTemperature: 90, maxPressure: 10, maxRpm: 3000,
};

/**
 * Helper: build a SensorReading with sensible defaults.
 * Override only the fields relevant to each test.
 */
function reading(machineId: number, overrides: Partial<SensorReading> = {}): SensorReading {
  return {
    machineId,
    timestamp: Date.now(),
    temperature: 70,
    pressure: 5,
    rpm: 2000,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SensorService', () => {

  let service: SensorService;
  let mockSocket$: Subject<SensorReading[]>;

  beforeEach(() => {
    // Fresh Subject per test — simulates a new WebSocket connection
    mockSocket$ = new Subject<SensorReading[]>();

    // Tell the mock webSocket() function to return our Subject
    vi.mocked(webSocket).mockReturnValue(mockSocket$ as any);

    // Freeze time so throttleTime / debounce timers don't fire unexpectedly
    vi.useFakeTimers();

    // Each TestBed.configureTestingModule creates a fresh Angular injector,
    // so each test gets a brand-new SensorService instance (and a new Subject).
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensorService);
  });

  afterEach(() => {
    service.destroy(); // signal takeUntil(destroy$) to clean up subscriptions
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getReadingsForMachine() ─────────────────────────────────────────────────

  describe('getReadingsForMachine(id)', () => {

    it('filters: only emits readings for the requested machine id', () => {
      const results: SensorReading[] = [];
      service.getReadingsForMachine(1).subscribe(r => results.push(r));

      // Push one reading for machine 1 and one for machine 2 in the same batch
      mockSocket$.next([reading(1, { temperature: 75 }), reading(2, { temperature: 60 })]);

      // Only machine 1's reading should come through
      expect(results).toHaveLength(1);
      expect(results[0].machineId).toBe(1);
      expect(results[0].temperature).toBe(75);
    });

    it('throttleTime: only the FIRST of rapid successive emissions gets through', () => {
      const results: SensorReading[] = [];
      service.getReadingsForMachine(1).subscribe(r => results.push(r));

      // Push three readings without advancing the timer
      mockSocket$.next([reading(1, { temperature: 70 })]);
      mockSocket$.next([reading(1, { temperature: 75 })]);
      mockSocket$.next([reading(1, { temperature: 80 })]);

      // throttleTime(1000) only lets the FIRST through; the rest are dropped
      expect(results).toHaveLength(1);
      expect(results[0].temperature).toBe(70);
    });

    it('throttleTime: after 1001ms a new emission gets through', () => {
      const results: SensorReading[] = [];
      service.getReadingsForMachine(1).subscribe(r => results.push(r));

      mockSocket$.next([reading(1, { temperature: 70 })]);  // passes through
      vi.advanceTimersByTime(1001);                          // throttle window resets
      mockSocket$.next([reading(1, { temperature: 85 })]);  // passes through again

      expect(results).toHaveLength(2);
      expect(results[1].temperature).toBe(85);
    });
  });

  // ─── getSummaryForMachine() — scan() ─────────────────────────────────────────

  describe('getSummaryForMachine(id)', () => {

    it('after one reading: summary reflects that single reading', () => {
      const summaries: SensorSummary[] = [];
      service.getSummaryForMachine(1).subscribe(s => summaries.push(s));

      mockSocket$.next([reading(1, { temperature: 70, pressure: 5, rpm: 2000 })]);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].avgTemperature).toBe(70);
      expect(summaries[0].minTemperature).toBe(70);
      expect(summaries[0].maxTemperature).toBe(70);
      expect(summaries[0].sampleCount).toBe(1);
    });

    it('scan() accumulates: avg/min/max are correct after multiple readings', () => {
      /**
       * We push 3 readings separated by 1001ms (past the throttle window).
       * scan() accumulates them into a rolling window and recomputes stats.
       *
       *   Reading 1: temp=70  → avg=70, min=70, max=70
       *   Reading 2: temp=90  → avg=80, min=70, max=90
       *   Reading 3: temp=80  → avg=80, min=70, max=90
       */
      const summaries: SensorSummary[] = [];
      service.getSummaryForMachine(1).subscribe(s => summaries.push(s));

      mockSocket$.next([reading(1, { temperature: 70 })]);
      vi.advanceTimersByTime(1001);
      mockSocket$.next([reading(1, { temperature: 90 })]);
      vi.advanceTimersByTime(1001);
      mockSocket$.next([reading(1, { temperature: 80 })]);

      expect(summaries).toHaveLength(3);

      const last = summaries[2];
      expect(last.avgTemperature).toBe(80);   // (70 + 90 + 80) / 3 = 80
      expect(last.minTemperature).toBe(70);
      expect(last.maxTemperature).toBe(90);
      expect(last.sampleCount).toBe(3);
    });

    it('sliding window: older readings drop off after windowSize is exceeded', () => {
      const summaries: SensorSummary[] = [];
      // Window of 2: only the last 2 readings contribute to stats
      service.getSummaryForMachine(1, 2).subscribe(s => summaries.push(s));

      mockSocket$.next([reading(1, { temperature: 70 })]);
      vi.advanceTimersByTime(1001);
      mockSocket$.next([reading(1, { temperature: 90 })]);
      vi.advanceTimersByTime(1001);
      // Push a third reading — now window=2, so temp=70 is dropped
      mockSocket$.next([reading(1, { temperature: 80 })]);

      const last = summaries[summaries.length - 1];
      // Window of 2: readings are [90, 80] → avg=85, min=80, max=90
      expect(last.sampleCount).toBe(2);
      expect(last.avgTemperature).toBe(85);
      expect(last.minTemperature).toBe(80);
      expect(last.maxTemperature).toBe(90);
    });
  });

  // ─── getBreachesForMachine() — withLatestFrom + filter ───────────────────────

  describe('getBreachesForMachine(id, config$)', () => {

    it('does NOT emit when all readings are within thresholds', () => {
      const breaches: any[] = [];
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // All values within limits: temp=85 < 90, pressure=5 < 10, rpm=2000 < 3000
      mockSocket$.next([reading(1, { temperature: 85, pressure: 5, rpm: 2000 })]);

      expect(breaches).toHaveLength(0);
    });

    it('emits when temperature exceeds maxTemperature', () => {
      const breaches: any[] = [];
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // temp=95 > maxTemperature=90 → breach
      mockSocket$.next([reading(1, { temperature: 95 })]);

      expect(breaches).toHaveLength(1);
      expect(breaches[0].reading.temperature).toBe(95);
      expect(breaches[0].config.maxTemperature).toBe(90);
    });

    it('emits when temperature drops below minTemperature', () => {
      const breaches: any[] = [];
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // temp=10 < minTemperature=20 → breach
      mockSocket$.next([reading(1, { temperature: 10 })]);

      expect(breaches).toHaveLength(1);
      expect(breaches[0].reading.temperature).toBe(10);
    });

    it('emits when pressure exceeds maxPressure', () => {
      const breaches: any[] = [];
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // pressure=11 > maxPressure=10 → breach
      mockSocket$.next([reading(1, { pressure: 11 })]);

      expect(breaches).toHaveLength(1);
      expect(breaches[0].reading.pressure).toBe(11);
      expect(breaches[0].config.maxPressure).toBe(10);
    });

    it('emits when RPM exceeds maxRpm', () => {
      const breaches: any[] = [];
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // rpm=3500 > maxRpm=3000 → breach
      mockSocket$.next([reading(1, { rpm: 3500 })]);

      expect(breaches).toHaveLength(1);
      expect(breaches[0].reading.rpm).toBe(3500);
      expect(breaches[0].config.maxRpm).toBe(3000);
    });

    it('does NOT emit for a different machine id', () => {
      const breaches: any[] = [];
      // Watching breaches for machine 1
      service.getBreachesForMachine(1, of(mockConfig)).subscribe(b => breaches.push(b));

      // Push a breaching reading for machine 2 — should not appear
      mockSocket$.next([reading(2, { temperature: 999 })]);

      expect(breaches).toHaveLength(0);
    });
  });

  // ─── getReadingHistoryForMachine() — ReplaySubject ───────────────────────────

  describe('getReadingHistoryForMachine(id) — ReplaySubject(50)', () => {

    it('late subscriber still receives readings that arrived before it subscribed', () => {
      /**
       * This is the ReplaySubject(50) guarantee:
       * Any subscriber — even one that connects much later — receives the last
       * 50 readings that passed through readingBuffer$.
       *
       * A plain Subject would give the late subscriber nothing.
       * BehaviorSubject would give only the single latest value.
       * ReplaySubject(50) gives up to 50 past values.
       */

      // Push readings BEFORE subscribing
      mockSocket$.next([reading(1, { temperature: 70 })]);
      vi.advanceTimersByTime(1001);
      mockSocket$.next([reading(1, { temperature: 80 })]);
      vi.advanceTimersByTime(1001);
      mockSocket$.next([reading(1, { temperature: 90 })]);

      // Subscribe LATE — after all readings were already emitted
      const lateResults: SensorReading[] = [];
      service.getReadingHistoryForMachine(1).subscribe(r => lateResults.push(r));

      // ReplaySubject(50) replays the buffered readings immediately
      expect(lateResults.length).toBeGreaterThanOrEqual(3);
      // The readings arrived in order
      expect(lateResults[0].temperature).toBe(70);
      expect(lateResults[1].temperature).toBe(80);
      expect(lateResults[2].temperature).toBe(90);
    });

    it('filters: only replays readings for the requested machine', () => {
      // Push readings for both machines
      mockSocket$.next([reading(1, { temperature: 70 }), reading(2, { temperature: 60 })]);

      const lateResults: SensorReading[] = [];
      service.getReadingHistoryForMachine(1).subscribe(r => lateResults.push(r));

      // Should only have machine 1's reading
      expect(lateResults.every(r => r.machineId === 1)).toBe(true);
    });
  });
});
