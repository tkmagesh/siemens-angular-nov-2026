/**
 * NgRx TESTING PATTERN: Component Tests with MockStore
 *
 * provideMockStore() replaces the real NgRx Store for testing.
 * This means:
 *   - No real reducers run
 *   - No real effects run (no HTTP, no WebSocket)
 *   - You control what state each selector returns via overrideSelector()
 *   - You spy on dispatch() to assert what actions the component sends
 *
 * VS BehaviorSubject version component tests:
 *   Before: had to mock MachineService + DashboardStateService — two separate mocks
 *   Now:    mock ONE thing: the Store. Simpler, more focused tests.
 *
 * Key API:
 *   mockStore.overrideSelector(selector, value) — set what a selector returns
 *   mockStore.setState({ ... })                  — replace entire state
 *   vi.spyOn(store, 'dispatch')                  — capture dispatched actions
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MachineListComponent } from './machine-list';
import { MachinesActions } from '../../store/machines/machines.actions';
import {
  selectAllMachines,
  selectMachinesLoading,
  selectSelectedMachineId,
  selectSearchResults,
} from '../../store/machines/machines.selectors';
import { initialMachinesState } from '../../store/machines/machines.state';
import { initialAlertsState } from '../../store/alerts/alerts.state';
import { initialSensorsState } from '../../store/sensors/sensors.state';
import { Machine } from '../../models/machine.model';

const mockMachines: Machine[] = [
  { id: 1, name: 'Turbine A',    type: 'Turbine',    location: 'Hall B', status: 'online' },
  { id: 2, name: 'Compressor B', type: 'Compressor', location: 'Hall C', status: 'offline' },
];

const initialState = {
  machines:  initialMachinesState,
  alerts:    initialAlertsState,
  sensors:   initialSensorsState,
  dashboard: { searchTerm: '' },
};

describe('MachineListComponent', () => {
  let fixture: ComponentFixture<MachineListComponent>;
  let component: MachineListComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineListComponent],
      providers: [
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);

    // Set up default selector overrides
    store.overrideSelector(selectAllMachines, []);
    store.overrideSelector(selectMachinesLoading, false);
    store.overrideSelector(selectSelectedMachineId, null);
    store.overrideSelector(selectSearchResults, []);

    fixture = TestBed.createComponent(MachineListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('renders the Machines heading', () => {
    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent).toContain('Machines');
  });

  it('renders machine names in the list', async () => {
    store.overrideSelector(selectAllMachines, mockMachines);
    store.refreshState();
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.machine-name'));
    expect(rows).toHaveLength(2);
    expect(rows[0].nativeElement.textContent).toContain('Turbine A');
    expect(rows[1].nativeElement.textContent).toContain('Compressor B');
  });

  it('shows loading indicator when loading is true', async () => {
    store.overrideSelector(selectMachinesLoading, true);
    store.refreshState();
    fixture.detectChanges();

    const loading = fixture.nativeElement.querySelector('.loading');
    expect(loading).not.toBeNull();
    expect(loading.textContent).toContain('Loading');
  });

  it('hides loading indicator when loading is false', () => {
    store.overrideSelector(selectMachinesLoading, false);
    store.refreshState();
    fixture.detectChanges();

    const loading = fixture.nativeElement.querySelector('.loading');
    expect(loading).toBeNull();
  });

  it('dispatches selectMachine when a machine row is clicked', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    store.overrideSelector(selectAllMachines, mockMachines);
    store.refreshState();
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.machine-row'));
    rows[0].nativeElement.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      MachinesActions.selectMachine({ machine: mockMachines[0] })
    );
  });

  it('applies "selected" class to the highlighted machine row', async () => {
    store.overrideSelector(selectAllMachines, mockMachines);
    store.overrideSelector(selectSelectedMachineId, 1);
    store.refreshState();
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.machine-row'));
    expect(rows[0].nativeElement.classList.contains('selected')).toBe(true);
    expect(rows[1].nativeElement.classList.contains('selected')).toBe(false);
  });

  it('dispatches searchMachinesSuccess([]) on onClearSearch()', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.onClearSearch();

    expect(dispatchSpy).toHaveBeenCalledWith(
      MachinesActions.searchMachinesSuccess({ machines: [] })
    );
  });

  it('dispatches searchMachines when term is 2+ characters', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.onSearch('Tu');

    expect(dispatchSpy).toHaveBeenCalledWith(
      MachinesActions.searchMachines({ term: 'Tu' })
    );
  });

  it('dispatches searchMachinesSuccess([]) when term is less than 2 characters', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.onSearch('T');

    expect(dispatchSpy).toHaveBeenCalledWith(
      MachinesActions.searchMachinesSuccess({ machines: [] })
    );
  });

  it('toggleSearch shows and hides the search panel', () => {
    expect(component.showSearch).toBe(false);
    component.toggleSearch();
    expect(component.showSearch).toBe(true);
    component.toggleSearch();
    expect(component.showSearch).toBe(false);
  });
});
