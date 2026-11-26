import { getOpenModalKeys, hasModalOpenNotIn, subscribeToModals } from '../ModalStack/modalStore';

// The keys of the modals that are open. Popouts use it to ignore clicks on (and Escape presses meant
// for) modals opened on top of them. Modals opened with `openModal` are tracked automatically; a
// modal rendered some other way can register itself with `push`/`remove`.
type Listener = () => void;

let externalModalKeys: string[] = [];
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

export const modalStack = {
  push(key: string) {
    if (externalModalKeys.includes(key)) return;
    externalModalKeys = [...externalModalKeys, key];
    emit();
  },
  remove(key: string) {
    if (!externalModalKeys.includes(key)) return;
    externalModalKeys = externalModalKeys.filter((k) => k !== key);
    emit();
  },
  getOpenModalKeys: () => new Set([...getOpenModalKeys(), ...externalModalKeys]),
  // Whether a modal opened that wasn't open when `keys` was taken.
  hasModalOpenedSince: (keys: Set<string>) =>
    hasModalOpenNotIn(keys) || externalModalKeys.some((key) => !keys.has(key)),
  subscribe(listener: Listener) {
    listeners.add(listener);
    const unsubscribeStore = subscribeToModals(listener);
    return () => {
      listeners.delete(listener);
      unsubscribeStore();
    };
  },
};
