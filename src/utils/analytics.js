function getUmamiConfig() {
  return {
    scriptUrl: import.meta.env.VITE_UMAMI_SCRIPT_URL,
    websiteId: import.meta.env.VITE_UMAMI_WEBSITE_ID,
    hostUrl: import.meta.env.VITE_UMAMI_HOST_URL,
    domains: import.meta.env.VITE_UMAMI_DOMAINS,
  }
}

export function initAnalytics() {
  if (typeof window === 'undefined') return

  const { scriptUrl, websiteId, hostUrl, domains } = getUmamiConfig()
  if (!scriptUrl || !websiteId) return
  if (document.querySelector('script[data-umami]')) return

  const script = document.createElement('script')
  script.defer = true
  script.src = scriptUrl
  script.setAttribute('data-website-id', websiteId)
  script.setAttribute('data-umami', 'true')
  if (hostUrl) script.setAttribute('data-host-url', hostUrl)
  if (domains) script.setAttribute('data-domains', domains)
  document.head.appendChild(script)
}

export function trackEvent(name, props) {
  if (typeof window === 'undefined') return
  if (!window.umami || typeof window.umami.track !== 'function') return
  try {
    if (props) {
      window.umami.track(name, props)
    } else {
      window.umami.track(name)
    }
  } catch (err) {
    console.warn('Analytics event failed:', err)
  }
}
