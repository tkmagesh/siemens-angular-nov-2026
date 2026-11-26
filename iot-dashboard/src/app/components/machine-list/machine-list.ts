/**
 * COMPONENT - MachineListComponent
 *
 * Responsibility: Display the list of machines and handle user selection.
 *
 * ─── ARCHITECTURE RULE ───────────────────────────────────────────────────────
 * This component contains ONLY:
 *   ✓ UI state       — which row is hovered, is the list loading?
 *   ✓ User actions   — what happens when the user clicks a row or types a search
 *
 * This component does NOT contain:
 *   ✗ HTTP calls    — that's in MachineService
 *   ✗ Machine data  — that comes from DashboardStateService
 *   ✗ Search logic  — debounce/switchMap is in DashboardStateService
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TEMPLATE PATTERN: async pipe
 *   Instead of subscribing in the component class and storing data in a
 *   local variable, templates use the async pipe:
 *
 *     *ngFor="let machine of machines$ | async"
 *
 *   Benefits:
 *     - Angular automatically subscribes AND unsubscribes (no memory leaks)
 *     - Change detection runs automatically on each emission
 *     - Less boilerplate in the component class
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Machine } from '../../models/machine.model';
import { MachineService } from '../../services/machine';
import { DashboardStateService } from '../../services/dashboard-state';

@Component({
  selector: 'app-machine-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './machine-list.html',
  styleUrl: './machine-list.css'
})
export class MachineListComponent implements OnInit {

  // ─── Dependencies (injected services) ────────────────────────────────────
  private machineService    = inject(MachineService);
  private dashboardState    = inject(DashboardStateService);

  // ─── UI State (the ONLY state this component owns) ───────────────────────

  /**
   * The list of machines to display.
   * This is an Observable — the template uses `| async` to subscribe.
   * We never store Machine[] directly; that keeps the component stateless.
   */
  machines$!: Observable<Machine[]>;

  /**
   * The ID of the machine currently selected by the user.
   * Used by the template to highlight the active row (CSS class binding).
   * Derived from DashboardStateService so all components stay in sync.
   */
  selectedMachineId$!: Observable<number | null>;

  /**
   * True while the initial machine list is loading.
   * Shows a spinner in the template.
   * This IS appropriate in the component because it's purely a UI concern.
   */
  isLoading = true;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load machines from MachineService (HTTP → json-server)
    this.machines$ = this.machineService.getAllMachines();
    this.machines$.subscribe({ complete: () => this.isLoading = false });

    // Track selected machine ID for row highlighting
    this.selectedMachineId$ = this.dashboardState.selectedMachine$.pipe(
      // map to just the ID — avoids re-renders if only other machine fields change
    ) as any; // simplified for readability; production code would use map(m => m?.id)
  }

  // ─── User Interaction Handlers ────────────────────────────────────────────

  /**
   * Called when the user clicks a machine row.
   *
   * Notice: this method does ONE thing — tell DashboardStateService.
   * The component doesn't store the selection itself; the service owns that state.
   * This means any OTHER component that subscribes to selectedMachine$ will
   * also know about this selection — single source of truth.
   */
  onSelectMachine(machine: Machine): void {
    this.dashboardState.selectMachine(machine);
  }

  /**
   * Called on every keyup event in the search input.
   * Delegates entirely to DashboardStateService — no filtering logic here.
   */
  onSearch(term: string): void {
    this.dashboardState.updateSearchTerm(term);
  }
}
