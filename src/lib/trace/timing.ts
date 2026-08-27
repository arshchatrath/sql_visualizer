// Shared pacing so the trace panel's staged reveal and the results panel's
// fade-in stay in sync without the two components needing to talk to each
// other directly. Purely a presentation cadence — the elapsed time shown
// to the user is always the real performance.now() measurement, untouched
// by any of this.
export const TRACE_BASE_DELAY_MS = 100
export const TRACE_STAGGER_MS = 130
export const RESULTS_FOLLOW_DELAY_MS = 180

export function traceRevealDurationMs(stageCount: number): number {
  return TRACE_BASE_DELAY_MS + stageCount * TRACE_STAGGER_MS
}
