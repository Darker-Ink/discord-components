// @ts-nocheck -- vendored slate-react 0.91.11, written against an older TypeScript and @types/react.
import { createContext, useContext } from 'react'

/**
 * A React context for sharing the `focused` state of the editor.
 */

export const FocusedContext = createContext(false)

/**
 * Get the current `focused` state of the editor.
 */

export const useFocused = (): boolean => {
  return useContext(FocusedContext)
}
