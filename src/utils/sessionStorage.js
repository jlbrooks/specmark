export const SESSION_STORAGE_KEY = 'markdown_annotator_session_v1'

export function readSessionStorage() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) {
      return null
    }
    const parsed = JSON.parse(stored)
    if (!parsed?.markdown || typeof parsed.markdown !== 'string') {
      return null
    }
    return parsed
  } catch (err) {
    console.warn('Failed to read session storage:', err)
    return null
  }
}

export function writeSessionStorage(payload) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('Failed to write session storage:', err)
  }
}
