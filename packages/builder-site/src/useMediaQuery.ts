import { useSyncExternalStore } from 'react';

export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => list.removeEventListener('change', listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
