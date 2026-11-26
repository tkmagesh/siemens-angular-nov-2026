/**
 * NgRx TESTING PATTERN: Component Tests with MockStore (config form)
 *
 * Demonstrates:
 *   - Populating a reactive form via store selector override
 *   - Asserting dispatch() on form submit
 *   - Testing Angular reactive form validation (unchanged from BehaviorSubject version)
 *   - Cross-field validator still tested identically — form validation is framework-agnostic
 *
 * Note: The form logic (validators, cross-field validator) is IDENTICAL to the
 * BehaviorSubject version. Only the data source (selector vs service observable)
 * and submit handler (dispatch vs service call) differ.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MachineConfigFormComponent } from './machine-config-form';
import { MachinesActions } from '../../store/machines/machines.actions';
import {
  selectCurrentConfig,
  selectMachinesSaving,
  selectMachinesError,
} from '../../store/machines/machines.selectors';
import { initialMachinesState } from '../../store/machines/machines.state';
import { initialAlertsState } from '../../store/alerts/alerts.state';
import { initialSensorsState } from '../../store/sensors/sensors.state';
import { MachineConfig } from '../../models/machine.model';

const mockConfig: MachineConfig = {
  id: 10,
  machineId: 1,
  minTemperature: 20,
  maxTemperature: 90,
  maxPressure: 10,
  maxRpm: 3000,
};

const initialState = {
  machines:  initialMachinesState,
  alerts:    initialAlertsState,
  sensors:   initialSensorsState,
  dashboard: { searchTerm: '' },
};

describe('MachineConfigFormComponent', () => {
  let fixture: ComponentFixture<MachineConfigFormComponent>;
  let component: MachineConfigFormComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineConfigFormComponent],
      providers: [
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentConfig, null);
    store.overrideSelector(selectMachinesSaving, false);
    store.overrideSelector(selectMachinesError, null);

    fixture = TestBed.createComponent(MachineConfigFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('form initialises with null values when no config is selected', () => {
    expect(component.configForm.get('minTemperature')!.value).toBeNull();
    expect(component.configForm.get('maxTemperature')!.value).toBeNull();
  });

  it('form is populated when a config is selected via store', async () => {
    store.overrideSelector(selectCurrentConfig, mockConfig);
    store.refreshState();
    fixture.detectChanges();

    expect(component.configForm.get('minTemperature')!.value).toBe(20);
    expect(component.configForm.get('maxTemperature')!.value).toBe(90);
    expect(component.configForm.get('maxPressure')!.value).toBe(10);
    expect(component.configForm.get('maxRpm')!.value).toBe(3000);
  });

  it('form is marked pristine after being populated from store', async () => {
    store.overrideSelector(selectCurrentConfig, mockConfig);
    store.refreshState();
    fixture.detectChanges();

    expect(component.configForm.pristine).toBe(true);
  });

  it('dispatches saveConfig with form values on valid submit', async () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    store.overrideSelector(selectCurrentConfig, mockConfig);
    store.refreshState();
    fixture.detectChanges();

    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      MachinesActions.saveConfig({ config: component.configForm.value as MachineConfig })
    );
  });

  it('does not dispatch when form is invalid', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    // Form starts with null values → invalid
    component.onSubmit();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('marks the form pristine after a valid submit', async () => {
    store.overrideSelector(selectCurrentConfig, mockConfig);
    store.refreshState();
    fixture.detectChanges();

    component.configForm.markAsDirty();
    component.onSubmit();

    expect(component.configForm.pristine).toBe(true);
  });

  describe('individual field validation', () => {
    it('minTemperature is required', () => {
      component.minTemp.setValue(null);
      expect(component.minTemp.hasError('required')).toBe(true);
    });

    it('minTemperature rejects values below -50', () => {
      component.minTemp.setValue(-51);
      expect(component.minTemp.hasError('min')).toBe(true);
    });

    it('maxPressure rejects values above 50', () => {
      component.maxPressure.setValue(51);
      expect(component.maxPressure.hasError('max')).toBe(true);
    });

    it('maxRpm rejects values above 10000', () => {
      component.maxRpm.setValue(10001);
      expect(component.maxRpm.hasError('max')).toBe(true);
    });
  });

  describe('cross-field validator: temperature range', () => {
    it('form is valid when min < max', () => {
      component.minTemp.setValue(20);
      component.maxTemp.setValue(90);
      component.maxPressure.setValue(10);
      component.maxRpm.setValue(3000);

      expect(component.configForm.hasError('temperatureRange')).toBe(false);
      expect(component.configForm.valid).toBe(true);
    });

    it('form is invalid when min equals max', () => {
      component.minTemp.setValue(50);
      component.maxTemp.setValue(50);
      component.maxPressure.setValue(10);
      component.maxRpm.setValue(3000);

      expect(component.configForm.hasError('temperatureRange')).toBe(true);
    });

    it('form is invalid when min is greater than max', () => {
      component.minTemp.setValue(80);
      component.maxTemp.setValue(50);
      component.maxPressure.setValue(10);
      component.maxRpm.setValue(3000);

      expect(component.configForm.hasError('temperatureRange')).toBe(true);
    });

    it('temperatureRange error includes the conflicting values in its message', () => {
      component.minTemp.setValue(80);
      component.maxTemp.setValue(50);
      const error = component.configForm.getError('temperatureRange');
      expect(error).toContain('80');
      expect(error).toContain('50');
    });
  });
});
