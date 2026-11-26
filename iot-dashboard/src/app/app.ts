/**
 * ROOT COMPONENT - App
 *
 * The root component is the entry point of the Angular application.
 * It composes all the feature components into one page layout.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │  Header (title + alert badge)                   │
 *   ├──────────────┬──────────────────────────────────┤
 *   │ MachineList  │  SensorDashboard                 │
 *   │              │  MachineConfigForm               │
 *   ├──────────────┴──────────────────────────────────┤
 *   │  AlertPanel (full width)                        │
 *   └─────────────────────────────────────────────────┘
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MachineListComponent } from './components/machine-list/machine-list';
import { SensorDashboardComponent } from './components/sensor-dashboard/sensor-dashboard';
import { AlertPanelComponent } from './components/alert-panel/alert-panel';
import { MachineConfigFormComponent } from './components/machine-config-form/machine-config-form';
import { AlertService } from './services/alert';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MachineListComponent,
    SensorDashboardComponent,
    AlertPanelComponent,
    MachineConfigFormComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private alertService = inject(AlertService);

  ngOnInit(): void {
    // Load alert history from json-server on startup
    this.alertService.loadAlerts();
  }
}
