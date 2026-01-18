import { API_URL } from '../config'
import { parseShareErrorResponse, parseShareNetworkError } from '../utils/shareErrors'

export async function fetchSharedContent(code) {
  let response
  let data = null

  try {
    response = await fetch(`${API_URL}/api/share/${code}`)
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } catch {
    const errorInfo = parseShareNetworkError('load')
    throw Object.assign(new Error(errorInfo.message), { code: errorInfo.code })
  }

  if (!response.ok) {
    const errorInfo = parseShareErrorResponse({ data, status: response.status, context: 'load' })
    throw Object.assign(new Error(errorInfo.message), { code: errorInfo.code })
  }

  if (!data?.markdown || typeof data.markdown !== 'string') {
    throw Object.assign(new Error('Unexpected response from share service.'), { code: 'server_error' })
  }

  return { markdown: data.markdown, shareCode: code.toUpperCase() }
}
