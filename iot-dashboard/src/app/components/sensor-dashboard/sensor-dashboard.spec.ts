/**
 * COMPONENT TEST - SensorDashboardComponent
 *
 * WHAT IS TESTED:
 *   The SensorDashboardComponent is responsible only for:
 *   - Showing a "no selection" placeholder when no machine is chosen
 *   - Displaying live readings and summary from the sensor streams
 *   - Switching between "live" and "summary" tabs (pure UI state)
 *   - Triggering SensorService stream switches via switchMap when machine changes
 *
 * KEY ANGULAR CONCEPTS:
 *   - Testing components that use *ngIf for conditional rendering
 *   - Testing that switchMap is used (service called per machine selection)
 *   - Testing pure UI state changes (tab switching)
 *   - async pipe — changes reflected after fixture.detectChanges()
 *
 * MOCKING STRATEGY:
 *   SensorService is replaced with a simple object whose methods return
 *   synchronous `of()` Observables. This avoids any WebSocket connection.
 *   DashboardStateService is a BehaviorSubject — we push values to simulate
 *   the user selecting a machine.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';

import { SensorDashboardComponent } from './sensor-dashboard';
import { SensorService } from '../../services/sensor';
import { DashboardStateService } from '../../services/dashboard-state';
import { Machine } from '../../models/machine.model';
import { SensorReading, SensorSummary } from '../../models/sensor-reading.model';

// ─── Shared test data ─────────────────────────────────────────────────────────

const mockMachine: Machine = {
  id: 1, name: 'Turbine A', type: 'Turbine', location: 'Hall B', status: 'online',
};

const mockReading: SensorReading = {
  machineId: 1, timestamp: Date.now(), temperature: 75, pressure: 6, rpm: 2200,
};

const mockSummary: SensorSummary = {
  machineId: 1, avgTemperature: 75, minTemperature: 70,
  maxTemperature: 80, avgPressure: 6, avgRpm: 2200, sampleCount: 5,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SensorDashboardComponent', () => {
  let fixture: ComponentFixture<SensorDashboardComponent>;
  let component: SensorDashboardComponent;
  let selectedMachine$: BehaviorSubject<Machine | null>;

  let sensorServiceMock: {
    getReadingsForMachine: ReturnType<typeof vi.fn>;
    getSummaryForMachine: ReturnType<typeof vi.fn>;
  };
  let dashboardStateMock: { selectedMachine$: BehaviorSubject<Machine | null> };

  beforeEach(async () => {
    selectedMachine$ = new BehaviorSubject<Machine | null>(null);

    sensorServiceMock = {
      getReadingsForMachine: vi.fn().mockReturnValue(of(mockReading)),
      getSummaryForMachine:  vi.fn().mockReturnValue(of(mockSummary)),
    };

    dashboardStateMock = { selectedMachine$ };

    await TestBed.configureTestingModule({
      imports: [SensorDashboardComponent],
      providers: [
        { provide: SensorService,        useValue: sensorServiceMock },
        { provide: DashboardStateService, useValue: dashboardStateMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(SensorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── No Selection State ───────────────────────────────────────────────────────

  it('shows "select a machine" placeholder when no machine is selected', () => {
    // selectedMachine$ starts as null — noSelection should be true
    expect(component.noSelection).toBe(true);
    const placeholder = fixture.nativeElement.querySelector('.no-selection');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toContain('Select a machine');
  });

  it('hides the sensor dashboard content when noSelection is true', () => {
    expect(fixture.nativeElement.querySelector('.sensor-dashboard h2')).toBeNull();
  });

  // ─── Machine Selected State ────────────────────────────────────────────────

  it('hides placeholder when a machine is selected', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.noSelection).toBe(false);
    expect(fixture.nativeElement.querySelector('.no-selection')).toBeNull();
  });

  it('shows the dashboard heading with the machine name after selection', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toContain('Turbine A');
  });

  it('calls SensorService.getReadingsForMachine() with the selected machine id', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    // switchMap in ngOnInit wires selectedMachine$ → getReadingsForMachine(id)
    expect(sensorServiceMock.getReadingsForMachine).toHaveBeenCalledWith(mockMachine.id);
  });

  it('calls SensorService.getSummaryForMachine() with the selected machine id', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sensorServiceMock.getSummaryForMachine).toHaveBeenCalledWith(mockMachine.id, 20);
  });

  // ─── Tab Switching (Pure UI State) ────────────────────────────────────────

  it('starts on the "live" tab', () => {
    expect(component.activeTab).toBe('live');
  });

  it('setTab("summary") changes activeTab to "summary"', () => {
    component.setTab('summary');
    expect(component.activeTab).toBe('summary');
  });

  it('setTab("live") changes activeTab back to "live"', () => {
    component.setTab('summary');
    component.setTab('live');
    expect(component.activeTab).toBe('live');
  });

  it('summary panel is visible when activeTab is "summary"', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    component.setTab('summary');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.summary-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.readings-panel')).toBeNull();
  });

  it('readings panel is visible when activeTab is "live"', async () => {
    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    // Default tab is 'live'
    expect(fixture.nativeElement.querySelector('.readings-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.summary-panel')).toBeNull();
  });

  // ─── switchMap: machine change switches sensor stream ─────────────────────

  it('calls SensorService again when the selected machine changes (switchMap)', async () => {
    const machine2: Machine = { id: 2, name: 'Compressor X', type: 'Compressor', location: 'Hall C', status: 'online' };

    selectedMachine$.next(mockMachine);
    fixture.detectChanges();
    await fixture.whenStable();

    selectedMachine$.next(machine2);
    fixture.detectChanges();
    await fixture.whenStable();

    // getReadingsForMachine should have been called for BOTH machines
    expect(sensorServiceMock.getReadingsForMachine).toHaveBeenCalledWith(1);
    expect(sensorServiceMock.getReadingsForMachine).toHaveBeenCalledWith(2);
  });

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  it('completes destroy$ Subject in ngOnDestroy to unsubscribe all streams', () => {
    const nextSpy = vi.spyOn((component as any).destroy$, 'next');
    const completeSpy = vi.spyOn((component as any).destroy$, 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
