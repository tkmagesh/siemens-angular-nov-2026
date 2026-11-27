/**
 * TESTS - app.spec.ts
 *
 * Root component smoke test — verifies the app bootstraps with the NgRx Store.
 */

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { initialMachinesState } from './store/machines/machines.state';
import { initialAlertsState } from './store/alerts/alerts.state';
import { initialSensorsState } from './store/sensors/sensors.state';
import { initialDashboardState } from './store/dashboard/dashboard.state';

const initialState = {
  machines:  initialMachinesState,
  alerts:    initialAlertsState,
  sensors:   initialSensorsState,
  dashboard: initialDashboardState,
};

describe('App', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideMockStore({ initialState })],
    }).compileComponents();
  });

  it('creates the root component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the app header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent).toContain('IoT Factory Dashboard');
  });
});
