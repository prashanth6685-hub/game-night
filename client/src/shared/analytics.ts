// Anonymous analytics abstraction (spec §34).
// Tracks gameplay events without personal information.
// v1: logs in development, no-op in production. Swap in a real sink later.
export type AnalyticsEvent =
  | 'game_opened'
  | 'game_started'
  | 'game_joined'
  | 'game_completed'
  | 'game_abandoned'
  | 'category_selected'
  | 'custom_category_generated'
  | 'language_selected'
  | 'session_start';

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, props ?? {});
  }
  // Future: POST /api/analytics with the event payload.
}
