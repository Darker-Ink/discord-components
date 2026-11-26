import { useId, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode, type Ref } from 'react';
import { CircleCheckIcon, CircleErrorIcon, type IconProps } from '@discord-mana/icons';
import { Badge, type BadgeType } from '../Badge';
import { HiddenVisually } from '../HiddenVisually';
import { Text } from '../Text';
import { tokens } from '../tokens';
import { FieldContext, type FieldContextValue } from './FieldContext';
import styles from './Field.module.css';

export type FieldLayout = 'vertical' | 'horizontal' | 'horizontal-responsive';

export type FieldAuxiliaryContentPosition = 'under-control' | 'under-label';

export interface FieldLayoutConfig {
  /** Width of the control column in the horizontal layouts (any CSS length). */
  horizontalControlColumnWidth?: string;
}

/** The props `Field` owns. Controls that wrap themselves in a `Field` accept these too. */
export interface FieldOwnProps {
  label?: ReactNode;
  hideLabel?: boolean;
  badge?: BadgeType;
  icon?: ComponentType<IconProps> | null;
  required?: boolean;
  disabled?: boolean;
  description?: ReactNode;
  helperText?: ReactNode;
  id?: string;
  errorMessage?: ReactNode;
  successMessage?: ReactNode;
  layout?: FieldLayout;
  layoutConfig?: FieldLayoutConfig;
}

export interface FieldProps extends FieldOwnProps {
  children?: ReactNode | ((context: FieldContextValue) => ReactNode);
  role?: string;
  interactiveLabel?: boolean;
  auxiliaryContentPosition?: FieldAuxiliaryContentPosition;
  trailingAuxiliaryContent?: ReactNode;
  ref?: Ref<HTMLElement>;
}

const isPresent = (value: ReactNode) => value != null && value !== '';

const useFieldContextValue = (
  { id, label, errorMessage, helperText, successMessage, description }: FieldProps,
  { hasTrailingAuxiliaryContent }: { hasTrailingAuxiliaryContent?: boolean } = {},
): FieldContextValue => {
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const labelId = useId();
  const controlId = useId();
  const helperTextId = useId();
  const descriptionId = useId();
  const errorMessageId = useId();
  const trailingAuxiliaryContentId = useId();
  const hasLabel = isPresent(label);
  const hasDescription = isPresent(description);
  const hasHelperText = isPresent(helperText) || isPresent(successMessage);
  const describedBy: string[] = [];
  if (hasDescription) describedBy.push(descriptionId);
  if (hasHelperText) describedBy.push(helperTextId);
  if (hasTrailingAuxiliaryContent) describedBy.push(trailingAuxiliaryContentId);
  const describedById = describedBy.length > 0 ? describedBy.join(' ') : undefined;
  const hasErrorMessage = isPresent(errorMessage);

  return useMemo(
    () => ({
      labelId: hasLabel ? labelId : undefined,
      controlId: id ?? controlId,
      describedById,
      errorMessageId: hasErrorMessage ? errorMessageId : undefined,
      helperTextId: hasHelperText ? helperTextId : undefined,
      descriptionId: hasDescription ? descriptionId : undefined,
      trailingAuxiliaryContentId: hasTrailingAuxiliaryContent ? trailingAuxiliaryContentId : undefined,
      isLabelHovered,
      setIsLabelHovered,
    }),
    [
      hasLabel,
      labelId,
      id,
      controlId,
      describedById,
      hasErrorMessage,
      errorMessageId,
      hasHelperText,
      helperTextId,
      hasDescription,
      descriptionId,
      hasTrailingAuxiliaryContent,
      trailingAuxiliaryContentId,
      isLabelHovered,
    ],
  );
};

interface FieldAuxiliaryContentProps {
  successMessage?: ReactNode;
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  trailing?: ReactNode;
  helperTextId?: string;
  errorMessageId?: string;
}

// The row under the control (or label): one status message or the helper text, then the trailing content.
const FieldAuxiliaryContent = ({
  successMessage,
  errorMessage,
  helperText,
  trailing,
  helperTextId,
  errorMessageId,
}: FieldAuxiliaryContentProps) => {
  let content: ReactNode = <div />;
  let hasContent = trailing != null;
  if (isPresent(errorMessage)) {
    hasContent = true;
    content = (
      <div className={styles.statusMessageContainer} role="alert">
        <CircleErrorIcon size="xs" color={tokens.colors.TEXT_FEEDBACK_CRITICAL} />
        <Text variant="body-xs/normal" color="text-feedback-critical" id={errorMessageId}>
          {errorMessage}
        </Text>
      </div>
    );
  } else if (isPresent(successMessage)) {
    hasContent = true;
    content = (
      <div className={styles.statusMessageContainer}>
        <CircleCheckIcon size="xs" color={tokens.colors.TEXT_FEEDBACK_POSITIVE} />
        <Text variant="body-xs/normal" color="text-feedback-positive" id={helperTextId}>
          {successMessage}
        </Text>
      </div>
    );
  } else if (helperText != null) {
    hasContent = true;
    content = (
      <Text variant="body-xs/normal" color="text-subtle" id={helperTextId}>
        {helperText}
      </Text>
    );
  }
  if (!hasContent) return null;
  return (
    <div className={styles.helperTextContainer}>
      {content}
      {trailing}
    </div>
  );
};

