/**
 * SERVICE - NotificationService
 *
 * Responsibility: Cross-component toast notifications.
 *
 * A "toast" is a small pop-up message (e.g. "Config saved!", "Alert acknowledged").
 * Any component or service can PUSH a notification; the NotificationComponent
 * subscribes to display them.
 *
 * RxJS SUBJECT USED: plain Subject<Notification>
 *
 * Why plain Subject (not BehaviorSubject)?
 *   - Notifications are events, not state. There is no "current notification"
 *     sitting around — a notification fires once and disappears.
 *   - If a new subscriber joins AFTER a notification was sent, they should
 *     NOT receive that old notification. BehaviorSubject would replay it.
 *
 * This is the classic EVENT BUS pattern using Subject.
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
   * NotificationComponent subscribes to this to display toasts.
   */
  readonly notifications$: Observable<AppNotification> = this.notificationSource$.asObservable();

  // ─── Convenience methods — called by components and services ──────────────

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
