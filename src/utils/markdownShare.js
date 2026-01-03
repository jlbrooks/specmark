export function encodeMarkdownForUrl(markdown) {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(markdown)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeMarkdownFromUrl(param) {
  if (!param) return ''
  let decoded = param
  try {
    decoded = decodeURIComponent(param)
  } catch {
    decoded = param
  }

  const normalized = decoded.replace(/ /g, '+')
  const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/')

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return decoded
  }

  const remainder = base64.length % 4
  if (remainder === 1) {
    return decoded
  }

  const padded = base64 + '='.repeat((4 - remainder) % 4)

  try {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(bytes)
  } catch {
    return decoded
  }
}
