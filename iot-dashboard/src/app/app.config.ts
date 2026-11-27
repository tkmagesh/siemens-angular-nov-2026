/**
 * APP CONFIG - app.config.ts
 *
 * Angular 17+ uses a function-based bootstrap model.
 * Instead of an NgModule, we pass a config object to bootstrapApplication().
 *
 * provideHttpClient() — registers Angular's HttpClient (used by services
 *                       to talk to json-server via HTTP)
 * withFetch()         — uses the browser's native Fetch API under the hood
 *                       instead of XMLHttpRequest (faster, modern default)
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ]
};
