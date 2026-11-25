import { useRef, type ReactNode, type RefObject } from 'react';
import {
  SelectionIndicator,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  TabPanels as AriaTabPanels,
  Tabs as AriaTabs,
  type Key,
} from 'react-aria-components';
import { useNumberFormatter } from 'react-aria';
import { ButtonIcon, type ButtonIconSource } from '../Button';
import { Text } from '../Text';
import styles from './Tabs.module.css';

export type TabsVariant = 'default' | 'overlay';
export type TabsKeyboardActivation = 'manual' | 'automatic';
export type TabsPanelAnimation = 'none' | 'fade';

export interface TabsItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: ButtonIconSource;
  count?: number;
  disabled?: boolean;
  'aria-label'?: string;
  panel: () => ReactNode;
}

const TabItem = ({ item, formattedCount }: { item: TabsItem; formattedCount?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <AriaTab id={item.id} ref={ref} className={styles.item} isDisabled={item.disabled} aria-label={item['aria-label']}>
      {({ isDisabled }) => (
        <>
          <span className={styles.contents}>
            {item.icon != null && (
              <ButtonIcon
                icon={item.icon}
                iconOpticalOffsetMargin={0}
                iconPosition="start"
                size="md"
                // ButtonIcon only listens for hover on it, so any element works.
                ref={ref as unknown as RefObject<HTMLButtonElement | null>}
                disabled={isDisabled}
              />
            )}
            <Text tag="span" variant="body-md/medium" color="none">
              {item.label}
            </Text>
            {formattedCount != null && (
              <Text tag="span" variant="body-sm/medium" color="none">
                ({formattedCount})
              </Text>
            )}
          </span>
          <SelectionIndicator className={styles.indicator} aria-hidden="true" />
        </>
      )}
    </AriaTab>
  );
};

TabItem.displayName = 'TabItem';

const TabPanel = ({ item, animation }: { item: TabsItem; animation: TabsPanelAnimation }) => (
  <AriaTabPanel id={item.id} className={styles.panel} data-animation={animation}>
    {item.panel()}
  </AriaTabPanel>
);

TabPanel.displayName = 'TabPanel';

export interface TabsProps<Id extends string = string> {
  items: TabsItem<Id>[];
  selectedId?: Id;
  defaultSelectedId?: Id;
  onChange?: (id: Id) => void;
  variant?: TabsVariant;
  disabled?: boolean;
  keyboardActivation?: TabsKeyboardActivation;
  panelAnimation?: TabsPanelAnimation;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Tabs = <Id extends string = string>({
  items,
  selectedId,
  defaultSelectedId,
  onChange,
  variant = 'default',
  disabled = false,
  keyboardActivation = 'manual',
  panelAnimation = 'none',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: TabsProps<Id>) => {
  const formatter = useNumberFormatter();
  const handleSelectionChange = (key: Key) => {
    const item = items.find((candidate) => candidate.id === key);
    if (item != null) onChange?.(item.id);
  };
  return (
    <AriaTabs
      className={styles.tabs}
      selectedKey={selectedId}
      defaultSelectedKey={defaultSelectedId}
      onSelectionChange={handleSelectionChange}
      keyboardActivation={keyboardActivation}
      isDisabled={disabled}
      data-mana-component="tabs"
      data-variant={variant}
    >
      <div className={styles.strip}>
        <div className={styles.rail} />
        <AriaTabList className={styles.items} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
          {items.map((item) => (
            <TabItem
              key={item.id}
              item={item}
              formattedCount={item.count != null ? formatter.format(item.count) : undefined}
            />
          ))}
        </AriaTabList>
      </div>
      <AriaTabPanels className={styles.panels} data-animation={panelAnimation}>
        {items.map((item) => (
          <TabPanel key={item.id} item={item} animation={panelAnimation} />
        ))}
      </AriaTabPanels>
    </AriaTabs>
  );
};

Tabs.displayName = 'Tabs';
