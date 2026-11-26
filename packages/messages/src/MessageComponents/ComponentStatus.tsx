import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Text, type TextProps, LoadingDots } from '@discord-components/components';
import { CircleErrorIcon } from '@discord-components/icons';
import { useComponentError } from './ComponentState';
import type { MessageComponent } from './types';
import styles from './ComponentStatus.module.css';

export interface ComponentStatusLineProps {
  className?: string;
  icon: ReactNode;
  text: ReactNode;
  color?: TextProps['color'];
}

/** An icon and a line of text under a message or a component row (thinking, failed…). */
export const ComponentStatusLine = ({ className, icon, text, color }: ComponentStatusLineProps) => (
  <div className={clsx(styles.wrapper, className)}>
    {icon}
    <Text variant="body-md/normal" color={color} scaleFontToUserSetting>
      {text}
    </Text>
  </div>
);

ComponentStatusLine.displayName = 'ComponentStatusLine';

export const loadingStatus = (text: ReactNode): ComponentStatusLineProps => ({
  text,
  icon: <LoadingDots className={styles.icon} dotRadius={3.5} themed />,
});

export const errorStatus = (text: ReactNode): ComponentStatusLineProps => ({
  text,
  color: 'text-feedback-critical',
  icon: <CircleErrorIcon size="xs" color="currentColor" className={clsx(styles.icon, styles.errorIcon)} />,
});

/** The failed interaction's error under the row (or section) holding the component. */
export const ComponentError = ({ component, className }: { component: MessageComponent; className?: string }) => {
  const error = useComponentError(component);
  if (error == null) return null;
  return <ComponentStatusLine {...errorStatus(error)} className={className} />;
};

ComponentError.displayName = 'ComponentError';
