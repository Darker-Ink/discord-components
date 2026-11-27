import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useFocusLock as useFocusLayersLock } from '../focus-layers/useFocusLock';

type ReturnTarget = HTMLElement | { element: HTMLElement; focus: () => void } | null;

export interface FocusLockOptions {
  returnRef?: RefObject<ReturnTarget>;
  disable?: boolean;
  disableReturn?: boolean;
  attachTo?: HTMLElement | Document;
}

interface LockEntry {
  containerElementRef: RefObject<HTMLElement | null>;
  disabledRef: RefObject<boolean>;
  sequence: number;
}

let nextSequence = 0;
const activeLocks = new Set<LockEntry>();
// focus-layers' own focus return is replaced by the one below, which knows about nested locks.
const DISABLED_RETURN = { current: true };

const unwrap = (target: ReturnTarget | undefined) =>
  target != null && 'element' in target ? target.element : (target ?? null);

// Traps focus inside the container while mounted (unless disabled) and, when it unmounts, returns
// focus to `returnRef` or to whatever was focused before, unless focus already moved somewhere
// that owns it (a lock opened later, or an element outside).
export const useFocusLock = (containerRef: RefObject<HTMLElement | null>, options: FocusLockOptions = {}) => {
  const { returnRef, disable = false, disableReturn = false } = options;
  const previousActiveElement = useRef<Element | null>(document.activeElement);
  const containerElementRef = useRef<HTMLElement | null>(null);
  const returnRefRef = useRef(returnRef);
  const disabledRef = useRef(disable);
  const disableReturnRef = useRef(disableReturn);

  useLayoutEffect(() => {
    if (containerRef.current != null) containerElementRef.current = containerRef.current;
    returnRefRef.current = returnRef;
    disabledRef.current = disable;
    disableReturnRef.current = disableReturn;
  });

  useLayoutEffect(() => {
    const previous = previousActiveElement.current;
    const entry: LockEntry | null =
      containerElementRef.current == null ? null : { containerElementRef, disabledRef, sequence: nextSequence++ };
    if (entry != null) activeLocks.add(entry);
    return () => {
      if (!disabledRef.current && !disableReturnRef.current) {
        const returnTarget = unwrap(returnRefRef.current?.current);
        if ((returnTarget ?? previous) != null) {
          let shouldReturn = true;
          const ownerDocument = containerElementRef.current?.ownerDocument ?? document;
          const activeElement = ownerDocument.activeElement;
          const laterLocksWithFocus =
            activeElement != null && entry != null
              ? Array.from(activeLocks).filter(
                  ({ containerElementRef: ref, disabledRef: disabled, sequence }) =>
                    !disabled.current && sequence > entry.sequence && ref.current?.contains(activeElement) === true,
                )
              : [];
          const focusOnBody = activeElement == null || activeElement === ownerDocument.body;
          const focusInside = activeElement != null && containerElementRef.current?.contains(activeElement) === true;
          if (returnTarget == null) {
            shouldReturn =
              focusOnBody || focusInside || laterLocksWithFocus.length > 0 || containerElementRef.current == null;
          }
          if (shouldReturn) {
            requestAnimationFrame(() => {
              const target = returnRefRef.current?.current ?? null;
              const targetElement = unwrap(target);
              const element = (targetElement?.isConnected ? targetElement : previous) as HTMLElement | null;
              const currentActive = (containerElementRef.current?.ownerDocument ?? document).activeElement;
              const wasOwned = focusOnBody || focusInside;
              const anotherLockOwnsFocus = Array.from(activeLocks).some((lock) => {
                if (lock === entry || currentActive == null) return false;
                if (lock.containerElementRef.current?.contains(currentActive) !== true) return false;
                const isOlder = entry != null && lock.sequence < entry.sequence;
                const containsTarget = element != null && lock.containerElementRef.current?.contains(element) === true;
                return !wasOwned || !isOlder || !containsTarget;
              });
              if (
                anotherLockOwnsFocus ||
                element == null ||
                !element.isConnected ||
                laterLocksWithFocus.some((lock) => activeLocks.has(lock) && !lock.disabledRef.current)
              ) {
                return;
              }
              if (target != null && 'element' in target && targetElement?.isConnected) target.focus();
              else if (targetElement?.isConnected) element.focus();
              else element.focus({ preventScroll: true });
            });
          }
        }
      }
      if (entry != null) activeLocks.delete(entry);
    };
    // Runs once: the lock lives as long as the component.
  }, []);

  const attachToRef = useRef<HTMLElement | Document>(document);
  useLayoutEffect(() => {
    attachToRef.current = options.attachTo ?? containerRef.current?.ownerDocument ?? document;
  });
  const disabledContainerRef = useRef<HTMLElement | null>(null);
  useFocusLayersLock((disable ? disabledContainerRef : containerRef) as RefObject<HTMLElement>, {
    disable,
    disableReturnRef: DISABLED_RETURN,
    attachToRef,
  });
};
