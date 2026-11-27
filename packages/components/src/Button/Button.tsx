import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { IconSizes, type IconSize } from '@discord-mana/icons';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { FocusRing, type FocusRingProps } from '../FocusRing';
import { useMergeRefs } from '../hooks';
import { useManaContext } from '../ManaContext';
import type { RiveAnimationHandle } from '../Rive';
import { Spinner, SpinnerTypes } from '../Spinner';
import { Text, type TextVariant } from '../Text';
import { isThemeLight } from '../Theme';
import { useButtonGroupContext } from './ButtonGroupContext';
import styles from './Button.module.css';
import toggleStyles from './ToggleButton.module.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'critical-primary'
  | 'critical-secondary'
  | 'active'
  | 'overlay-primary'
  | 'overlay-secondary'
  | 'expressive'
  | 'icon-only'
  | 'color-mix'
  | 'input-accessory'
  | 'togglebutton'
  | 'togglebutton-critical'
  | 'togglebutton-icon-only';

export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonIconPosition = 'start' | 'end';

export interface ButtonIconComponentProps {
  color?: string;
  size?: IconSize;
  style?: CSSProperties;
  className?: string;
}

export interface ButtonRiveIconProps {
  eventTargetRef?: RefObject<HTMLElement | null>;
  style?: CSSProperties;
}

export interface ButtonStickerIconProps<Sticker> {
  size: number | undefined;
  sticker: Sticker;
  isInteracting: boolean;
}

export type ButtonIconSource =
  | ComponentType<ButtonIconComponentProps>
  | { type: 'icon'; asset: ComponentType<ButtonIconComponentProps> }
  | { type: 'rive'; asset: ComponentType<ButtonRiveIconProps>; riveProps?: Record<string, unknown> }
  | { type: 'sticker'; component: ComponentType<ButtonStickerIconProps<never>>; asset: unknown };

const TEXT_VARIANTS: Record<ButtonSize, TextVariant> = {
  xs: 'body-xs/medium',
  sm: 'body-sm/medium',
  md: 'body-md/medium',
};

const ICON_SIZES: Record<ButtonSize, IconSize> = { xs: 'xxs', sm: 'xs', md: 'refresh_sm' };

const STICKER_SIZES: Record<ButtonSize, IconSize> = { xs: 'sm', sm: 'sm', md: 'md' };

const variantClassName = (variant: ButtonVariant, hasText: boolean) => {
  switch (variant) {
    case 'togglebutton':
      return hasText
        ? clsx(toggleStyles.labeled, toggleStyles.toggleButton)
        : clsx(toggleStyles.standard, toggleStyles.toggleButton);
    case 'togglebutton-critical':
      return clsx(toggleStyles.critical, toggleStyles.toggleButton);
    case 'togglebutton-icon-only':
      return clsx(toggleStyles.iconOnly, toggleStyles.toggleButton);
    case 'input-accessory':
      return clsx(styles['input-accessory'], styles['icon-only']);
    default:
      return styles[variant];
  }
};

interface ButtonLoadingWrapperProps {
  children: ReactNode;
  loading: boolean;
  size: ButtonSize;
}

// Keeps the spinner mounted while it fades out after loading ends.
const ButtonLoadingWrapper = ({ children, loading, size }: ButtonLoadingWrapperProps) => {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSpinner, setShowSpinner] = useState(loading);
  if (loading && !showSpinner) setShowSpinner(true);

  useEffect(() => {
    if (timeout.current != null) clearTimeout(timeout.current);
    if (!loading) timeout.current = setTimeout(() => setShowSpinner(false), 500);
    return () => {
      if (timeout.current != null) clearTimeout(timeout.current);
    };
  }, [loading]);

  return (
    <div className={styles.buttonChildrenWrapper}>
      {children}
      {showSpinner && (
        <div className={clsx(styles.spinnerWrapper, { [styles.fadeIn]: loading, [styles.fadeOut]: !loading })}>
          <Spinner
            type={SpinnerTypes.PULSING_ELLIPSIS}
            className={clsx(styles.spinner, styles[`spinner-${size}`])}
            itemClassName={styles.spinnerItem}
          />
        </div>
      )}
    </div>
  );
};

ButtonLoadingWrapper.displayName = 'ButtonLoadingWrapper';

interface ExpressiveLayersProps {
  hasReducedMotion: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  isLightMode: boolean;
  disabled: boolean | undefined;
}

// The Rive runtime is only needed by expressive buttons, so it loads with the first one instead of with Button.
const ExpressiveButtonRive = lazy(() =>
  import('./ExpressiveButtonRive').then((module) => ({ default: module.ExpressiveButtonRive })),
);

