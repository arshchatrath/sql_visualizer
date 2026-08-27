// The one piece of state DATAPULSE deliberately keeps between visits.
//
// Everything about the database is re-seeded per page load — that's the
// point of the lab. But re-teaching someone the same first step every time
// they come back is noise, not honesty, so whether the onboarding hint has
// already done its job is remembered here.
const COACH_KEY = 'datapulse_coach_seen'

/**
 * Only ever set once the hint has actually been *followed* (a table got
 * picked), never merely because it was shown or waved off — Escape is easy
 * to hit by accident, and losing the onboarding permanently to a stray
 * keypress would be a worse trade than showing it one extra time.
 */
export function hasSeenCoach(): boolean {
  try {
    return localStorage.getItem(COACH_KEY) === '1'
  } catch {
    // Private mode / storage disabled: the hint simply shows every visit.
    return false
  }
}

export function markCoachSeen(): void {
  try {
    localStorage.setItem(COACH_KEY, '1')
  } catch {
    // Nothing to do — worst case the hint appears again next time.
  }
}
