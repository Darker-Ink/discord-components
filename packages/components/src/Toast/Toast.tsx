import { isValidElement, useMemo, type ComponentType, type ReactNode } from 'react';
import clsx from 'clsx';
import { CircleCheckIcon, CircleErrorIcon, type IconColor, type IconSize } from '@discord-mana/icons';
import { Text } from '../Text';
import { tokens, useToken } from '../tokens';
import { ToastEntityIcon, isToastEntity, type ToastEntity } from './ToastEntity';
import styles from './Toast.module.css';

export type ToastVariant = 'default' | 'success' | 'critical';

export type ToastIcon = ComponentType<{
  className?: string;
  size?: IconSize;
  color?: IconColor;
  secondaryColor?: IconColor;
}>;

export interface ToastProps {
  variant?: ToastVariant;
  text?: ReactNode;
  // An icon component, or an entity (emoji, avatar, server, image) shown in its place. Success and
  // critical toasts always show their status icon.
  icon?: ToastIcon | ToastEntity;
  iconColor?: IconColor;
  secondaryIconColor?: IconColor;
  // Replaces the whole toast with arbitrary content.
  __dangerouslyRenderContent?: () => ReactNode;
}

const VARIANT_ICONS: Partial<Record<ToastVariant, { color: IconColor; icon: ToastIcon }>> = {
  success: { color: tokens.colors.ICON_FEEDBACK_POSITIVE, icon: CircleCheckIcon },
  critical: { color: tokens.colors.ICON_FEEDBACK_CRITICAL, icon: CircleErrorIcon },
};

// Same notion of "nothing to show" as lodash's isEmpty, which Discord uses on the text.
const isEmpty = (value: ReactNode) => {
  if (value == null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint')
    return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (isValidElement(value)) return false;
  return Object.keys(value).length === 0;
};

const ToastContent = ({ variant = 'default', text, icon, iconColor, secondaryIconColor }: ToastProps) => {
  const lineCount = useToken(tokens.modules.toast.TEXT_LINE_COUNT) as number;
  const iconElement = useMemo(() => {
    const preset = VARIANT_ICONS[variant];
    if (preset == null && isToastEntity(icon)) return <ToastEntityIcon entity={icon} />;
    const Icon = preset?.icon ?? (isToastEntity(icon) ? undefined : icon);
    if (Icon == null) return null;
    return (
      <Icon
        className={styles.icon}
        size="sm"
        color={preset?.color ?? iconColor ?? tokens.colors.ICON_DEFAULT}
        {...(secondaryIconColor != null ? { secondaryColor: secondaryIconColor } : {})}
      />
    );
  }, [icon, iconColor, secondaryIconColor, variant]);
  return (
    <div className={clsx(styles.wrapper, styles[variant])}>
      <div className={clsx(styles.baselayer, styles[variant])} />
      <div className={styles.content}>
        {iconElement}
        {!isEmpty(text) && (
          <Text variant="body-md/normal" color="text-strong" lineClamp={lineCount}>
            {text}
          </Text>
        )}
      </div>
    </div>
  );
};

ToastContent.displayName = 'ToastContent';

export const Toast = (props: ToastProps) =>
  props.__dangerouslyRenderContent != null ? (
    <div className={styles.customContent}>{props.__dangerouslyRenderContent()}</div>
  ) : (
    <ToastContent {...props} />
  );

Toast.displayName = 'Toast';
