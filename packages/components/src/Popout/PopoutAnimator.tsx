import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import type { ReferencePosition } from '../Layer';
import styles from './PopoutAnimator.module.css';

const PopoutAnimatorTypes = { TRANSLATE: 1, SCALE: 2, FADE: 3 } as const;

export type PopoutAnimatorType = (typeof PopoutAnimatorTypes)[keyof typeof PopoutAnimatorTypes];

const TYPE_CLASS_NAMES = Object.freeze({
  [PopoutAnimatorTypes.TRANSLATE]: styles.translate,
  [PopoutAnimatorTypes.SCALE]: styles.scale,
  [PopoutAnimatorTypes.FADE]: styles.fade,
});

const POSITION_CLASS_NAMES = Object.freeze({
  top: styles.animatorTop,
  bottom: styles.animatorBottom,
  left: styles.animatorLeft,
  right: styles.animatorRight,
  center: styles.animatorCenter,
  window_center: styles.animatorCenter,
});

export interface PopoutAnimatorProps {
  position: ReferencePosition | null | undefined;
  type: PopoutAnimatorType;
  children?: ReactNode;
}

// CSS enter animation for popouts: starts offset/scaled towards the target and settles once the
// layer has been positioned. Reduced motion always fades.
export const PopoutAnimator = ({ position, type, children }: PopoutAnimatorProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const resolvedType = reducedMotion.enabled ? PopoutAnimatorTypes.FADE : type;
  const [didRender, setDidRender] = useState(position != null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animating, setAnimating] = useState(true);
  // The transitions take at most 200ms; after that the content is laid out without transforms.
  useLayoutEffect(() => {
    setTimeout(() => {
      setAnimating(false);
    }, 200);
  }, []);
  useEffect(
    () => () => {
      if (timeout.current != null) clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(() => {
    if (position == null) return;
    if (timeout.current != null) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      timeout.current = null;
      setDidRender(true);
    }, 10);
  }, [position]);
  return (
    <div
      data-popout-animating={animating}
      className={clsx(position != null ? POSITION_CLASS_NAMES[position] : null, {
        [TYPE_CLASS_NAMES[resolvedType]]: position != null,
        [styles.didRender]: didRender,
      })}
    >
      {children}
    </div>
  );
};

PopoutAnimator.displayName = 'PopoutAnimator';
PopoutAnimator.Types = PopoutAnimatorTypes;
