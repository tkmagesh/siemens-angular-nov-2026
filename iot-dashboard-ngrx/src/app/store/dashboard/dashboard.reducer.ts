/**
 * REDUCER - dashboard.reducer.ts
 *
 * NgRx concept: ONE ACTION CAN BE HANDLED BY MULTIPLE REDUCERS.
 *
 * This reducer handles MachinesActions.searchMachines even though that action
 * is defined in the machines feature. NgRx routes EVERY dispatched action to
 * ALL reducers — each reducer decides whether to react (via its `on()` entries).
 *
 * VS plain-RxJS version:
 *   Before: DashboardStateService owned searchTermSource$ and searchResults$.
 *           MachineListComponent called dashboardState.setSearchTerm(term).
 *           Other components that needed the search term had to subscribe to
 *           dashboardState.searchTermSource$ — coupling them to DashboardStateService.
 *   Now:    The search term lives in the store, queryable by any selector.
 *           The component dispatches MachinesActions.searchMachines({ term }).
 *           Both this reducer (tracks the term) AND the effect (runs HTTP)
 *           react to the same action — no component knows about either.
 *
 * TRAINING POINT: This is a compelling NgRx teaching moment.
 *   "One action, multiple handlers" is impossible with BehaviorSubject.
 *   It is natural with NgRx — every reducer sees every action.
 */

import { createReducer, on } from '@ngrx/store';
import { DashboardActions } from './dashboard.actions';
import { MachinesActions } from '../machines/machines.actions';
import { initialDashboardState } from './dashboard.state';

export const dashboardReducer = createReducer(
  initialDashboardState,

  // Track search term when explicitly set by the dashboard
  on(DashboardActions.setSearchTerm, (state, { term }) => ({
    ...state,
    searchTerm: term,
  })),

  // Also track it when the machines search action is dispatched
  // — this is the "one action, multiple reducers" pattern
  on(MachinesActions.searchMachines, (state, { term }) => ({
    ...state,
    searchTerm: term,
  })),
);
