/**
 * NgRx TESTING PATTERN: Component Tests with MockStore (alert panel)
 *
 * Demonstrates:
 *   - Using overrideSelector to set activeAlerts and alertCount
 *   - Asserting dispatch() calls for acknowledge action
 *   - Testing UI-only state (isExpanded) that lives in the component
 *
 * The key simplification vs BehaviorSubject tests:
 *   Before: had to mock AlertService with a BehaviorSubject in the test
 *   Now:    just override the selectors the component reads from
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AlertPanelComponent } from './alert-panel';
import { AlertsActions } from '../../store/alerts/alerts.actions';
import {
  selectActiveAlerts,
  selectActiveAlertCount,
} from '../../store/alerts/alerts.selectors';
import { initialMachinesState } from '../../store/machines/machines.state';
import { initialAlertsState } from '../../store/alerts/alerts.state';
import { initialSensorsState } from '../../store/sensors/sensors.state';
import { Alert } from '../../models/alert.model';

const mockAlert: Alert = {
  id: 1,
  machineId: 1,
  machineName: 'Turbine A',
  metric: 'temperature',
  value: 95,
  threshold: 90,
  severity: 'warning',
  message: 'Temperature 95°C exceeds max 90°C',
  timestamp: 1700000000000,
  acknowledged: false,
};

const initialState = {
  machines:  initialMachinesState,
  alerts:    initialAlertsState,
  sensors:   initialSensorsState,
  dashboard: { searchTerm: '' },
};

describe('AlertPanelComponent', () => {
  let fixture: ComponentFixture<AlertPanelComponent>;
  let component: AlertPanelComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertPanelComponent],
      providers: [
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectActiveAlerts, []);
    store.overrideSelector(selectActiveAlertCount, 0);

    fixture = TestBed.createComponent(AlertPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('renders "No active alerts" when the list is empty', () => {
    const noAlerts = fixture.nativeElement.querySelector('.no-alerts');
    expect(noAlerts).not.toBeNull();
    expect(noAlerts.textContent).toContain('No active alerts');
  });

  it('renders alert messages when alerts are present', async () => {
    store.overrideSelector(selectActiveAlerts, [mockAlert]);
    store.overrideSelector(selectActiveAlertCount, 1);
    store.refreshState();
    fixture.detectChanges();

    const alertRows = fixture.debugElement.queryAll(By.css('.alert-row'));
    expect(alertRows).toHaveLength(1);
    const messageEl = alertRows[0].query(By.css('.alert-message'));
    expect(messageEl.nativeElement.textContent).toContain('95°C');
  });

  it('shows the alert count badge when there are active alerts', async () => {
    store.overrideSelector(selectActiveAlerts, [mockAlert]);
    store.overrideSelector(selectActiveAlertCount, 1);
    store.refreshState();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toBe('1');
  });

  it('dispatches acknowledgeAlert when Ack button is clicked', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    store.overrideSelector(selectActiveAlerts, [mockAlert]);
    store.refreshState();
    fixture.detectChanges();

    const ackBtn = fixture.nativeElement.querySelector('.ack-btn');
    ackBtn.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      AlertsActions.acknowledgeAlert({ alertId: 1 })
    );
  });

  it('starts expanded (isExpanded = true)', () => {
    expect(component.isExpanded).toBe(true);
    const alertList = fixture.nativeElement.querySelector('.alert-list');
    expect(alertList).not.toBeNull();
  });

  it('toggleExpanded() collapses the panel', () => {
    component.toggleExpanded();
    fixture.detectChanges();

    expect(component.isExpanded).toBe(false);
    const alertList = fixture.nativeElement.querySelector('.alert-list');
    expect(alertList).toBeNull();
  });

  it('toggleExpanded() re-expands the panel', () => {
    component.isExpanded = false;
    component.toggleExpanded();
    fixture.detectChanges();

    expect(component.isExpanded).toBe(true);
    const alertList = fixture.nativeElement.querySelector('.alert-list');
    expect(alertList).not.toBeNull();
  });

  it('shows the toggle icon reflecting expanded state', () => {
    const icon = fixture.nativeElement.querySelector('.toggle-icon');
    expect(icon.textContent).toContain('▲');

    component.toggleExpanded();
    fixture.detectChanges();
    expect(icon.textContent).toContain('▼');
  });
});
