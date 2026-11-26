/**
 * STATE SHAPE - machines.state.ts
 *
 * NgRx concept: Feature state slice using @ngrx/entity.
 *
 * @ngrx/entity provides EntityState<T> — a normalised collection:
 *   { ids: [1, 2, 3], entities: { 1: Machine, 2: Machine, 3: Machine } }
 *
 * VS plain-RxJS version:
 *   Before: machines were fetched on demand by MachineListComponent and stored
 *           nowhere — every new subscription re-fetched from HTTP.
 *   Now:    machines are loaded ONCE into the store and read by any component
 *           via selectors with zero additional HTTP calls.
 *
 * EntityAdapter provides pre-built reducer helpers:
 *   setAll(machines, state)   — replace entire collection
 *   upsertOne(machine, state) — add or update one entity
 *   removeOne(id, state)      — remove by id
 *
 * Extra fields beyond the entity collection:
 *   selectedMachineId — which machine the user clicked
 *   currentConfig     — thresholds for the selected machine
 *   searchResults     — matches from the search box
 *   loading/saving    — UI feedback flags
 *   error             — last error message
 */

import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { Machine, MachineConfig } from '../../models/machine.model';

export interface MachinesState extends EntityState<Machine> {
  selectedMachineId: number | null;
  currentConfig:     MachineConfig | null;
  searchResults:     Machine[];
  loading:           boolean;
  saving:            boolean;
  error:             string | null;
}

/**
 * EntityAdapter gives us:
 *   - getInitialState({ ...extraFields }) — builds the initial state object
 *   - Selector factories: getSelectors() used in machines.selectors.ts
 *   - Mutation helpers: setAll, upsertOne, etc. used in machines.reducer.ts
 */
export const machineAdapter = createEntityAdapter<Machine>();

export const initialMachinesState: MachinesState = machineAdapter.getInitialState({
  selectedMachineId: null,
  currentConfig:     null,
  searchResults:     [],
  loading:           false,
  saving:            false,
  error:             null,
});
