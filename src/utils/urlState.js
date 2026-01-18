export function normalizeView(view) {
  return view === 'annotate' ? 'annotate' : 'input'
}

export function getViewFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'annotate' ? 'annotate' : 'input'
}

export function updateUrlParams(updates, { replace = false } = {}) {
  const url = new URL(window.location.href)
  Object.entries(updates).forEach(([key, value]) => {
    if (value == null || value === '') {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value)
    }
  })
  if (!url.searchParams.get('view')) {
    url.searchParams.set('view', getViewFromUrl())
  }
  const nextView = url.searchParams.get('view') || 'input'
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({ view: nextView }, '', url)
}
