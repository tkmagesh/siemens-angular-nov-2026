/**
 * ROOT COMPONENT - App
 *
 * In NgRx, the root component's job is to dispatch STARTUP ACTIONS.
 * That is all. It does not call service methods, does not set up subscriptions,
 * and does not hold any state.
 *
 * ─── KEY DIFFERENCE FROM BEHAVIORSUBJECT VERSION ─────────────────────────
 *
 * Before (BehaviorSubject / service-based):
 *   ngOnInit() {
 *     this.alertService.loadAlerts();      // imperative: call the service
 *   }
 *
 * Now (NgRx):
 *   ngOnInit() {
 *     this.store.dispatch(AlertsActions.loadAlerts());   // declarative: dispatch an action
 *   }
 *
 * The difference is subtle but important:
 *   - Dispatching an action is a declaration of INTENT: "alerts should be loaded"
 *   - WHO loads them (AlertsEffects) and HOW (HTTP) are hidden from this component
 *   - The action appears in Redux DevTools with a timestamp, making startup auditable
 *   - Any number of Effects can respond to the same action — no tight coupling
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from './store/app.state';
import { MachinesActions } from './store/machines/machines.actions';
import { AlertsActions } from './store/alerts/alerts.actions';
import { SensorsActions } from './store/sensors/sensors.actions';
import { MachineListComponent } from './components/machine-list/machine-list';
import { SensorDashboardComponent } from './components/sensor-dashboard/sensor-dashboard';
import { AlertPanelComponent } from './components/alert-panel/alert-panel';
import { MachineConfigFormComponent } from './components/machine-config-form/machine-config-form';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MachineListComponent,
    SensorDashboardComponent,
    AlertPanelComponent,
    MachineConfigFormComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {

  // The Store is the ONLY dependency this component needs.
  // It has no MachineService, no AlertService, no DashboardStateService.
  private store = inject(Store<AppState>);

  ngOnInit(): void {
    // Dispatch startup actions. Effects will handle the actual work.
    // These three lines replace all the service.load() calls from the BehaviorSubject version.
    this.store.dispatch(MachinesActions.loadMachines());
    this.store.dispatch(AlertsActions.loadAlerts());
    this.store.dispatch(SensorsActions.connectWebSocket());
  }
}
