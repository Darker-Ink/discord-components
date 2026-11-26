import { useLayoutEffect, useState } from 'react';

// Masks are defined once, on demand: components register the ids they use and MaskLibrary renders those.
const registered = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: string[] = [];

const notify = () => {
  snapshot = Array.from(registered);
  for (const listener of listeners) listener();
};

const getSnapshot = () => snapshot;

export const registerMasks = (ids: Iterable<string>) => {
  let changed = false;
  for (const id of ids) {
    if (!registered.has(id)) {
      registered.add(id);
      changed = true;
    }
  }
  if (changed) notify();
};

export const useRegisterMask = (id: string | null | undefined) => {
  useLayoutEffect(() => {
    if (id != null && !registered.has(id)) {
      registered.add(id);
      notify();
    }
  }, [id]);
};

export const useRegisteredMaskIds = () => {
  const [ids, setIds] = useState(getSnapshot);
  useLayoutEffect(() => {
    const listener = () => setIds(getSnapshot());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return ids;
};