FieldAuxiliaryContent.displayName = 'FieldAuxiliaryContent';

/** Label, description, helper text and status message around a form control. */
export const Field = (props: FieldProps) => {
  const {
    label,
    hideLabel = false,
    required,
    disabled,
    description,
    helperText,
    children,
    errorMessage,
    successMessage,
    role,
    layout = 'vertical',
    layoutConfig,
    badge,
    icon: Icon = null,
    interactiveLabel = false,
    auxiliaryContentPosition = 'under-control',
    trailingAuxiliaryContent,
    ref,
  } = props;
  const context = useFieldContextValue(props, { hasTrailingAuxiliaryContent: trailingAuxiliaryContent != null });
  const { labelId, controlId, errorMessageId, describedById, helperTextId, descriptionId } = context;
  const horizontalControlColumnWidth = layoutConfig?.horizontalControlColumnWidth;
  const isGroup = role === 'group' || role === 'radiogroup';
  const Tag = isGroup ? 'fieldset' : 'div';
  const legend = isGroup ? (
    <legend id={labelId}>
      <HiddenVisually>{label}</HiddenVisually>
    </legend>
  ) : null;
  const hasLabel = isPresent(label);
  const hasDescription = isPresent(description);

  const labelElement = hasLabel ? (
    <Text
      aria-hidden={isGroup}
      data-interactive={interactiveLabel}
      id={labelId}
      tag={isGroup ? 'span' : 'label'}
      variant="body-md/medium"
      color="text-strong"
      // Text types only global attributes, but renders a label here.
      {...{ htmlFor: controlId }}
      className={styles.label}
    >
      {Icon != null ? <Icon aria-hidden size="xs" className={styles.icon} /> : null}
      {label}
      {required && (
        <Text aria-hidden variant="body-md/normal" color="text-feedback-critical" className={styles.required}>
          *
        </Text>
      )}
      {badge != null ? (
        <span className={styles.badgeContainer}>
          <Badge type={badge} variant="primary" />
        </span>
      ) : null}
    </Text>
  ) : null;

  const auxiliaryContent = (
    <FieldAuxiliaryContent
      successMessage={successMessage}
      errorMessage={errorMessage}
      helperText={helperText}
      trailing={trailingAuxiliaryContent}
      helperTextId={helperTextId}
      errorMessageId={errorMessageId}
    />
  );

  return (
    <FieldContext.Provider value={context}>
      <Tag
        role={role}
        // The element switches between div and fieldset, so the ref is typed loosely.
        ref={ref as Ref<never>}
        className={styles.container}
        data-layout={layout}
        data-has-description={hasDescription || undefined}
        style={
          horizontalControlColumnWidth != null
            ? ({ '--custom-field-horizontal-control-width': horizontalControlColumnWidth } as CSSProperties)
            : undefined
        }
        data-disabled={disabled}
        aria-describedby={isGroup ? describedById : undefined}
        aria-required={(isGroup && !!required) || undefined}
        disabled={isGroup ? disabled : undefined}
      >
        {legend}
        {hasLabel && hideLabel ? <HiddenVisually>{labelElement}</HiddenVisually> : null}
        {(hasLabel && !hideLabel) || hasDescription ? (
          <div className={styles.labelContainer}>
            {hideLabel ? null : labelElement}
            {hasDescription && (
              <Text variant="body-sm/normal" color="text-subtle" className={styles.description} id={descriptionId}>
                {description}
              </Text>
            )}
            {auxiliaryContentPosition === 'under-label' ? auxiliaryContent : null}
          </div>
        ) : null}
        <div className={styles.control}>
          {typeof children === 'function' ? children(context) : children}
          {auxiliaryContentPosition === 'under-control' ? auxiliaryContent : null}
        </div>
      </Tag>
    </FieldContext.Provider>
  );
};

Field.displayName = 'Field';

/** Splits a control's props into the ones its `Field` takes and the rest. */
export const splitFieldProps = <Props extends FieldOwnProps>({
  label,
  hideLabel,
  badge,
  icon,
  required,
  disabled,
  description,
  helperText,
  id,
  errorMessage,
  successMessage,
  layout,
  layoutConfig,
  ...props
}: Props) => ({
  fieldProps: {
    label,
    hideLabel,
    badge,
    icon,
    required,
    disabled,
    description,
    helperText,
    id,
    errorMessage,
    successMessage,
    layout,
    layoutConfig,
  } satisfies FieldOwnProps,
  props: props as Omit<Props, keyof FieldOwnProps>,
});
