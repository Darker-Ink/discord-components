import { useCallback, useInsertionEffect, useRef } from 'react';

// A callback with a stable identity that always calls the latest `callback`.
export const useStableCallback = <Args extends unknown[], Result>(callback: (...args: Args) => Result) => {
  const ref = useRef(callback);
  useInsertionEffect(() => {
    ref.current = callback;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
};
