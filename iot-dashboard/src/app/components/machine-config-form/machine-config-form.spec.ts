/**
 * COMPONENT TEST - MachineConfigFormComponent
 *
 * WHAT IS TESTED:
 *   The MachineConfigFormComponent demonstrates Angular Reactive Forms:
 *   - FormGroup with FormControl — grouping related fields
 *   - Built-in validators: required, min, max
 *   - Cross-field validator: minTemperature must be < maxTemperature
 *   - Form state: valid/invalid, pristine/dirty, touched/untouched
 *   - Populating the form from service data (patchValue)
 *   - Calling the service on submit
 *
 * KEY ANGULAR CONCEPTS:
 *   - Reactive Forms testing — manipulate FormControl values directly in tests
 *   - Validation states: .valid, .invalid, .errors, .pristine, .dirty
 *   - Cross-field validators on FormGroup (not individual controls)
 *   - Save button disabled when form is invalid OR pristine
 *
 * MOCKING STRATEGY:
 *   MachineService.saveConfig — vi.fn() that returns of(mockConfig)
 *   DashboardStateService.currentConfig$ — BehaviorSubject we push into
 *   NotificationService — vi.fn() spies on success/error
 *
 * IMPORTANT: These tests do NOT use TestBed's DOM rendering for most
 * validation checks — they test the FormGroup directly on the component
 * instance. This is faster and more focused than DOM-level testing.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';

import { MachineConfigFormComponent } from './machine-config-form';
import { MachineService } from '../../services/machine';
import { DashboardStateService } from '../../services/dashboard-state';
import { NotificationService } from '../../services/notification';
import { MachineConfig } from '../../models/machine.model';

// ─── Shared test data ─────────────────────────────────────────────────────────

const mockConfig: MachineConfig = {
  id: 1, machineId: 1,
  minTemperature: 20, maxTemperature: 90,
  maxPressure: 10, maxRpm: 3000,
};

/** Patches all required fields with valid values and marks the form dirty. */
function fillValidForm(component: MachineConfigFormComponent): void {
  component.configForm.patchValue({
    id: 1, machineId: 1,
    minTemperature: 20, maxTemperature: 90,
    maxPressure: 10, maxRpm: 3000,
  });
  component.configForm.markAsDirty();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MachineConfigFormComponent', () => {
  let fixture: ComponentFixture<MachineConfigFormComponent>;
  let component: MachineConfigFormComponent;

  let currentConfig$: BehaviorSubject<MachineConfig | null>;

  let machineServiceMock: { saveConfig: ReturnType<typeof vi.fn> };
  let dashboardStateMock: {
    currentConfig$: BehaviorSubject<MachineConfig | null>;
    updateConfig: ReturnType<typeof vi.fn>;
  };
  let notificationMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    currentConfig$ = new BehaviorSubject<MachineConfig | null>(null);

    machineServiceMock  = { saveConfig: vi.fn().mockReturnValue(of(mockConfig)) };
    dashboardStateMock  = { currentConfig$, updateConfig: vi.fn() };
    notificationMock    = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MachineConfigFormComponent],
      providers: [
        { provide: MachineService,        useValue: machineServiceMock },
        { provide: DashboardStateService,  useValue: dashboardStateMock },
        { provide: NotificationService,    useValue: notificationMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(MachineConfigFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Initial State ────────────────────────────────────────────────────────

  it('shows "select a machine" placeholder when no config is loaded', () => {
    // currentConfig$ starts null → noMachineSelected = true
    expect(component.noMachineSelected).toBe(true);
    const placeholder = fixture.nativeElement.querySelector('.no-selection');
    expect(placeholder).toBeTruthy();
  });

  it('form is INVALID on initial load (all fields empty = required fails)', () => {
    expect(component.configForm.invalid).toBe(true);
  });

  it('form is PRISTINE on initial load (no user edits yet)', () => {
    expect(component.configForm.pristine).toBe(true);
  });

  // ─── Form Populates from Service ────────────────────────────────────────

  it('hides placeholder when config is loaded from currentConfig$', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    expect(component.noMachineSelected).toBe(false);
  });

  it('populates form fields when currentConfig$ emits a config', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    expect(component.configForm.value.minTemperature).toBe(mockConfig.minTemperature);
    expect(component.configForm.value.maxTemperature).toBe(mockConfig.maxTemperature);
    expect(component.configForm.value.maxPressure).toBe(mockConfig.maxPressure);
    expect(component.configForm.value.maxRpm).toBe(mockConfig.maxRpm);
  });

  it('form is PRISTINE after config is loaded (no unsaved changes)', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    // patchValue + markAsPristine resets dirty state
    expect(component.configForm.pristine).toBe(true);
  });

  it('form is VALID after loading a valid config', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    expect(component.configForm.valid).toBe(true);
  });

  // ─── Required Validators ───────────────────────────────────────────────────

  it('minTemperature control is INVALID when empty (required)', () => {
    component.minTemp.setValue(null);
    expect(component.minTemp.invalid).toBe(true);
    expect(component.minTemp.errors?.['required']).toBeTruthy();
  });

  it('maxTemperature control is INVALID when empty (required)', () => {
    component.maxTemp.setValue(null);
    expect(component.maxTemp.invalid).toBe(true);
    expect(component.maxTemp.errors?.['required']).toBeTruthy();
  });

  it('maxPressure control is INVALID when empty (required)', () => {
    component.maxPressure.setValue(null);
    expect(component.maxPressure.invalid).toBe(true);
    expect(component.maxPressure.errors?.['required']).toBeTruthy();
  });

  it('maxRpm control is INVALID when empty (required)', () => {
    component.maxRpm.setValue(null);
    expect(component.maxRpm.invalid).toBe(true);
    expect(component.maxRpm.errors?.['required']).toBeTruthy();
  });

  // ─── Min/Max Validators ───────────────────────────────────────────────────

  it('minTemperature control is INVALID when value is below -50 (min validator)', () => {
    component.minTemp.setValue(-51);
    expect(component.minTemp.invalid).toBe(true);
    expect(component.minTemp.errors?.['min']).toBeTruthy();
  });

  it('minTemperature control is VALID when value equals -50 (boundary)', () => {
    component.minTemp.setValue(-50);
    expect(component.minTemp.errors?.['min']).toBeFalsy();
  });

  it('maxTemperature control is INVALID when value exceeds 200 (max validator)', () => {
    component.maxTemp.setValue(201);
    expect(component.maxTemp.invalid).toBe(true);
    expect(component.maxTemp.errors?.['max']).toBeTruthy();
  });

  it('maxTemperature control is VALID when value equals 200 (boundary)', () => {
    component.maxTemp.setValue(200);
    expect(component.maxTemp.errors?.['max']).toBeFalsy();
  });

  it('maxPressure control is INVALID when value exceeds 50', () => {
    component.maxPressure.setValue(51);
    expect(component.maxPressure.errors?.['max']).toBeTruthy();
  });

  it('maxRpm control is INVALID when value exceeds 10000', () => {
    component.maxRpm.setValue(10001);
    expect(component.maxRpm.errors?.['max']).toBeTruthy();
  });

  // ─── Cross-field Validator (temperatureRange) ────────────────────────────

  it('form has temperatureRange error when minTemperature equals maxTemperature', () => {
    // Both controls valid individually but fail the group-level cross-field validator
    component.configForm.patchValue({ minTemperature: 90, maxTemperature: 90 });
    expect(component.configForm.errors?.['temperatureRange']).toBeTruthy();
  });

  it('form has temperatureRange error when minTemperature > maxTemperature', () => {
    component.configForm.patchValue({ minTemperature: 95, maxTemperature: 90 });
    expect(component.configForm.errors?.['temperatureRange']).toBeTruthy();
  });

  it('form has NO temperatureRange error when minTemperature < maxTemperature', () => {
    component.configForm.patchValue({ minTemperature: 20, maxTemperature: 90 });
    expect(component.configForm.errors?.['temperatureRange']).toBeFalsy();
  });

  it('form is INVALID overall when cross-field validator fails (even if individual fields are valid)', () => {
    component.configForm.patchValue({
      minTemperature: 90, maxTemperature: 90,  // equal → cross-field fails
      maxPressure: 10, maxRpm: 3000,
    });
    expect(component.configForm.invalid).toBe(true);
  });

  // ─── Form State (pristine/dirty/disabled) ────────────────────────────────

  it('form becomes DIRTY when user changes a value', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    component.minTemp.setValue(25);
    component.minTemp.markAsDirty();

    expect(component.configForm.dirty).toBe(true);
  });

  it('save button is disabled when form is PRISTINE (no changes)', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-save');
    // Form is valid but pristine → save should be disabled
    expect(saveBtn.disabled).toBe(true);
  });

  it('save button is disabled when form is INVALID', () => {
    // No config loaded, form is invalid
    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-save');
    expect(saveBtn.disabled).toBe(true);
  });

  it('save button is enabled when form is VALID and DIRTY', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    // Make a valid change to mark form dirty
    fillValidForm(component);
    fixture.detectChanges();

    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-save');
    expect(saveBtn.disabled).toBe(false);
  });

  // ─── onSubmit() ────────────────────────────────────────────────────────────

  it('onSubmit() calls machineService.saveConfig() with form values', () => {
    fillValidForm(component);

    component.onSubmit();

    expect(machineServiceMock.saveConfig).toHaveBeenCalledOnce();
    const calledWith = machineServiceMock.saveConfig.mock.calls[0][0];
    expect(calledWith.minTemperature).toBe(20);
    expect(calledWith.maxTemperature).toBe(90);
  });

  it('onSubmit() calls notificationService.success() on successful save', () => {
    fillValidForm(component);

    component.onSubmit();

    expect(notificationMock.success).toHaveBeenCalledWith('Configuration saved successfully!');
  });

  it('onSubmit() calls dashboardState.updateConfig() after successful save', () => {
    fillValidForm(component);

    component.onSubmit();

    expect(dashboardStateMock.updateConfig).toHaveBeenCalled();
  });

  it('onSubmit() marks form PRISTINE after successful save', () => {
    fillValidForm(component);

    component.onSubmit();

    expect(component.configForm.pristine).toBe(true);
  });

  it('onSubmit() does nothing when form is INVALID', () => {
    // Form is invalid (empty required fields) — submit should be a no-op
    component.onSubmit();

    expect(machineServiceMock.saveConfig).not.toHaveBeenCalled();
  });

  it('onSubmit() does nothing when isSaving is already true (prevents duplicate requests)', () => {
    fillValidForm(component);
    component.isSaving = true;

    component.onSubmit();

    expect(machineServiceMock.saveConfig).not.toHaveBeenCalled();
  });

  // ─── onReset() ─────────────────────────────────────────────────────────────

  it('onReset() re-patches form from currentConfig$ and marks pristine', () => {
    currentConfig$.next(mockConfig);
    fixture.detectChanges();

    // User makes a change
    component.minTemp.setValue(99);
    component.minTemp.markAsDirty();
    expect(component.configForm.dirty).toBe(true);

    component.onReset();

    // After reset form should be pristine (re-patched)
    expect(component.configForm.pristine).toBe(true);
  });

  // ─── Architecture Rule Verification ────────────────────────────────────────

  it('component does NOT make HTTP calls directly — delegates to MachineService', () => {
    // The component class should not inject HttpClient
    // (If it did, TestBed would throw without provideHttpClient())
    // This test passes if the component was created successfully without HTTP providers
    expect(component).toBeTruthy();
  });

  it('component does NOT store MachineConfig state — config comes from service', () => {
    // The component should not have a `config` or `machineConfig` property
    // Config arrives via currentConfig$ Observable and is used to patch the form
    expect((component as any).config).toBeUndefined();
    expect((component as any).machineConfig).toBeUndefined();
  });
});
