/**
 * EFFECTS - machines.effects.ts
 *
 * NgRx concept: Effects handle ALL SIDE EFFECTS — HTTP, WebSocket,
 * localStorage, timers — anything that talks to the outside world.
 *
 * VS plain-RxJS version:
 *   Before: MachineService contained HTTP methods, DashboardStateService
 *           contained the debounce+switchMap search pipeline, and components
 *           called service methods directly.
 *   Now:    Components DISPATCH ACTIONS. Effects LISTEN for those actions,
 *           call MachineService, then DISPATCH result actions.
 *           Components never know HTTP happened.
 *
 * Data flow in NgRx:
 *   Component → dispatch(action) → Effect listens → HTTP call → dispatch(successAction)
 *                                                             → Reducer handles successAction
 *                                                             → Store emits new state
 *                                                             → Component re-renders
 *
 * createEffect():
 *   Wraps an Observable<Action> so NgRx can subscribe to it.
 *   The Observable must emit Actions (or be marked { dispatch: false }).
 *
 * Key operators:
 *   ofType(action)    — filter the Actions stream to one action type
 *   switchMap         — cancel in-flight request when a new action arrives
 *   exhaustMap        — ignore new actions while one is in flight (save button)
 *   catchError        — catch HTTP errors and dispatch failure actions
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  map, switchMap, exhaustMap,
  debounceTime, distinctUntilChanged,
  catchError,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { MachinesActions } from './machines.actions';
import { Machine, MachineConfig } from '../../models/machine.model';

const BASE = 'http://localhost:3000';

@Injectable()
export class MachinesEffects {

  private actions$ = inject(Actions);
  private http      = inject(HttpClient);

  // ── Load all machines ────────────────────────────────────────────────────

  loadMachines$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MachinesActions.loadMachines),
      switchMap(() =>
        this.http.get<Machine[]>(`${BASE}/machines`).pipe(
          map(machines => MachinesActions.loadMachinesSuccess({ machines })),
          catchError(err  => of(MachinesActions.loadMachinesFailure({ error: err.message }))),
        )
      ),
    )
  );

  // ── Search with debounce ─────────────────────────────────────────────────
  // debounceTime here (not in a component, not in a separate service) —
  // the entire pipeline lives in one place.

  searchMachines$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MachinesActions.searchMachines),
      debounceTime(300),
      distinctUntilChanged((a, b) => a.term === b.term),
      switchMap(({ term }) => {
        if (term.length < 2) {
          return of(MachinesActions.searchMachinesSuccess({ machines: [] }));
        }
        const params = new HttpParams().set('name_like', term);
        return this.http.get<Machine[]>(`${BASE}/machines`, { params }).pipe(
          map(machines => MachinesActions.searchMachinesSuccess({ machines })),
          catchError(() => of(MachinesActions.searchMachinesSuccess({ machines: [] }))),
        );
      }),
    )
  );

  // ── Auto-load config when a machine is selected ───────────────────────────
  // Previously this was wired in DashboardStateService.wireConfigToSelection().
  // Now it's just an effect that reacts to the selectMachine action.

  loadConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MachinesActions.selectMachine),
      switchMap(({ machine }) => {
        const params = new HttpParams().set('machineId', machine.id);
        return this.http.get<MachineConfig[]>(`${BASE}/configs`, { params }).pipe(
          map(configs => MachinesActions.loadConfigSuccess({ config: configs[0] })),
          catchError(() => of(MachinesActions.loadMachinesFailure({ error: 'Config load failed' }))),
        );
      }),
    )
  );

  // ── Save config ───────────────────────────────────────────────────────────
  // exhaustMap: if the user clicks Save twice rapidly, the second click is
  // IGNORED while the first HTTP request is still in flight.
  // VS switchMap: that would CANCEL the first save (dangerous for writes).

  saveConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MachinesActions.saveConfig),
      exhaustMap(({ config }) =>
        this.http.put<MachineConfig>(`${BASE}/configs/${config.id}`, config).pipe(
          map(saved => MachinesActions.saveConfigSuccess({ config: saved })),
          catchError(err => of(MachinesActions.saveConfigFailure({ error: err.message }))),
        )
      ),
    )
  );
}
