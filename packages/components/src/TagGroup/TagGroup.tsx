import { useContext, useMemo, type ComponentType, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import {
  Button as AriaButton,
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  TagList as AriaTagList,
  type Key,
  type Selection,
  type SelectionMode,
  type TagGroupProps as AriaTagGroupProps,
  type TagProps as AriaTagProps,
} from 'react-aria-components';
import { XSmallIcon, type IconColor, type IconSize } from '@discord-components/icons';
import { FieldContext } from '../Field';
import { Text } from '../Text';
import type { TextVariant } from '../Text';
import { tokens } from '../tokens';
import toggleButtonStyles from '../Button/ToggleButton.module.css';
import graphicStyles from './TagGraphic.module.css';
import styles from './TagGroup.module.css';

export type TagGroupSize = 'xs' | 'sm' | 'md';
export type TagGroupLayout = 'default' | 'inline';
export type TagGroupVariant = 'default' | 'filter';

const TEXT_VARIANTS: Record<TagGroupSize, TextVariant> = {
  xs: 'body-xs/normal',
  sm: 'body-sm/normal',
  md: 'body-md/normal',
};

const ICON_SIZES: Record<TagGroupSize, IconSize> = { xs: 'xxs', sm: 'xs', md: 'sm' };

export type TagGraphic =
  | ComponentType<{ size?: IconSize; color?: IconColor }>
  | { type: 'role'; color: string }
  | { type: 'avatar'; src: string }
  | { type: 'image'; src: string };

const TagGraphicView = ({ graphic, size }: { graphic: TagGraphic; size: TagGroupSize }) => {
  if ('type' in graphic) {
    switch (graphic.type) {
      case 'role':
        return <div className={graphicStyles.roleDot} data-size={size} style={{ backgroundColor: graphic.color }} />;
      case 'avatar':
        return <img className={graphicStyles.avatar} data-size={size} src={graphic.src} alt="" />;
      case 'image':
        return <img className={graphicStyles.image} data-size={size} src={graphic.src} alt="" />;
      default:
        return null;
    }
  }
  const Icon = graphic;
  return <Icon size={ICON_SIZES[size]} color="currentColor" />;
};

TagGraphicView.displayName = 'TagGraphic';

export interface TagGroupItem extends Omit<AriaTagProps, 'id' | 'children' | 'className' | 'textValue' | 'style'> {
  id: Key;
  label: string;
  icon?: TagGraphic;
  isDisabled?: boolean;
  // Read to assistive tech after the label.
  accessibilityHint?: string;
}

interface TagItemProps extends TagGroupItem {
  size: TagGroupSize;
  variant?: TagGroupVariant;
}

const Tag = ({ label, size, variant = 'default', isDisabled, icon, accessibilityHint, ...props }: TagItemProps) => {
  const textValue = [label, accessibilityHint].filter(Boolean).join(', ');
  return (
    <AriaTag
      {...props}
      data-mana-component="tag"
      className={clsx(styles.tag, toggleButtonStyles.labeled, toggleButtonStyles.toggleButton)}
      data-variant={variant}
      textValue={textValue}
      isDisabled={isDisabled}
    >
      {({ allowsRemoving }) => (
        <>
          {icon != null && <TagGraphicView graphic={icon} size={size} />}
          <Text color="none" variant={TEXT_VARIANTS[size]} className={styles.tagLabel}>
            {label}
          </Text>
          {allowsRemoving && (
            <AriaButton slot="remove">
              <XSmallIcon size={ICON_SIZES[size]} color={tokens.colors.ICON_DEFAULT} />
            </AriaButton>
          )}
        </>
      )}
    </AriaTag>
  );
};

Tag.displayName = 'Tag';

export interface TagGroupProps {
  // Accepted for API compatibility; links are rendered from each item's `href`.
  mode?: 'link';
  listRef?: Ref<HTMLDivElement>;
  label: string;
  disabled?: boolean;
  disabledKeys?: Iterable<Key> | 'all';
  selectionMode?: SelectionMode;
  selectionBehavior?: AriaTagGroupProps['selectionBehavior'];
  layout?: TagGroupLayout;
  size?: TagGroupSize;
  variant?: TagGroupVariant;
  items: TagGroupItem[];
  onRemove?: (keys: Set<Key>) => void;
  children?: ReactNode;
  selectedKeys?: Iterable<Key> | 'all';
  onSelectionChange?: (keys: Selection) => void;
  disallowEmptySelection?: boolean;
}

type TagGroupInnerProps = Omit<TagGroupProps, 'mode' | 'layout' | 'size' | 'variant'> & {
  layout: TagGroupLayout;
  size: TagGroupSize;
  variant: TagGroupVariant;
};

const TagGroupInner = ({
  listRef,
  label,
  disabled,
  disabledKeys,
  selectionMode = 'none',
  selectionBehavior,
  layout = 'default',
  size = 'md',
  variant,
  items,
  onRemove,
  children,
  selectedKeys,
  onSelectionChange,
  disallowEmptySelection,
}: TagGroupInnerProps) => {
  const field = useContext(FieldContext);
  const resolvedDisabledKeys = useMemo(
    // RAC's disabledKeys has no 'all', so disabling the group lists every item instead.
    () =>
      disabled && disabledKeys !== 'all'
        ? new Set<Key>([...(disabledKeys ?? []), ...items.map((item) => item.id)])
        : disabledKeys,
    [disabled, disabledKeys, items],
  );
  return (
    <AriaTagGroup
      aria-label={label}
      id={field?.controlId}
      data-mana-component="tag-group"
      aria-describedby={field?.describedById}
      data-layout={layout}
      data-size={size}
      data-variant={variant}
      className={styles.tagGroup}
      selectionMode={selectionMode}
      selectionBehavior={selectionBehavior}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      disabledKeys={resolvedDisabledKeys as Iterable<Key> | undefined}
      disallowEmptySelection={disallowEmptySelection}
      onRemove={onRemove}
    >
      <AriaTagList ref={listRef} className={styles.tagList}>
        {items.map((item) => (
          <Tag {...item} key={item.id} size={size} variant={variant} />
        ))}
      </AriaTagList>
      {children}
    </AriaTagGroup>
  );
};

TagGroupInner.displayName = 'TagGroupInner';

export const TagGroup = ({
  mode: _mode,
  variant = 'default',
  layout = 'default',
  size = layout === 'inline' ? 'sm' : 'md',
  ...props
}: TagGroupProps) => <TagGroupInner {...props} layout={layout} size={size} variant={variant} />;

TagGroup.displayName = 'TagGroup';
