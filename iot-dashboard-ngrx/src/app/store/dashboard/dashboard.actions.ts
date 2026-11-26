/**
 * ACTIONS - dashboard.actions.ts
 *
 * Dashboard actions model the user's search interaction.
 *
 * VS plain-RxJS version:
 *   Before: MachineListComponent called dashboardState.setSearchTerm(value)
 *           which pushed to searchTermSource$ (a Subject).
 *   Now:    Component dispatches DashboardActions.setSearchTerm({ term }).
 *           The debounce+HTTP pipeline lives in MachinesEffects.searchMachines$
 *           which listens for this action — not here.
 *
 * WHY A SEPARATE SLICE?
 *   Search term is not part of the machine entity model.
 *   Keeping it here makes the architecture explicit:
 *   "dashboard coordination state" vs "machine data state".
 */

import { createActionGroup, props } from '@ngrx/store';

export const DashboardActions = createActionGroup({
  source: 'Dashboard',
  events: {
    // Dispatched on every keystroke (debounce lives in the effect)
    'Set Search Term': props<{ term: string }>(),
  },
});
