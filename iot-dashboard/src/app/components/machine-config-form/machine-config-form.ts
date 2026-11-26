/**
 * COMPONENT - MachineConfigFormComponent
 *
 * Responsibility: Reactive form for editing a machine's alert thresholds.
 *
 * ─── ARCHITECTURE RULE ───────────────────────────────────────────────────────
 * This component contains ONLY:
 *   ✓ FormGroup definition (the form IS a UI concern)
 *   ✓ Populating the form from service data
 *   ✓ Calling the service on submit
 *   ✓ UI state: isSaving, saveError
 *
 * This component does NOT contain:
 *   ✗ HTTP calls    — that's in MachineService
 *   ✗ State updates — that's in DashboardStateService
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * REACTIVE FORMS CONCEPTS DEMONSTRATED:
 *   FormGroup       — groups related FormControls together
 *   FormControl     — a single input field with its value and validation state
 *   Validators      — built-in rules: required, min, max
 *   Cross-field     — custom validator that checks min < max across two controls
 *   valueChanges$   — Observable that emits on every keystroke
 *   exhaustMap      — prevents duplicate save requests on rapid clicks
 *
 * VALIDATION STATES (each FormControl has these):
 *   valid   — passes all validators
 *   invalid — fails at least one validator
 *   dirty   — user has changed the value
 *   touched — user has focused then blurred the field
 *   errors  — object describing which validations failed and why
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup, FormControl,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, filter, switchMap, exhaustMap, tap, catchError } from 'rxjs/operators';
import { MachineConfig } from '../../models/machine.model';
import { MachineService } from '../../services/machine';
import { DashboardStateService } from '../../services/dashboard-state';
import { NotificationService } from '../../services/notification';

// ─── Custom Cross-field Validator ─────────────────────────────────────────────

/**
 * A VALIDATOR FACTORY returns a validator function.
 * This validator checks that minTemperature < maxTemperature.
 *
 * It's applied to the FormGroup (not a single control) so it can
 * read TWO controls at the same time.
 *
 * Returns null if valid, or an error object if invalid.
 * Angular reads the error object to know what message to show.
 */
function temperatureRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('minTemperature')?.value;
  const max = group.get('maxTemperature')?.value;

  // Only validate if both fields have values
  if (min !== null && max !== null && min >= max) {
    return { temperatureRange: `Min (${min}°C) must be less than Max (${max}°C)` };
  }
  return null; // null = valid
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-machine-config-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './machine-config-form.html',
  styleUrl: './machine-config-form.css'
})
export class MachineConfigFormComponent implements OnInit, OnDestroy {

  private machineService  = inject(MachineService);
  private dashboardState  = inject(DashboardStateService);
  private notifications   = inject(NotificationService);

  private destroy$ = new Subject<void>();

  // ─── The Form ─────────────────────────────────────────────────────────────

  /**
   * FormGroup: a collection of FormControls that represent the whole form.
   *
   * FormControl(initialValue, validators)
   *
   * Validators.required        — field cannot be empty
   * Validators.min(n)          — value must be >= n
   * Validators.max(n)          — value must be <= n
   *
   * The cross-field validator (temperatureRangeValidator) is on the GROUP,
   * not on individual controls — it needs to read multiple controls.
   */
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
      // Hidden field — not shown in the template, carried through for the PUT request
      id:        new FormControl<number | null>(null),
      machineId: new FormControl<number | null>(null),
    },
    { validators: temperatureRangeValidator } // <-- group-level (cross-field) validator
  );

  // ─── UI-only State ────────────────────────────────────────────────────────

  isSaving = false;
  saveError: string | null = null;
  noMachineSelected = true;

  // ─── Shorthand getters (for cleaner template code) ────────────────────────

  get minTemp() { return this.configForm.get('minTemperature')!; }
  get maxTemp() { return this.configForm.get('maxTemperature')!; }
  get maxPressure() { return this.configForm.get('maxPressure')!; }
  get maxRpm() { return this.configForm.get('maxRpm')!; }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Populate the form whenever the selected machine changes
    this.dashboardState.currentConfig$.pipe(
      takeUntil(this.destroy$),
    ).subscribe(config => {
      if (config) {
        this.noMachineSelected = false;
        // patchValue fills in ONLY the named fields (safe if model adds new fields later)
        this.configForm.patchValue(config);
        // Reset dirty/touched state so "Save" button is disabled until user makes a change
        this.configForm.markAsPristine();
      } else {
        this.noMachineSelected = true;
      }
    });

    /**
     * DEMO: valueChanges Observable
     * Every FormGroup exposes valueChanges$ — an Observable that emits the
     * entire form value on every change. Here we use it for live logging.
     * In a real app: auto-save drafts, live preview, dependent field logic.
     */
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
   * Called when the form is submitted.
   *
   * Key operator: exhaustMap
   *   If the user clicks "Save" multiple times rapidly, exhaustMap
   *   IGNORES new clicks while a save is already in progress.
   *   This prevents duplicate records being written to the server.
   *
   *   Compare with switchMap: that would CANCEL the in-flight request.
   *   For saves we want exhaustMap — ignore the extra clicks, don't cancel.
   */
  onSubmit(): void {
    if (this.configForm.invalid || this.isSaving) return;

    this.isSaving = true;
    this.saveError = null;

    const config = this.configForm.value as MachineConfig;

    this.machineService.saveConfig(config).pipe(
      tap(() => {
        this.isSaving = false;
        this.configForm.markAsPristine(); // reset dirty state after save
        this.dashboardState.updateConfig(config);
        this.notifications.success('Configuration saved successfully!');
      }),
      catchError(err => {
        this.isSaving = false;
        this.saveError = 'Failed to save. Please try again.';
        this.notifications.error('Save failed: ' + err.message);
        return EMPTY;
      }),
    ).subscribe();
  }

  /** Reset the form to the last loaded values. */
  onReset(): void {
    this.dashboardState.currentConfig$.pipe(
      takeUntil(this.destroy$),
    ).subscribe(config => {
      if (config) this.configForm.patchValue(config);
      this.configForm.markAsPristine();
    });
  }
}
