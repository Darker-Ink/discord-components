import { useContext, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useManaContext } from '../ManaContext';
import styles from './Spinner.module.css';

export const SpinnerTypes = {
  WANDERING_CUBES: 'wanderingCubes',
  CHASING_DOTS: 'chasingDots',
  PULSING_ELLIPSIS: 'pulsingEllipsis',
  SPINNING_CIRCLE: 'spinningCircle',
  SPINNING_CIRCLE_SIMPLE: 'spinningCircleSimple',
  LOW_MOTION: 'lowMotion',
} as const;

export type SpinnerType = (typeof SpinnerTypes)[keyof typeof SpinnerTypes];

export interface SpinnerProps extends HTMLAttributes<HTMLElement> {
  type?: SpinnerType;
  animated?: boolean;
  itemClassName?: string;
}

// The cube and dot animations move a lot; with reduced motion they fall back to a gentle pulse.
const reducedMotionType = (type: SpinnerType): SpinnerType => {
  switch (type) {
    case SpinnerTypes.WANDERING_CUBES:
    case SpinnerTypes.CHASING_DOTS:
      return SpinnerTypes.LOW_MOTION;
    default:
      return type;
  }
};

export const Spinner = ({
  type = SpinnerTypes.WANDERING_CUBES,
  animated = true,
  className,
  itemClassName,
  ...props
}: SpinnerProps) => {
  const { i18n } = useManaContext();
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const resolvedType = reducedMotion.enabled ? reducedMotionType(type) : type;
  const label = props['aria-label'] ?? i18n.SPINNER_LOADING_LABEL;

  if (resolvedType === SpinnerTypes.SPINNING_CIRCLE || resolvedType === SpinnerTypes.SPINNING_CIRCLE_SIMPLE) {
    return (
      <div
        className={clsx(styles.spinner, styles[resolvedType], className, { [styles.stopAnimation]: !animated })}
        role="img"
        {...props}
        aria-label={label}
      >
        <div className={clsx(styles.spinningCircleInner, styles.inner)}>
          <svg className={styles.circular} viewBox="25 25 50 50">
            {resolvedType === SpinnerTypes.SPINNING_CIRCLE && (
              <>
                <circle className={clsx(styles.path, styles.path3, itemClassName)} cx="50" cy="50" r="20" />
                <circle className={clsx(styles.path, styles.path2, itemClassName)} cx="50" cy="50" r="20" />
              </>
            )}
            <circle className={clsx(styles.path, itemClassName)} cx="50" cy="50" r="20" />
          </svg>
        </div>
      </div>
    );
  }

  const itemClassNames = clsx(styles.item, itemClassName);
  return (
    <span
      className={clsx(styles.spinner, className, { [styles.stopAnimation]: !animated })}
      role="img"
      aria-label={label}
      {...props}
    >
      <span className={clsx(styles.inner, styles[resolvedType])}>
        <span className={itemClassNames} />
        <span className={itemClassNames} />
        {resolvedType === SpinnerTypes.PULSING_ELLIPSIS || resolvedType === SpinnerTypes.LOW_MOTION ? (
          <span className={itemClassNames} />
        ) : null}
      </span>
    </span>
  );
};

Spinner.displayName = 'Spinner';
Spinner.Type = SpinnerTypes;
