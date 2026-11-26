/**
 * SERVICE - NotificationService
 *
 * Responsibility: Cross-component toast notifications.
 *
 * IN NGRX, THIS SERVICE IS CALLED ONLY FROM EFFECTS.
 * Components never inject it directly — Effects dispatch actions whose
 * side effects (showing a toast) are handled here.
 *
 * VS BehaviorSubject version:
 *   Before: Components injected NotificationService and called success()/error() directly.
 *   Now:    Effects handle side effects. After a successful save, the effect can call
 *           this service to show a toast, keeping the component free of notification logic.
 *
 * NOTE: NotificationService is intentionally kept as a plain Subject-based service
 * rather than being modelled in NgRx state. Toast notifications are transient UI events —
 * there is no meaningful "current notification" to persist in the store. This demonstrates
 * that NOT everything needs to be in NgRx; use it for state that benefits from
 * predictability and DevTools visibility, not for one-shot UI events.
 *
 * RxJS SUBJECT USED: plain Subject<AppNotification>
 *   - Notifications are events, not state.
 *   - Late subscribers should NOT receive old notifications.
 */

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  message: string;
  type: NotificationType;
  duration?: number; // ms — how long to show before auto-dismiss (default 3000)
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  /**
   * Subject: the event bus.
   * Private — only NotificationService decides what goes on the bus.
   */
  private notificationSource$ = new Subject<AppNotification>();

  /**
   * Public read-only stream.
   * A notification display component subscribes to this to show toasts.
   */
  readonly notifications$: Observable<AppNotification> = this.notificationSource$.asObservable();

  // ─── Convenience methods — called by Effects ──────────────────────────────

  success(message: string, duration = 3000): void {
    this.notificationSource$.next({ message, type: 'success', duration });
  }

  error(message: string, duration = 5000): void {
    this.notificationSource$.next({ message, type: 'error', duration });
  }

  warning(message: string, duration = 4000): void {
    this.notificationSource$.next({ message, type: 'warning', duration });
  }

  info(message: string, duration = 3000): void {
    this.notificationSource$.next({ message, type: 'info', duration });
  }
}
