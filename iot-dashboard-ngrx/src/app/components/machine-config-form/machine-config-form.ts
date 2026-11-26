/**
 * COMPONENT - MachineConfigFormComponent
 *
 * ─── HOW NgRx CHANGES THIS COMPONENT ────────────────────────────────────────
 * BehaviorSubject version:
 *   - Subscribed to dashboardState.currentConfig$ in ngOnInit
 *   - Called machineService.saveConfig(config).pipe(exhaustMap...).subscribe()
 *   - Managed isSaving/saveError in the component
 *   - Called dashboardState.updateConfig() after save
 *   - Needed takeUntil(destroy$) + ngOnDestroy for all subscriptions
 *
 * NgRx version:
 *   - Subscribes to store.select(selectCurrentConfig) for form population
 *   - Dispatches MachinesActions.saveConfig({ config }) on submit
 *   - isSaving comes from store.select(selectMachinesSaving) — set by reducer
 *   - saveError comes from store.select(selectMachinesError)
 *   - MachinesEffects.saveConfig$ handles the HTTP PUT
 *   - MachinesReducer updates currentConfig on success
 *   - Still needs takeUntil for the config subscription (we subscribe to patch form)
 *
 * Form population is the one place we still need a manual subscription:
 *   We call configForm.patchValue() which is a FormGroup mutation.
 *   The async pipe only works for READ/DISPLAY — it can't call methods.
 *   So we subscribe explicitly but clean up with takeUntilDestroyed().
 *
 * Everything else is SIMPLER with NgRx:
 *   - No isSaving local boolean — it comes from the store
 *   - No saveError local string — it comes from the store
 *   - No manual call to updateConfig() after save — reducer does it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * REACTIVE FORMS CONCEPTS (unchanged from BehaviorSubject version):
 *   FormGroup, FormControl, Validators, cross-field validator, valueChanges$
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup, FormControl,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import { MachinesActions } from '../../store/machines/machines.actions';
import {
  selectCurrentConfig,
  selectMachinesSaving,
  selectMachinesError,
} from '../../store/machines/machines.selectors';
import { MachineConfig } from '../../models/machine.model';

// ─── Custom Cross-field Validator ─────────────────────────────────────────────
// (identical to BehaviorSubject version — validation logic is framework-agnostic)

/**
 * Applied to the FormGroup (not a single control) so it can read TWO controls.
 * Returns null if valid, or an error object if invalid.
 */
function temperatureRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('minTemperature')?.value;
  const max = group.get('maxTemperature')?.value;
  if (min !== null && max !== null && min >= max) {
    return { temperatureRange: `Min (${min}°C) must be less than Max (${max}°C)` };
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-machine-config-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './machine-config-form.html',
  styleUrl: './machine-config-form.css',
})
export class MachineConfigFormComponent implements OnInit, OnDestroy {

  // ─── Single dependency: the Store ────────────────────────────────────────
  private store = inject(Store<AppState>);

  private destroy$ = new Subject<void>();

  // ─── The Form (unchanged from BehaviorSubject version) ────────────────────
  configForm = new FormGroup(
    {
      minTemperature: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(-50),
        Validators.max(200),
      ]),
      maxTemperature: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(-50),
        Validators.max(200),
      ]),
      maxPressure: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
        Validators.max(50),
      ]),
      maxRpm: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
        Validators.max(10000),
      ]),
      id:        new FormControl<number | null>(null),
      machineId: new FormControl<number | null>(null),
    },
    { validators: temperatureRangeValidator }
  );

  // ─── State from the store ─────────────────────────────────────────────────

  /**
   * True while MachinesEffects.saveConfig$ is in-flight.
   * MachinesReducer sets saving:true on saveConfig action,
   * and saving:false on saveConfigSuccess or saveConfigFailure.
   *
   * BehaviorSubject version: this.isSaving = true/false in component methods
   * NgRx version: this.isSaving$ = this.store.select(selectMachinesSaving)
   */
  isSaving$: Observable<boolean> = this.store.select(selectMachinesSaving);

  /** Error message if the last save failed — null otherwise */
  saveError$: Observable<string | null> = this.store.select(selectMachinesError);

  // ─── UI-only State ────────────────────────────────────────────────────────

  noMachineSelected = true;

  // ─── Shorthand getters ────────────────────────────────────────────────────

  get minTemp() { return this.configForm.get('minTemperature')!; }
  get maxTemp() { return this.configForm.get('maxTemperature')!; }
  get maxPressure() { return this.configForm.get('maxPressure')!; }
  get maxRpm() { return this.configForm.get('maxRpm')!; }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    /**
     * Subscribe to populate the form when the config changes.
     * We MUST subscribe (not use async pipe) because we need to call
     * configForm.patchValue() — a method call, not a binding.
     *
     * BehaviorSubject version: dashboardState.currentConfig$.pipe(takeUntil...)
     * NgRx version:            store.select(selectCurrentConfig).pipe(takeUntil...)
     * The structure is the same; only the source changes.
     */
    this.store.select(selectCurrentConfig).pipe(
      takeUntil(this.destroy$),
    ).subscribe(config => {
      if (config) {
        this.noMachineSelected = false;
        this.configForm.patchValue(config);
        this.configForm.markAsPristine();
      } else {
        this.noMachineSelected = true;
      }
    });

    // Demo: valueChanges$ shows every form change as an Observable
    this.configForm.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(value => {
      console.log('[ConfigForm] Form value changed:', value);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── User Interaction ─────────────────────────────────────────────────────

  /**
   * Dispatches saveConfig action.
   *
   * BehaviorSubject version:
   *   this.machineService.saveConfig(config).pipe(exhaustMap, tap, catchError).subscribe()
   *   — component managed HTTP + success/error state manually
   *
   * NgRx version:
   *   this.store.dispatch(MachinesActions.saveConfig({ config }))
   *   — MachinesEffects.saveConfig$ handles the HTTP PUT
   *   — MachinesReducer sets saving:false + currentConfig on success
   *   — MachinesReducer sets error on failure
   *   — Component just reads isSaving$ and saveError$ from selectors
   *
   * The component is now completely DECOUPLED from HTTP. It only knows about
   * the action name and the data shape. The HOW is entirely in the Effect.
   */
  onSubmit(): void {
    if (this.configForm.invalid) return;

    const config = this.configForm.value as MachineConfig;
    this.store.dispatch(MachinesActions.saveConfig({ config }));
    this.configForm.markAsPristine();
  }

  /** Reset the form to the last saved values from the store */
  onReset(): void {
    this.store.select(selectCurrentConfig).pipe(
      takeUntil(this.destroy$),
    ).subscribe(config => {
      if (config) {
        this.configForm.patchValue(config);
        this.configForm.markAsPristine();
      }
    });
  }
}
