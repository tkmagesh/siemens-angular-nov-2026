/**
 * UNIT TESTS — AlertService
 *
 * CONCEPTS UNDER TEST:
 *
 * 1. BehaviorSubject as shared state holder:
 *    - alerts$ starts with an initial value (empty array) on construction.
 *    - Late subscribers IMMEDIATELY receive the current value (unlike plain Subject).
 *    - Only AlertService can push new values (private source, public observable).
 *
 * 2. Derived observables (computed from alerts$):
 *    - activeAlerts$ filters the array to unacknowledged alerts only.
 *    - activeAlertCount$ maps to the array length.
 *    Both update automatically whenever alerts$ emits.
 *
 * 3. HTTP integration (tested with HttpTestingController):
 *    - loadAlerts()       → GET /alerts
 *    - handleBreach()     → POST /alerts (and updates in-memory state)
 *    - acknowledgeAlert() → PATCH /alerts/:id (and updates in-memory state + fires event)
 *
 * 4. acknowledged$ Subject as event bus:
 *    Fires once when an alert is acknowledged. Demonstrates the difference
 *    from BehaviorSubject — no initial value, only future events.
 *
 * TESTING PATTERN:
 *   For BehaviorSubject state: subscribe first, then trigger changes, then assert.
 *   For HTTP calls: call method → intercept with httpMock → flush → assert.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AlertService } from './alert';
import { Alert } from '../models/alert.model';
import { MachineConfig } from '../models/machine.model';
import { SensorReading } from '../models/sensor-reading.model';

// ─── Test data ───────────────────────────────────────────────────────────────

const mockAlert: Alert = {
  id: 1,
  machineId: 1,
  machineName: 'Turbine A',
  metric: 'temperature',
  value: 95,
  threshold: 90,
  severity: 'critical',
  message: 'Turbine A: temperature 95 °C exceeds max 90',
  timestamp: 1_000_000,
  acknowledged: false,
};

const mockReading: SensorReading = {
  machineId: 1,
  timestamp: 1_000_000,
  temperature: 95,  // breaches maxTemperature: 90
  pressure: 5,
  rpm: 2000,
};

const mockConfig: MachineConfig = {
  id: 1,
  machineId: 1,
  minTemperature: 20,
  maxTemperature: 90,
  maxPressure: 10,
  maxRpm: 3000,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AlertService', () => {

  let service: AlertService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AlertService,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    });

    service  = TestBed.inject(AlertService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Initial BehaviorSubject state ──────────────────────────────────────────

  describe('Initial state (BehaviorSubject)', () => {

    it('alerts$ starts as an empty array — BehaviorSubject always has a value', () => {
      let result: Alert[] | undefined;
      service.alerts$.subscribe(a => result = a);
      // No action needed — BehaviorSubject emits its current value on subscribe
      expect(result).toEqual([]);
    });

    it('activeAlertCount$ starts at 0', () => {
      let count: number | undefined;
      service.activeAlertCount$.subscribe(c => count = c);
      expect(count).toBe(0);
    });

    it('late subscriber to alerts$ immediately receives current value', () => {
      /**
       * This is the key BehaviorSubject advantage over plain Subject.
       * Load some alerts first, then subscribe "late" and check we get the value.
       */
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      // Subscribe AFTER the alerts were loaded
      let lateResult: Alert[] | undefined;
      service.alerts$.subscribe(a => lateResult = a);

      // BehaviorSubject delivers current value immediately to late subscriber
      expect(lateResult).toHaveLength(1);
    });
  });

  // ─── loadAlerts() ────────────────────────────────────────────────────────────

  describe('loadAlerts()', () => {

    it('fetches from GET /alerts and populates alerts$', () => {
      let result: Alert[] | undefined;
      service.alerts$.subscribe(a => result = a);

      service.loadAlerts();

      const req = httpMock.expectOne('http://localhost:3000/alerts');
      expect(req.request.method).toBe('GET');
      req.flush([mockAlert]);

      expect(result).toHaveLength(1);
      expect(result![0]).toEqual(mockAlert);
    });
  });

  // ─── Derived streams: activeAlerts$ and activeAlertCount$ ───────────────────

  describe('activeAlerts$', () => {

    it('only emits unacknowledged alerts', () => {
      const acknowledgedAlert: Alert = { ...mockAlert, id: 2, acknowledged: true };
      let activeAlerts: Alert[] | undefined;
      service.activeAlerts$.subscribe(a => activeAlerts = a);

      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert, acknowledgedAlert]);

      // Only the unacknowledged alert should appear
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts![0].id).toBe(1);
      expect(activeAlerts![0].acknowledged).toBe(false);
    });
  });

  describe('activeAlertCount$', () => {

    it('counts only unacknowledged alerts', () => {
      const acknowledgedAlert: Alert = { ...mockAlert, id: 2, acknowledged: true };
      let count: number | undefined;
      service.activeAlertCount$.subscribe(c => count = c);

      service.loadAlerts();
      // 2 total alerts but only 1 is active (unacknowledged)
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert, acknowledgedAlert]);

      expect(count).toBe(1);
    });
  });

  // ─── handleBreach() ─────────────────────────────────────────────────────────

  describe('handleBreach()', () => {

    it('POSTs to /alerts and adds the new alert to alerts$', () => {
      let alerts: Alert[] | undefined;
      service.alerts$.subscribe(a => alerts = a);

      service.handleBreach(mockReading, mockConfig, 'Turbine A');

      const req = httpMock.expectOne('http://localhost:3000/alerts');
      expect(req.request.method).toBe('POST');

      // Server responds with the saved alert (now has an id assigned)
      req.flush({ ...req.request.body, id: 99 });

      expect(alerts).toHaveLength(1);
      expect(alerts![0].id).toBe(99);
      expect(alerts![0].machineId).toBe(1);
      expect(alerts![0].metric).toBe('temperature');
      expect(alerts![0].acknowledged).toBe(false);
    });

    it('prepends new alert so the newest appears first in the list', () => {
      // Start with one existing alert
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      // Trigger a new breach
      service.handleBreach(mockReading, mockConfig, 'Turbine A');
      const postReq = httpMock.expectOne(r => r.method === 'POST');
      postReq.flush({ ...postReq.request.body, id: 99 });

      let alerts: Alert[] | undefined;
      service.alerts$.subscribe(a => alerts = a);

      // Newest (id 99) should be first
      expect(alerts![0].id).toBe(99);
      expect(alerts![1].id).toBe(1);
    });

    it('builds an alert for temperature breach correctly', () => {
      service.handleBreach(mockReading, mockConfig, 'Turbine A');

      const req = httpMock.expectOne('http://localhost:3000/alerts');
      const body = req.request.body as Alert;

      // Temperature 95 > maxTemperature 90 → critical severity
      expect(body.metric).toBe('temperature');
      expect(body.severity).toBe('critical');
      expect(body.value).toBe(95);
      expect(body.threshold).toBe(90);
      expect(body.machineName).toBe('Turbine A');

      req.flush({ ...body, id: 1 });
    });
  });

  // ─── acknowledgeAlert() ─────────────────────────────────────────────────────

  describe('acknowledgeAlert()', () => {

    it('sends PATCH to /alerts/:id with { acknowledged: true }', () => {
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      service.acknowledgeAlert(1);

      const patchReq = httpMock.expectOne('http://localhost:3000/alerts/1');
      expect(patchReq.request.method).toBe('PATCH');
      expect(patchReq.request.body).toEqual({ acknowledged: true });

      patchReq.flush({ ...mockAlert, acknowledged: true });
    });

    it('marks the alert as acknowledged in the in-memory list', () => {
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      service.acknowledgeAlert(1);
      httpMock.expectOne('http://localhost:3000/alerts/1').flush({ ...mockAlert, acknowledged: true });

      let alerts: Alert[] | undefined;
      service.alerts$.subscribe(a => alerts = a);

      expect(alerts![0].acknowledged).toBe(true);
    });

    it('fires acknowledged$ Subject after a successful PATCH', () => {
      /**
       * acknowledged$ is a plain Subject — it fires once per event.
       * No initial value, no replay. Subscribe first, then trigger the action.
       */
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      let ackedAlert: Alert | undefined;
      service.acknowledged$.subscribe(a => ackedAlert = a);  // subscribe before action

      service.acknowledgeAlert(1);
      httpMock.expectOne('http://localhost:3000/alerts/1').flush({ ...mockAlert, acknowledged: true });

      expect(ackedAlert).toBeDefined();
      expect(ackedAlert?.id).toBe(1);
      expect(ackedAlert?.acknowledged).toBe(true);
    });

    it('does NOT fire acknowledged$ if alert id is not found', () => {
      service.loadAlerts();
      httpMock.expectOne('http://localhost:3000/alerts').flush([mockAlert]);

      let fired = false;
      service.acknowledged$.subscribe(() => fired = true);

      // Acknowledge a non-existent id
      service.acknowledgeAlert(999);
      httpMock.expectOne('http://localhost:3000/alerts/999').flush({ ...mockAlert, id: 999, acknowledged: true });

      // The alert with id 999 isn't in our list, so acknowledged$ should not fire
      expect(fired).toBe(false);
    });
  });
});