// With reduced motion the glow only plays while hovered, and the pointer-following highlight is left out.
const ExpressiveLayers = ({ hasReducedMotion, buttonRef, isLightMode, disabled }: ExpressiveLayersProps) => {
  const glowRef = useRef<RiveAnimationHandle>(null);

  useEffect(() => {
    if (disabled || !hasReducedMotion) return;
    const button = buttonRef.current;
    const play = () => glowRef.current?.play();
    const pause = () => glowRef.current?.pause();
    button?.addEventListener('mouseenter', play, true);
    button?.addEventListener('mouseleave', pause, true);
    return () => {
      button?.removeEventListener('mouseenter', play, true);
      button?.removeEventListener('mouseleave', pause, true);
    };
  }, [hasReducedMotion, buttonRef, disabled]);

  return (
    <>
      <Suspense fallback={null}>
        {!disabled && (
          <ExpressiveButtonRive
            className={clsx(styles.expressiveRive, styles.expressiveBackground)}
            eventTargetRef={buttonRef}
            fit="layout"
            artboard="BaseGlowRemapped"
            ref={glowRef}
            withReducedMotion="short-loop"
          />
        )}
        {!hasReducedMotion && !disabled && (
          <ExpressiveButtonRive
            className={clsx(styles.expressiveRive, styles.expressiveHoverContainer)}
            fit="layout"
            artboard={isLightMode ? 'HoverLightmode' : 'HoverDarkmode'}
          />
        )}
      </Suspense>
      <div className={clsx(styles.expressiveRive, styles.expressiveFill)} />
    </>
  );
};

ExpressiveLayers.displayName = 'ExpressiveLayers';

export interface ButtonIconProps {
  icon: ButtonIconSource | undefined;
  iconOpticalOffsetMargin: number;
  iconPosition: ButtonIconPosition;
  size: ButtonSize;
  ref: RefObject<HTMLButtonElement | null>;
  disabled: boolean | undefined;
}

/** Renders a button's icon: an icon component, a Rive animation or a sticker that animates on hover. */
export const ButtonIcon = ({ icon, iconOpticalOffsetMargin, iconPosition, size, ref, disabled }: ButtonIconProps) => {
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (typeof icon !== 'object' || icon.type !== 'sticker' || ref.current == null) return;
    const button = ref.current;
    const onEnter = () => {
      if (!disabled) setIsInteracting(true);
    };
    const onLeave = () => {
      if (!disabled) setIsInteracting(false);
    };
    button.addEventListener('mouseenter', onEnter);
    button.addEventListener('mouseleave', onLeave);
    return () => {
      button.removeEventListener('mouseenter', onEnter);
      button.removeEventListener('mouseleave', onLeave);
    };
  }, [icon, ref, disabled]);

  if (typeof icon === 'function' || icon?.type === 'icon') {
    const Icon = typeof icon === 'function' ? icon : icon.asset;
    const offsetStyle = (): CSSProperties => {
      if (iconOpticalOffsetMargin === 0) return {};
      switch (iconPosition) {
        case 'start':
          return { marginLeft: iconOpticalOffsetMargin };
        case 'end':
          return { marginRight: iconOpticalOffsetMargin };
      }
      return {};
    };
    return <Icon color="currentColor" style={offsetStyle()} size={ICON_SIZES[size]} className={styles.icon} />;
  }
  if (icon == null) return null;
  switch (icon.type) {
    case 'rive': {
      const Rive = icon.asset;
      const dimension = IconSizes[ICON_SIZES[size]];
      return <Rive {...icon.riveProps} eventTargetRef={ref} style={{ width: dimension, height: dimension }} />;
    }
    case 'sticker': {
      const Sticker = icon.component;
      return (
        <Sticker size={IconSizes[STICKER_SIZES[size]]} sticker={icon.asset as never} isInteracting={isInteracting} />
      );
    }
  }
  return null;
};

ButtonIcon.displayName = 'ButtonIcon';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  text?: ReactNode;
  icon?: ButtonIconSource;
  iconPosition?: ButtonIconPosition;
  /** Nudges the icon towards the edge it sits on, to balance icons that look off-center. */
  iconOpticalOffsetMargin?: number;
  fullWidth?: boolean;
  focusProps?: FocusRingProps;
  /** `undefined` renders no loading state at all; `false` keeps the spinner around to fade it out. */
  loading?: boolean;
  loadingStartedLabel?: string;
  loadingFinishedLabel?: string;
  rounded?: boolean;
  type?: 'button' | 'submit' | 'reset';
  rel?: string;
  minWidth?: number | string;
  buttonRef?: Ref<HTMLButtonElement>;
}

