/**
 * UNIT TESTS — NotificationService
 *
 * CONCEPT UNDER TEST: RxJS plain Subject as an event bus.
 *
 * Key behaviours to verify:
 *   1. Each helper method (success/error/warning/info) emits the right shape.
 *   2. A plain Subject does NOT replay past emissions to late subscribers —
 *      this distinguishes it from BehaviorSubject and ReplaySubject.
 *   3. Multiple simultaneous subscribers all receive the same notification.
 *
 * TESTING PATTERN — Arrange / Act / Assert (AAA):
 *   Arrange: set up the service and subscribe to capture results.
 *   Act:     call the method under test.
 *   Assert:  check that the captured result matches expectations.
 *
 * No HTTP, no timers, no mocks needed — this service has zero external
 * dependencies, making it the simplest service to test.
 */

import { TestBed } from '@angular/core/testing';
import { NotificationService, AppNotification } from './notification';

describe('NotificationService', () => {

  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── success() ──────────────────────────────────────────────────────────────

  describe('success()', () => {

    it('emits a notification with type "success" and default duration 3000ms', () => {
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      service.success('Config saved!');

      expect(received).toEqual({ message: 'Config saved!', type: 'success', duration: 3000 });
    });

    it('allows overriding the duration', () => {
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      service.success('Done', 10_000);

      expect(received?.duration).toBe(10_000);
    });
  });

  // ─── error() ────────────────────────────────────────────────────────────────

  describe('error()', () => {

    it('emits a notification with type "error" and default duration 5000ms', () => {
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      service.error('Save failed!');

      // Error notifications stay on screen longer (5s) than success (3s)
      expect(received).toEqual({ message: 'Save failed!', type: 'error', duration: 5000 });
    });
  });

  // ─── warning() ──────────────────────────────────────────────────────────────

  describe('warning()', () => {

    it('emits a notification with type "warning" and default duration 4000ms', () => {
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      service.warning('High temperature detected');

      expect(received).toEqual({ message: 'High temperature detected', type: 'warning', duration: 4000 });
    });
  });

  // ─── info() ─────────────────────────────────────────────────────────────────

  describe('info()', () => {

    it('emits a notification with type "info" and default duration 3000ms', () => {
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      service.info('Machine restarted');

      expect(received).toEqual({ message: 'Machine restarted', type: 'info', duration: 3000 });
    });
  });

  // ─── Subject vs BehaviorSubject behaviour ───────────────────────────────────

  describe('Subject (event bus) behaviour', () => {

    it('late subscribers do NOT receive past notifications', () => {
      /**
       * This test demonstrates the key difference between Subject and BehaviorSubject.
       * A plain Subject only delivers to subscribers who were listening at the moment
       * of emission. If you subscribe AFTER the notification was sent, you get nothing.
       *
       * BehaviorSubject would deliver the last value to late subscribers.
       * ReplaySubject(n) would replay the last n values.
       * Subject delivers only future values — perfect for fire-and-forget events.
       */

      // ACT: emit BEFORE subscribing
      service.success('old notification');

      // ARRANGE: subscribe after the notification was already sent
      let received: AppNotification | undefined;
      service.notifications$.subscribe(n => received = n);

      // ASSERT: late subscriber gets nothing
      expect(received).toBeUndefined();
    });

    it('multiple subscribers all receive the same notification', () => {
      /**
       * Subject is a multicast source: every active subscriber receives
       * each emission. This is used to decouple the sender from receivers —
       * the sender doesn't need to know how many components are listening.
       */
      const results: AppNotification[] = [];

      // Two different components subscribe at the same time
      service.notifications$.subscribe(n => results.push(n));
      service.notifications$.subscribe(n => results.push(n));

      service.info('broadcast message');

      // Both subscribers received the notification
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(results[1]);
    });

    it('emitting multiple notifications fires subscribers once per emission', () => {
      const received: AppNotification[] = [];
      service.notifications$.subscribe(n => received.push(n));

      service.success('First');
      service.error('Second');
      service.info('Third');

      expect(received).toHaveLength(3);
      expect(received[0].type).toBe('success');
      expect(received[1].type).toBe('error');
      expect(received[2].type).toBe('info');
    });
  });
});
