import { useContext, useId, type FieldsetHTMLAttributes, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { Badge, type BadgeType } from '../Badge';
import { FormSpacingContext } from '../Form/FormSpacingContext';
import { Stack } from '../Stack';
import { Text } from '../Text';
import styles from './FieldSet.module.css';

export interface FieldSetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> {
  children?: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  badge?: BadgeType;
  ref?: Ref<HTMLFieldSetElement>;
}

/** Groups related fields under a legend. */
export const FieldSet = ({ children, label, description, badge, ...props }: FieldSetProps) => {
  const { spacing } = useContext(FormSpacingContext);
  const descriptionId = useId();
  const hasDescription = description != null && description !== '';
  return (
    <fieldset
      {...props}
      className={clsx(styles.fieldset, props.className)}
      aria-describedby={hasDescription ? descriptionId : undefined}
    >
      {label != null ? (
        <Text tag="legend" variant="body-lg/medium" color="text-strong" className={styles.legend}>
          {label}
          {badge != null && <Badge type={badge} variant="primary" />}
        </Text>
      ) : null}
      {hasDescription ? (
        <Text variant="body-sm/normal" color="text-default" className={styles.description} id={descriptionId}>
          {description}
        </Text>
      ) : null}
      <Stack direction="vertical" gap={spacing}>
        {children}
      </Stack>
    </fieldset>
  );
};

FieldSet.displayName = 'FieldSet';
