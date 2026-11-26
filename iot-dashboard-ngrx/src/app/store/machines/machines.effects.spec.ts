/**
 * TESTS - machines.effects.spec.ts
 *
 * NgRx teaching point: EFFECT TESTS use `provideMockActions`.
 *
 * What is provideMockActions?
 *   Effects listen to `this.actions$` which is an Observable<Action>.
 *   In tests, we provide a simple Observable (of(action)) as that stream.
 *   We push test actions in, subscribe to the effect, flush HTTP, assert result.
 *
 * VS BehaviorSubject service tests:
 *   Before: Testing DashboardStateService.searchResults$ required subscribing
 *           to Observables and asserting async emissions.
 *   Now:    For the EFFECT test: push action → HTTP flush → assert result action.
 *           Each layer is independently verifiable.
 *
 * Key tools:
 *   provideMockActions(() => actions$)   — inject mock Actions stream
 *   provideHttpClientTesting             — intercept HTTP without network
 *   HttpTestingController                — verify and flush HTTP requests
 *   firstValueFrom                       — await the first action emitted
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MachinesEffects } from './machines.effects';
import { MachinesActions } from './machines.actions';
import { Machine, MachineConfig } from '../../models/machine.model';

const mockMachines: Machine[] = [
  { id: 1, name: 'Turbine A', type: 'Turbine', location: 'Hall B', status: 'online' },
];

const mockConfig: MachineConfig = {
  id: 10, machineId: 1, minTemperature: 20, maxTemperature: 90, maxPressure: 10, maxRpm: 3000,
};

describe('MachinesEffects', () => {
  let effects: MachinesEffects;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let actions$: any;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MachinesEffects,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockActions(() => actions$),
      ],
    });
    effects = TestBed.inject(MachinesEffects);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  // ── loadMachines$ ──────────────────────────────────────────────────────────

  it('dispatches loadMachinesSuccess on HTTP 200', async () => {
    actions$ = of(MachinesActions.loadMachines());
    const result = firstValueFrom(effects.loadMachines$);
    httpController.expectOne('http://localhost:3000/machines').flush(mockMachines);
    expect(await result).toEqual(MachinesActions.loadMachinesSuccess({ machines: mockMachines }));
  });

  it('dispatches loadMachinesFailure on HTTP error', async () => {
    actions$ = of(MachinesActions.loadMachines());
    const result = firstValueFrom(effects.loadMachines$);
    httpController.expectOne('http://localhost:3000/machines').flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    const action = await result;
    expect((action as any).type).toBe(MachinesActions.loadMachinesFailure.type);
  });

  // ── loadConfig$ ───────────────────────────────────────────────────────────

  it('dispatches loadConfigSuccess when machine is selected', async () => {
    actions$ = of(MachinesActions.selectMachine({ machine: mockMachines[0] }));
    const result = firstValueFrom(effects.loadConfig$);
    const req = httpController.expectOne(r => r.url.includes('/configs'));
    expect(req.request.params.get('machineId')).toBe('1');
    req.flush([mockConfig]);
    expect(await result).toEqual(MachinesActions.loadConfigSuccess({ config: mockConfig }));
  });

  // ── saveConfig$ ───────────────────────────────────────────────────────────

  it('dispatches saveConfigSuccess on successful PUT', async () => {
    actions$ = of(MachinesActions.saveConfig({ config: mockConfig }));
    const result = firstValueFrom(effects.saveConfig$);
    httpController.expectOne(`http://localhost:3000/configs/${mockConfig.id}`).flush(mockConfig);
    expect(await result).toEqual(MachinesActions.saveConfigSuccess({ config: mockConfig }));
  });

  it('dispatches saveConfigFailure on HTTP error', async () => {
    actions$ = of(MachinesActions.saveConfig({ config: mockConfig }));
    const result = firstValueFrom(effects.saveConfig$);
    httpController.expectOne(`http://localhost:3000/configs/${mockConfig.id}`)
      .flush('Not found', { status: 404, statusText: 'Not Found' });
    const action = await result;
    expect((action as any).type).toBe(MachinesActions.saveConfigFailure.type);
  });
});
