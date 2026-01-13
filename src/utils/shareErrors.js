const CONTEXT_MESSAGES = {
  create: {
    invalid_request: 'Add some markdown before creating a share.',
    content_too_large: 'This document is too large to share (max 500KB). Try trimming it or use a Share URL instead.',
    server_error: 'The share service had a problem creating your code. Please try again.',
  },
  load: {
    invalid_code: 'That share code looks invalid. Use a 6-character code like X7KM3P.',
    not_found: 'We couldn\'t find that share code. It may have expired after 7 days.',
    server_error: 'The share service is having trouble loading that code. Please try again.',
  },
}

const BASE_MESSAGES = {
  network: 'Network error. Check your connection and try again.',
  server_error: 'The share service is having trouble. Please try again.',
  unknown: 'Something went wrong. Please try again.',
}

export function getShareErrorMessage(code, context) {
  if (context && CONTEXT_MESSAGES[context]?.[code]) {
    return CONTEXT_MESSAGES[context][code]
  }
  return BASE_MESSAGES[code] || BASE_MESSAGES.unknown
}

export function parseShareErrorResponse({ data, status, context }) {
  const code = data?.error || data?.code
  if (code) {
    return { code, message: getShareErrorMessage(code, context) }
  }
  if (status >= 500) {
    return { code: 'server_error', message: getShareErrorMessage('server_error', context) }
  }
  return { code: 'unknown', message: getShareErrorMessage('unknown', context) }
}

export function parseShareNetworkError(context) {
  return { code: 'network', message: getShareErrorMessage('network', context) }
}
