/**
 * COMPONENT - AlertPanelComponent
 *
 * Responsibility: Display active alerts and let the operator acknowledge them.
 *
 * ─── ARCHITECTURE RULE ───────────────────────────────────────────────────────
 * This component contains ONLY:
 *   ✓ UI state    — is the panel expanded or collapsed?
 *   ✓ User action — what happens when "Acknowledge" is clicked
 *
 * This component does NOT contain:
 *   ✗ Alert detection logic — that's in SensorService + AlertService
 *   ✗ HTTP calls            — that's in AlertService
 *   ✗ Alert list state      — that's in AlertService (BehaviorSubject)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Alert } from '../../models/alert.model';
import { AlertService } from '../../services/alert';

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-panel.html',
  styleUrl: './alert-panel.css'
})
export class AlertPanelComponent {

  private alertService = inject(AlertService);

  // ─── Template Observables (from service — not stored locally) ─────────────

  /** Active (unacknowledged) alerts. Template uses async pipe. */
  activeAlerts$: Observable<Alert[]> = this.alertService.activeAlerts$;

  /** Badge count for the panel header. */
  alertCount$: Observable<number> = this.alertService.activeAlertCount$;

  // ─── UI-only State ────────────────────────────────────────────────────────

  /** Whether the alert list is expanded or collapsed. Pure UI concern. */
  isExpanded = true;

  // ─── User Interaction ─────────────────────────────────────────────────────

  /**
   * Called when operator clicks "Acknowledge" on an alert.
   * Delegates entirely to AlertService — no logic here.
   */
  onAcknowledge(alertId: number): void {
    this.alertService.acknowledgeAlert(alertId);
  }

  /** Toggle the panel open/closed. Pure UI concern — stays in component. */
  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
