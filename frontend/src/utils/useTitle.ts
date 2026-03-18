import { useEffect } from 'react'

const BASE = 'Extropians'

export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : BASE
    return () => { document.title = BASE }
  }, [title])
}
