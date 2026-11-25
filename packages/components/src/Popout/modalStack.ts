// The keys of the modals that are open, in order. Popouts use it to ignore clicks on (and Escape
// presses meant for) modals opened on top of them. Modal implementations register themselves here.
type Listener = () => void;

let openModalKeys: string[] = [];
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

export const modalStack = {
  push(key: string) {
    if (openModalKeys.includes(key)) return;
    openModalKeys = [...openModalKeys, key];
    emit();
  },
  remove(key: string) {
    if (!openModalKeys.includes(key)) return;
    openModalKeys = openModalKeys.filter((k) => k !== key);
    emit();
  },
  getOpenModalKeys: () => new Set(openModalKeys),
  // Whether a modal opened that wasn't open when `keys` was taken.
  hasModalOpenedSince: (keys: Set<string>) => openModalKeys.some((key) => !keys.has(key)),
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
