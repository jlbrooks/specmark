export function hasOverlap(nextRange, annotations) {
  return annotations.some((annotation) => {
    const start = annotation?.range?.start
    const end = annotation?.range?.end
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    return nextRange.start < end && nextRange.end > start
  })
}
