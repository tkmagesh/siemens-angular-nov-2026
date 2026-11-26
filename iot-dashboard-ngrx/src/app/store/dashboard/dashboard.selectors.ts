/**
 * SELECTORS - dashboard.selectors.ts
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.state';

export const selectDashboardState =
  createFeatureSelector<DashboardState>('dashboard');

export const selectSearchTerm = createSelector(
  selectDashboardState,
  state => state.searchTerm
);
