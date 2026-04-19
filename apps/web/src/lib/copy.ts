/**
 * copyToClipboard — resilient clipboard write with a textarea fallback.
 *
 * The async Clipboard API only works in secure contexts AND when the document
 * is focused. In some edge cases (Safari private mode, iframe without user
 * activation, partially focused window) it rejects silently. We fall back to
 * a hidden-textarea + `document.execCommand('copy')` to maximize the chance
 * the user sees content in their clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through to execCommand */
    }
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.left = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
