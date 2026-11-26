import { isValidElement, type CSSProperties, type MouseEventHandler } from 'react';
import clsx from 'clsx';
import { Badge } from '../Badge';
import type { ListboxOption, ListboxOptionAccessory } from '../Listbox';
import listboxStyles from '../Listbox/Listbox.module.css';
import { MarqueeText } from '../MarqueeText';
import { Text } from '../Text';
import styles from './SelectOption.module.css';

const SelectOptionAccessory = ({ accessory, leading }: { accessory?: ListboxOptionAccessory; leading?: boolean }) => {
  if (accessory == null) return null;
  if (isValidElement(accessory)) return <div className={clsx({ [styles.iconAccessory]: leading })}>{accessory}</div>;
  if (typeof accessory === 'string') {
    return (
      <Text variant="body-sm/normal" color="text-subtle">
        {accessory}
      </Text>
    );
  }
  if (typeof accessory === 'object' && 'type' in accessory) {
    switch (accessory.type) {
      case 'image':
        return <img aria-hidden alt="" src={accessory.src} className={styles.imageAccessory} />;
      case 'avatar':
        return <img aria-hidden alt="" src={accessory.src} className={styles.avatarAccessory} />;
      case 'badge':
        return <Badge type={accessory.badgeType} variant="primary" />;
      default:
        return null;
    }
  }
  const Icon = accessory;
  return (
    <div className={styles.iconAccessory}>
      <Icon size="refresh_sm" color="currentColor" />
    </div>
  );
};

SelectOptionAccessory.displayName = 'SelectOptionAccessory';

export interface SelectOptionProps extends Pick<ListboxOption, 'label' | 'description' | 'leading' | 'trailing'> {
  onClick?: MouseEventHandler<HTMLDivElement>;
  'aria-hidden'?: boolean;
  // Rendered as the value inside a select's field rather than in its dropdown.
  inInput?: boolean;
}

/** An option's content in a Select or Combobox: label, description and leading/trailing accessories. */
export const SelectOption = ({
  label,
  description,
  onClick,
  'aria-hidden': ariaHidden,
  leading,
  trailing,
  inInput = false,
}: SelectOptionProps) => {
  let leadingContent = null;
  if (leading != null) {
    leadingContent = (
      <div className={styles.leading}>
        <SelectOptionAccessory accessory={leading} leading />
      </div>
    );
  }
  let trailingContent = null;
  if (trailing != null) {
    trailingContent = (
      <div className={styles.trailing}>
        <SelectOptionAccessory accessory={trailing} />
      </div>
    );
  }
  const showDescription = !inInput && description != null && description !== '';
  const gridStyle: CSSProperties = {
    gridColumnStart: leadingContent != null ? '2' : '1',
    gridColumnEnd: trailingContent != null ? '2' : '3',
  };
  return (
    <div
      className={clsx(listboxStyles.listBoxItemContent, styles.option, { [listboxStyles.inInput]: inInput })}
      onClick={onClick}
      aria-hidden={ariaHidden}
      data-has-description={showDescription || undefined}
    >
      {leadingContent}
      {inInput ? (
        <Text variant="body-md/normal" color="currentColor" lineClamp={1} style={gridStyle}>
          {label}
        </Text>
      ) : (
        <MarqueeText variant="body-md/normal" style={gridStyle}>
          {label}
        </MarqueeText>
      )}
      {showDescription && (
        <Text
          variant="body-sm/normal"
          color="text-subtle"
          lineClamp={1}
          style={{
            gridColumnStart: leadingContent != null ? '2' : '1',
            gridColumnEnd: trailingContent != null ? '2' : '3',
          }}
        >
          {description}
        </Text>
      )}
      {trailingContent}
    </div>
  );
};

SelectOption.displayName = 'SelectOption';
