import { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  window.addEventListener('focus', callback);
  window.addEventListener('blur', callback);
  return () => {
    window.removeEventListener('focus', callback);
    window.removeEventListener('blur', callback);
  };
};

/** Whether the document has focus, like the client's window store. */
export const useWindowFocused = () =>
  useSyncExternalStore(
    subscribe,
    () => document.hasFocus(),
    () => false,
  );
