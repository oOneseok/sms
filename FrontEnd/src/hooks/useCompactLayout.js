import { useEffect, useState } from 'react'

const DEFAULT_QUERY = '(max-width: 1100px), (max-height: 800px)'

export function useCompactLayout(query = DEFAULT_QUERY) {
  const getMatches = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
  }

  const [isCompact, setIsCompact] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mql = window.matchMedia(query)
    const onChange = (event) => setIsCompact(event.matches)

    // Safari/old Chrome fallback
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
    else mql.addListener(onChange)

    setIsCompact(mql.matches)

    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return isCompact
}
