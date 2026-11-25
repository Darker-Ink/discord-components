import { useCallback, type Ref, type RefCallback } from 'react';

// One callback ref that forwards the node to every given ref.
export const useMergeRefs = <T>(...refs: (Ref<T> | null | undefined)[]): RefCallback<T> =>
  useCallback(
    (node: T | null) => {
      refs.forEach((ref) => {
        if (ref == null) return;
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
      });
    },
    // The refs themselves are the dependencies, however many there are.
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
    refs,
  );
