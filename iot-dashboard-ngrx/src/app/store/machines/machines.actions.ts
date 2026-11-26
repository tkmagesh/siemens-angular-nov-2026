/**
 * ACTIONS - machines.actions.ts
 *
 * NgRx concept: Actions are the VOCABULARY of your application.
 * Every user interaction and system event that changes state is expressed as a
 * dispatched action. Actions are plain objects: { type: string, ...payload }.
 *
 * VS plain-RxJS version:
 *   Before: a component called this.dashboardState.selectMachine(machine)
 *           which directly called this.selectedMachineSource$.next(machine).
 *           State changed imperatively, invisibly.
 *   Now:    a component dispatches MachinesActions.selectMachine({ machine }).
 *           The action is LOGGED in Redux DevTools with a timestamp.
 *           Any effect or reducer can react to it.
 *           Nothing is hidden.
 *
 * createActionGroup():
 *   Groups related actions under one source name ('Machines').
 *   Auto-generates type strings like '[Machines] Load Machines'.
 *   Provides type-safe creators: MachinesActions.loadMachines(), etc.
 *
 * RULE: Actions describe WHAT HAPPENED, not what to do.
 *   Good:  loadMachinesSuccess  (something happened)
 *   Bad:   setMachinesLoading   (imperative command — that's the reducer's job)
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Machine, MachineConfig } from '../../models/machine.model';

export const MachinesActions = createActionGroup({
  source: 'Machines',
  events: {
    // ── Loading ────────────────────────────────────────────────────────────
    'Load Machines':         emptyProps(),
    'Load Machines Success': props<{ machines: Machine[] }>(),
    'Load Machines Failure': props<{ error: string }>(),

    // ── Selection ──────────────────────────────────────────────────────────
    'Select Machine': props<{ machine: Machine }>(),

    // ── Search ─────────────────────────────────────────────────────────────
    'Search Machines':         props<{ term: string }>(),
    'Search Machines Success': props<{ machines: Machine[] }>(),

    // ── Config ─────────────────────────────────────────────────────────────
    // loadConfig is triggered automatically when a machine is selected (effect)
    'Load Config':         props<{ machineId: number }>(),
    'Load Config Success': props<{ config: MachineConfig }>(),

    // ── Save config ────────────────────────────────────────────────────────
    'Save Config':         props<{ config: MachineConfig }>(),
    'Save Config Success': props<{ config: MachineConfig }>(),
    'Save Config Failure': props<{ error: string }>(),
  },
});
