/**
 * APP CONFIG - app.config.ts
 *
 * This file is the NgRx registration hub. Everything that existed as a
 * "providedIn: 'root'" service in the BehaviorSubject version is now
 * explicitly declared here.
 *
 * ─── KEY NgRx PROVIDERS ───────────────────────────────────────────────────
 *
 * provideStore({ machines, alerts, sensors, dashboard })
 *   Registers the ROOT STATE TREE and maps each slice name to its reducer.
 *   This creates the single Redux-style store that all components and effects
 *   read from and write to via actions.
 *
 *   VS BehaviorSubject version:
 *     Before: State was scattered across MachineService, AlertService,
 *             DashboardStateService — each holding its own BehaviorSubject.
 *     Now:    ONE store, ONE state tree, ONE source of truth.
 *
 * provideEffects([MachinesEffects, AlertsEffects, SensorsEffects])
 *   Registers Effect classes. Angular's dependency injection instantiates
 *   these and subscribes them when the app starts.
 *
 *   VS BehaviorSubject version:
 *     Before: Side effects (HTTP calls, WebSocket) lived inside service methods
 *             called imperatively from components or other services.
 *     Now:    Effects are declarative — they react to Actions, perform side
 *             effects, and dispatch result Actions. No component triggers them.
 *
 * provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() })
 *   Wires up the Redux DevTools browser extension.
 *   In DevTools you can:
 *     - See every Action dispatched (the full action log)
 *     - Inspect the state before and after each Action
 *     - Time-travel: jump to any point in history
 *     - Replay a sequence of actions to reproduce bugs
 *
 *   VS BehaviorSubject version:
 *     Before: No visibility into state changes. Console.log was your only tool.
 *     Now:    Full audit trail of every state change, labelled by action type.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { machinesReducer } from './store/machines/machines.reducer';
import { alertsReducer } from './store/alerts/alerts.reducer';
import { sensorsReducer } from './store/sensors/sensors.reducer';
import { dashboardReducer } from './store/dashboard/dashboard.reducer';

import { MachinesEffects } from './store/machines/machines.effects';
import { AlertsEffects } from './store/alerts/alerts.effects';
import { SensorsEffects } from './store/sensors/sensors.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // HttpClient — still needed by Effects for HTTP calls
    provideHttpClient(withFetch()),

    // ── NgRx Store ──────────────────────────────────────────────────────────
    // Maps each state slice name to its reducer function.
    // The reducer names here become the keys in AppState.
    provideStore({
      machines: machinesReducer,
      alerts:   alertsReducer,
      sensors:  sensorsReducer,
      dashboard: dashboardReducer,
    }),

    // ── NgRx Effects ────────────────────────────────────────────────────────
    // Registers all Effect classes. Each class is instantiated once at startup.
    provideEffects([
      MachinesEffects,
      AlertsEffects,
      SensorsEffects,
    ]),

    // ── Redux DevTools ──────────────────────────────────────────────────────
    // logOnly: true in production (no time-travel, reduces overhead).
    // maxAge: 25 — keep last 25 actions in DevTools history.
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true,
      name: 'IoT Dashboard NgRx',
    }),
  ],
};
