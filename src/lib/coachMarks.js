const STORAGE_KEY = 'specmark_coach_marks_seen'

function getSeenMarks() {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function hasSeenMark(id) {
  return getSeenMarks().includes(id)
}

export function markAsSeen(id) {
  if (typeof window === 'undefined') return
  try {
    const seen = getSeenMarks()
    if (!seen.includes(id)) {
      seen.push(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
    }
  } catch {
    // ignore storage errors
  }
}

export function hasVisitedBefore() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('specmark_has_visited') === 'true'
}

export function setHasVisited() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('specmark_has_visited', 'true')
  } catch {
    // ignore
  }
}
