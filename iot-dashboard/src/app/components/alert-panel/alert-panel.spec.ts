/**
 * COMPONENT TEST - AlertPanelComponent
 *
 * WHAT IS TESTED:
 *   The AlertPanelComponent is responsible only for:
 *   - Rendering active alerts from AlertService.activeAlerts$
 *   - Showing an alert count badge
 *   - Calling AlertService.acknowledgeAlert() when user clicks "Ack"
 *   - Toggling isExpanded (show/hide the list) — pure UI state
 *
 * KEY ANGULAR CONCEPTS:
 *   - Testing components driven by BehaviorSubject (async pipe)
 *   - Pushing new values to a BehaviorSubject to simulate state changes
 *   - Testing DOM updates after detectChanges()
 *   - Testing that components delegate (not implement) business logic
 *
 * MOCKING STRATEGY:
 *   AlertService is replaced with a plain object whose BehaviorSubjects
 *   we can push values into directly, and whose methods are vi.fn() spies.
 *   This isolates the component from HTTP and alert-detection logic.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BehaviorSubject, map } from 'rxjs';

import { AlertPanelComponent } from './alert-panel';
import { AlertService } from '../../services/alert';
import { Alert } from '../../models/alert.model';

// ─── Shared test data ─────────────────────────────────────────────────────────

const mockAlerts: Alert[] = [
  {
    id: 1, machineId: 1, machineName: 'Turbine A',
    metric: 'temperature', value: 95, threshold: 90,
    severity: 'critical', message: 'Too hot',
    timestamp: Date.now(), acknowledged: false,
  },
  {
    id: 2, machineId: 2, machineName: 'Compressor X',
    metric: 'pressure', value: 12, threshold: 10,
    severity: 'warning', message: 'High pressure',
    timestamp: Date.now(), acknowledged: false,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AlertPanelComponent', () => {
  let fixture: ComponentFixture<AlertPanelComponent>;
  let component: AlertPanelComponent;

  // BehaviorSubject lets us push new alert arrays in individual tests
  let activeAlerts$: BehaviorSubject<Alert[]>;

  let alertServiceMock: {
    activeAlerts$: BehaviorSubject<Alert[]>;
    activeAlertCount$: ReturnType<typeof activeAlerts$['pipe']>;
    acknowledgeAlert: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    activeAlerts$ = new BehaviorSubject<Alert[]>([]);

    alertServiceMock = {
      activeAlerts$,
      // Derive count from the same BehaviorSubject — mirrors the real service
      activeAlertCount$: activeAlerts$.pipe(map(a => a.length)) as any,
      acknowledgeAlert: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AlertPanelComponent],
      providers: [
        { provide: AlertService, useValue: alertServiceMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AlertPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Empty State ─────────────────────────────────────────────────────────────

  it('shows "No active alerts" when activeAlerts$ is empty', () => {
    // activeAlerts$ starts empty (BehaviorSubject initial value)
    const noAlerts = fixture.nativeElement.querySelector('.no-alerts');
    expect(noAlerts).toBeTruthy();
    expect(noAlerts.textContent).toContain('No active alerts');
  });

  it('renders zero alert rows when alerts list is empty', () => {
    const rows = fixture.nativeElement.querySelectorAll('.alert-row');
    expect(rows.length).toBe(0);
  });

  // ─── Populated State ──────────────────────────────────────────────────────

  it('renders one row per alert when activeAlerts$ emits', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('.alert-row');
    expect(rows.length).toBe(mockAlerts.length);
  });

  it('displays machine name and message in each alert row', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('.alert-row');
    expect(rows[0].textContent).toContain('Turbine A');
    expect(rows[0].textContent).toContain('Too hot');
    expect(rows[1].textContent).toContain('Compressor X');
  });

  it('hides "No active alerts" message when alerts are present', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.no-alerts')).toBeNull();
  });

  // ─── Badge Count ─────────────────────────────────────────────────────────────

  it('shows the correct alert count in the badge', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe(String(mockAlerts.length));
  });

  it('badge is hidden when there are no alerts', () => {
    // activeAlerts$ is empty; badge uses *ngIf="(alertCount$ | async) as count"
    // count = 0 is falsy, so badge is not rendered
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge).toBeNull();
  });

  // ─── Acknowledge Button ───────────────────────────────────────────────────

  it('calls alertService.acknowledgeAlert() with the correct alert id when Ack is clicked', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    const ackButtons = fixture.nativeElement.querySelectorAll('.ack-btn');
    ackButtons[0].click();

    // Should have been called with id of the first alert
    expect(alertServiceMock.acknowledgeAlert).toHaveBeenCalledWith(mockAlerts[0].id);
  });

  it('calls acknowledgeAlert() with the second alert id when second Ack is clicked', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    const ackButtons = fixture.nativeElement.querySelectorAll('.ack-btn');
    ackButtons[1].click();

    expect(alertServiceMock.acknowledgeAlert).toHaveBeenCalledWith(mockAlerts[1].id);
  });

  it('does NOT implement acknowledge logic itself — delegates to AlertService', () => {
    // The component should have no alert manipulation code.
    // onAcknowledge() should simply call the service.
    component.onAcknowledge(99);
    expect(alertServiceMock.acknowledgeAlert).toHaveBeenCalledWith(99);
  });

  // ─── Expand / Collapse (Pure UI State) ────────────────────────────────────

  it('starts expanded (isExpanded = true)', () => {
    expect(component.isExpanded).toBe(true);
  });

  it('toggleExpanded() sets isExpanded to false', () => {
    component.toggleExpanded();
    expect(component.isExpanded).toBe(false);
  });

  it('toggleExpanded() twice restores isExpanded to true', () => {
    component.toggleExpanded();
    component.toggleExpanded();
    expect(component.isExpanded).toBe(true);
  });

  it('alert list is hidden from DOM when isExpanded is false', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    // Collapse the panel
    component.toggleExpanded();
    fixture.detectChanges();

    // The *ngIf="isExpanded" hides the ul.alert-list
    expect(fixture.nativeElement.querySelector('.alert-list')).toBeNull();
  });

  it('alert list is visible in DOM when isExpanded is true', async () => {
    activeAlerts$.next(mockAlerts);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.alert-list')).toBeTruthy();
  });
});
