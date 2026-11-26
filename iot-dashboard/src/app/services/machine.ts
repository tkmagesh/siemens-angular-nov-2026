/**
 * SERVICE - MachineService
 *
 * Responsibility: ALL HTTP communication related to machines and their configs.
 *
 * WHY A SERVICE?
 * Angular services are singletons — one instance shared across the whole app.
 * Putting HTTP calls here means:
 *   - Components don't know HOW data is fetched (they just call methods)
 *   - If the API changes, you fix it in ONE place
 *   - Easy to mock in unit tests
 *
 * WHAT THIS SERVICE DOES:
 *   - GET /machines           → list all machines
 *   - GET /machines/:id       → get one machine
 *   - GET /machines?name_like → search machines by name
 *   - GET /configs?machineId  → get config for a machine
 *   - PUT /configs/:id        → save updated config
 *
 * API BASE: http://localhost:3000  (json-server)
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Machine, MachineConfig } from '../models/machine.model';

@Injectable({ providedIn: 'root' })
export class MachineService {

  // inject() is the modern Angular way to get dependencies (replaces constructor injection)
  private http = inject(HttpClient);

  private baseUrl = 'http://localhost:3000';

  // ─── Machines ──────────────────────────────────────────────────────────────

  /**
   * Fetch all machines from the server.
   * Returns an Observable — the HTTP call hasn't happened yet;
   * it fires when someone subscribes (or uses the async pipe in a template).
   */
  getAllMachines(): Observable<Machine[]> {
    return this.http.get<Machine[]>(`${this.baseUrl}/machines`);
  }

  /**
   * Search machines by name fragment.
   * json-server supports ?name_like= for partial string matching.
   * RxJS DEMO: this observable is consumed with debounceTime + switchMap
   * in DashboardStateService to implement the search box.
   */
  searchMachines(term: string): Observable<Machine[]> {
    const params = new HttpParams().set('name_like', term);
    return this.http.get<Machine[]>(`${this.baseUrl}/machines`, { params });
  }

  /**
   * Fetch a single machine by its ID.
   */
  getMachineById(id: number): Observable<Machine> {
    return this.http.get<Machine>(`${this.baseUrl}/machines/${id}`);
  }

  // ─── Configs ───────────────────────────────────────────────────────────────

  /**
   * Fetch the threshold config for a specific machine.
   * json-server returns an array when filtering, so we get MachineConfig[].
   * The caller (DashboardStateService) picks index [0].
   */
  getConfigForMachine(machineId: number): Observable<MachineConfig[]> {
    const params = new HttpParams().set('machineId', machineId);
    return this.http.get<MachineConfig[]>(`${this.baseUrl}/configs`, { params });
  }

  /**
   * Save updated config back to json-server.
   * PUT replaces the entire document (json-server convention).
   * RxJS DEMO: called via exhaustMap in MachineConfigFormComponent so that
   * rapid "Save" clicks don't send duplicate requests.
   */
  saveConfig(config: MachineConfig): Observable<MachineConfig> {
    return this.http.put<MachineConfig>(`${this.baseUrl}/configs/${config.id}`, config);
  }
}
