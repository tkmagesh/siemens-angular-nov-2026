/**
 * UNIT TESTS — MachineService
 *
 * CONCEPT UNDER TEST: Testing Angular HTTP services without a real server.
 *
 * TOOL: HttpTestingController
 *   Angular provides a special testing module that intercepts outgoing HTTP
 *   requests BEFORE they reach the network. Instead of a real server, we:
 *     1. Call the service method (which makes an HTTP request internally).
 *     2. Ask HttpTestingController "did you receive a request to /machines?"
 *     3. Manually flush a response (simulating the server's reply).
 *     4. Assert that the service returned the expected data.
 *
 * WHY THIS APPROACH?
 *   - Tests run in milliseconds (no real network delay).
 *   - Tests don't depend on json-server being up.
 *   - You can simulate error responses, slow responses, etc.
 *
 * TESTING PATTERN — Arrange / Act / Assert + httpMock.verify():
 *   Always call httpMock.verify() in afterEach to confirm that every
 *   expected request was actually made and no unexpected requests leaked.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MachineService } from './machine';
import { Machine, MachineConfig } from '../models/machine.model';

// ─── Test data ───────────────────────────────────────────────────────────────

const mockMachines: Machine[] = [
  { id: 1, name: 'Turbine A',   type: 'Turbine',    location: 'Hall B - Slot 1', status: 'online' },
  { id: 2, name: 'Compressor X', type: 'Compressor', location: 'Hall B - Slot 2', status: 'offline' },
];

const mockConfig: MachineConfig = {
  id: 1, machineId: 1, minTemperature: 20, maxTemperature: 90, maxPressure: 10, maxRpm: 3000,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MachineService', () => {

  let service: MachineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MachineService,
        // provideHttpClient: registers Angular's HttpClient for use in services
        provideHttpClient(withFetch()),
        // provideHttpClientTesting: replaces the real HTTP backend with a test double
        provideHttpClientTesting(),
      ],
    });

    service  = TestBed.inject(MachineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    /**
     * verify() fails the test if any HTTP request was made but not flushed,
     * or if an unexpected request was sent.
     * This prevents silent bugs where a service makes extra or missing requests.
     */
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getAllMachines() ────────────────────────────────────────────────────────

  describe('getAllMachines()', () => {

    it('sends GET to /machines and returns the response as Machine[]', () => {
      let result: Machine[] | undefined;

      // ACT: call the service (this triggers an HTTP request internally)
      service.getAllMachines().subscribe(machines => result = machines);

      // ARRANGE: intercept the request and reply with mock data
      const req = httpMock.expectOne('http://localhost:3000/machines');
      expect(req.request.method).toBe('GET');
      req.flush(mockMachines); // simulate server replying with this data

      // ASSERT: service returned the data from the (simulated) server
      expect(result).toEqual(mockMachines);
      expect(result).toHaveLength(2);
    });
  });

  // ─── searchMachines() ───────────────────────────────────────────────────────

  describe('searchMachines()', () => {

    it('sends GET to /machines with name_like query param', () => {
      let result: Machine[] | undefined;

      service.searchMachines('turb').subscribe(m => result = m);

      // Use a predicate matcher to inspect the URL and query params separately
      const req = httpMock.expectOne(r =>
        r.url === 'http://localhost:3000/machines' &&
        r.params.get('name_like') === 'turb'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockMachines[0]]);

      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('Turbine A');
    });
  });

  // ─── getMachineById() ───────────────────────────────────────────────────────

  describe('getMachineById()', () => {

    it('sends GET to /machines/:id and returns a single Machine', () => {
      let result: Machine | undefined;

      service.getMachineById(1).subscribe(m => result = m);

      const req = httpMock.expectOne('http://localhost:3000/machines/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockMachines[0]);

      expect(result).toEqual(mockMachines[0]);
    });
  });

  // ─── getConfigForMachine() ──────────────────────────────────────────────────

  describe('getConfigForMachine()', () => {

    it('sends GET to /configs with machineId query param', () => {
      let result: MachineConfig[] | undefined;

      service.getConfigForMachine(1).subscribe(c => result = c);

      const req = httpMock.expectOne(r =>
        r.url === 'http://localhost:3000/configs' &&
        r.params.get('machineId') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockConfig]);

      // json-server returns an array when filtering — service returns it as-is
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual(mockConfig);
    });
  });

  // ─── saveConfig() ───────────────────────────────────────────────────────────

  describe('saveConfig()', () => {

    it('sends PUT to /configs/:id with the full config as body', () => {
      let result: MachineConfig | undefined;

      service.saveConfig(mockConfig).subscribe(c => result = c);

      const req = httpMock.expectOne('http://localhost:3000/configs/1');
      expect(req.request.method).toBe('PUT');
      // The entire config object must be sent in the request body
      expect(req.request.body).toEqual(mockConfig);
      req.flush(mockConfig);

      expect(result).toEqual(mockConfig);
    });
  });
});