export const Button = ({
  role = 'button',
  variant = 'primary',
  size = 'md',
  text,
  icon,
  iconPosition = 'start',
  iconOpticalOffsetMargin = 0,
  fullWidth = false,
  focusProps,
  loading,
  loadingStartedLabel,
  loadingFinishedLabel,
  rounded = false,
  type = 'button',
  rel,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseUp,
  onMouseDown,
  onKeyDown,
  disabled,
  minWidth,
  // Mana buttons can't be restyled from outside: className and style are dropped on purpose.
  className: _className,
  style: _style,
  buttonRef,
  ...props
}: ButtonProps) => {
  const group = useButtonGroupContext();
  const resolvedSize = group.size ?? size;
  const resolvedFullWidth = group.fullWidth ?? fullWidth;
  const hasText = text != null;
  // Icons and the expressive layers read the element, so keep a ref object even when given a callback ref.
  const ref = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergeRefs(ref, buttonRef);
  const iconNode = (
    <ButtonIcon
      icon={icon}
      iconOpticalOffsetMargin={iconOpticalOffsetMargin}
      iconPosition={iconPosition}
      size={resolvedSize}
      ref={ref}
      disabled={disabled}
    />
  );
  const isExpressive = variant === 'expressive';
  const accessibility = useContext(AccessibilityPreferencesContext);
  const { theme, i18n } = useManaContext();
  const isLightMode = isThemeLight(theme);
  const announcedLoading = useRef(false);

  useEffect(() => {
    if (loading === true) {
      announcedLoading.current = true;
      AccessibilityAnnouncer.announce(loadingStartedLabel ?? i18n.BUTTON_LOADING_STARTED_LABEL);
    }
    if (loading === false && announcedLoading.current) {
      AccessibilityAnnouncer.announce(loadingFinishedLabel ?? i18n.BUTTON_LOADING_FINISHED_LABEL);
      announcedLoading.current = false;
    }
  }, [
    loading,
    loadingStartedLabel,
    loadingFinishedLabel,
    i18n.BUTTON_LOADING_STARTED_LABEL,
    i18n.BUTTON_LOADING_FINISHED_LABEL,
  ]);

  const children = (
    <div className={clsx(styles.buttonChildren, { [styles.loading]: loading })}>
      {iconNode != null && iconPosition === 'start' && iconNode}
      {hasText && (
        <Text tag="span" variant={TEXT_VARIANTS[resolvedSize]} color="none" lineClamp={1}>
          {text}
        </Text>
      )}
      {iconNode != null && iconPosition === 'end' && iconNode}
    </div>
  );
  const inactive = disabled || loading;
  const resolvedMinWidth = typeof minWidth === 'number' ? `${minWidth}px` : minWidth;

  const button = (
    <FocusRing {...focusProps}>
      <button
        data-mana-component="button"
        role={role}
        aria-busy={loading}
        className={clsx(styles.button, styles[resolvedSize], variantClassName(variant, hasText), {
          [styles.hasText]: hasText,
          [styles.fullWidth]: resolvedFullWidth,
          [styles.rounded]: rounded,
        })}
        ref={mergedRef}
        rel={rel}
        type={type}
        onClick={inactive ? (event) => event.preventDefault() : onClick}
        onDoubleClick={inactive ? (event) => event.preventDefault() : onDoubleClick}
        onMouseUp={inactive ? undefined : onMouseUp}
        onMouseDown={inactive ? undefined : onMouseDown}
        onKeyDown={inactive ? undefined : onKeyDown}
        onMouseEnter={inactive ? undefined : onMouseEnter}
        onMouseLeave={inactive ? undefined : onMouseLeave}
        disabled={disabled}
        style={{ '--__button-min-width': resolvedMinWidth } as CSSProperties}
        {...props}
      >
        {isExpressive && (
          <ExpressiveLayers
            hasReducedMotion={accessibility.reducedMotion.enabled}
            buttonRef={ref}
            isLightMode={isLightMode}
            disabled={disabled}
          />
        )}
        {loading == null ? (
          <div className={styles.buttonChildrenWrapper}>{children}</div>
        ) : (
          <ButtonLoadingWrapper loading={loading} size={resolvedSize}>
            {children}
          </ButtonLoadingWrapper>
        )}
      </button>
    </FocusRing>
  );

  return isExpressive ? (
    <div
      className={clsx(styles.expressiveWrapper, {
        [styles.fullWidth]: resolvedFullWidth,
        [styles.hasText]: hasText,
      })}
    >
      {button}
    </div>
  ) : (
    button
  );
};

Button.displayName = 'Button';
