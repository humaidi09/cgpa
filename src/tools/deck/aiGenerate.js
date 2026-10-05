// Ask the backend to generate deck content from a topic.
//
// The Gemini key lives only on the server, so the browser just posts a topic and
// gets back a ready { cover, sections, closing } object the wizard drops into
// its content state. The timeout is generous because the API is on a free tier
// that cold-starts in ~50s; a first call after idle can be slow.

const API_BASE = (import.meta.env.VITE_API_URL || 'https://portfolio-api-y7vm.onrender.com').replace(/\/+$/, '')
const TIMEOUT_MS = 60000

/**
 * Generate a deck from a topic. Resolves to the content object on success.
 * Throws an Error whose message is safe to show the user (the server sends a
 * friendly one; network/timeout get their own).
 */
export async function generateDeck({ topic, audience = '', detail = 'medium' }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/api/deck-ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ topic, audience, detail }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Generation failed. Please try again.')
    if (!data?.content?.cover || !Array.isArray(data?.content?.sections)) {
      throw new Error('The AI returned an unexpected result. Please try again.')
    }
    return data.content
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('That took too long — the server may be waking up. Try once more.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
