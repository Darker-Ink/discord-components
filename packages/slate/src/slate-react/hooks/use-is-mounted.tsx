// @ts-nocheck -- vendored slate-react 0.91.11, written against an older TypeScript and @types/react.
import { useEffect, useRef } from 'react'

export function useIsMounted() {
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef.current
}
