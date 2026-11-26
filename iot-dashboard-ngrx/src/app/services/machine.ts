/**
 * SERVICE - MachineService
 *
 * Responsibility: ALL HTTP communication related to machines and their configs.
 *
 * IN NGRX, THIS SERVICE IS CALLED ONLY FROM EFFECTS (machines.effects.ts, alerts.effects.ts).
 * Components never inject this service directly — they dispatch actions instead.
 *
 * VS BehaviorSubject version:
 *   Before: Components injected MachineService and called methods directly.
 *   Now:    Components dispatch MachinesActions.loadMachines().
 *           MachinesEffects listens, calls this service, dispatches the result.
 *           Components never know HTTP happened.
 *
 * WHY A SERVICE STILL EXISTS:
 *   Effects need something to call for HTTP. This service is that "HTTP adapter".
 *   It has no state, no subjects — just observable HTTP calls.
 *   This makes it trivially testable and easy to swap (e.g. replace json-server with a real API).
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

  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000';

  // ─── Machines ──────────────────────────────────────────────────────────────

  /**
   * Fetch all machines from the server.
   * Called by MachinesEffects.loadMachines$ on the loadMachines action.
   */
  getAllMachines(): Observable<Machine[]> {
    return this.http.get<Machine[]>(`${this.baseUrl}/machines`);
  }

  /**
   * Search machines by name fragment.
   * Called by MachinesEffects.searchMachines$ — the debounce/switchMap live in
   * the effect, not here. This method is intentionally simple.
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
   * MachinesEffects picks index [0].
   */
  getConfigForMachine(machineId: number): Observable<MachineConfig[]> {
    const params = new HttpParams().set('machineId', machineId);
    return this.http.get<MachineConfig[]>(`${this.baseUrl}/configs`, { params });
  }

  /**
   * Save updated config back to json-server.
   * PUT replaces the entire document (json-server convention).
   * Called by MachinesEffects.saveConfig$ — exhaustMap lives in the effect.
   */
  saveConfig(config: MachineConfig): Observable<MachineConfig> {
    return this.http.put<MachineConfig>(`${this.baseUrl}/configs/${config.id}`, config);
  }
}
