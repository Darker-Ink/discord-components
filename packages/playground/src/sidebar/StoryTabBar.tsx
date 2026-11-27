import { type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Clickable, Text } from '@discord-mana/components';
import styles from './StoryTabBar.module.css';

// Discord's playground lists stories in the client's legacy TabBar: a vertical `side` bar with the gray
// look, whose items get their selection from the sidebar. This is the part of it the sidebar uses.

const panelId = (id: string) => `${id.replace(/\s+/g, '-').toLowerCase()}-tab`;

const getTabs = (bar: HTMLElement) => Array.from(bar.querySelectorAll<HTMLElement>('[role="tab"]'));

const getTargetTab = (bar: HTMLElement, key: string) => {
  const tabs = getTabs(bar);
  const active = bar.ownerDocument.activeElement;
  switch (key) {
    case 'ArrowDown':
      if (active == null) return null;
      return (
        tabs.find(
          (tab) =>
            !!(
              active.compareDocumentPosition(tab) &
              (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY)
            ),
        ) ?? null
      );
    case 'ArrowUp':
      if (active == null) return null;
      return (
        tabs.findLast(
          (tab) =>
            !!(
              active.compareDocumentPosition(tab) &
              (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINED_BY)
            ),
        ) ?? null
      );
    case 'Home':
      return tabs[0] ?? null;
    case 'End':
      return tabs[tabs.length - 1] ?? null;
  }
  return null;
};

export const StoryTabBar = ({ children }: { children: ReactNode }) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tab = getTargetTab(event.currentTarget, event.key);
    if (tab != null) {
      event.preventDefault();
      tab.focus();
    }
  };
  return (
    <div className={styles.side} role="tablist" aria-orientation="vertical" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

StoryTabBar.displayName = 'StoryTabBar';

export const StoryTabBarHeader = ({ children }: { children: ReactNode }) => (
  <div className={styles.header}>
    <Text tag="div" variant="heading-xs/medium" color="text-muted" className={styles.headerText}>
      {children}
    </Text>
  </div>
);

StoryTabBarHeader.displayName = 'StoryTabBarHeader';

export const StoryTabBarSeparator = () => <div className={styles.separator} />;

StoryTabBarSeparator.displayName = 'StoryTabBarSeparator';

interface StoryTabBarItemProps {
  id: string;
  selected: boolean;
  onSelect: () => void;
  'aria-label': string;
  children: ReactNode;
}

export const StoryTabBarItem = ({
  id,
  selected,
  onSelect,
  'aria-label': ariaLabel,
  children,
}: StoryTabBarItemProps) => (
  <Clickable
    className={clsx(styles.item, { [styles.selected]: selected }, styles.themed)}
    role="tab"
    aria-selected={selected}
    aria-controls={selected ? panelId(id) : undefined}
    aria-disabled={false}
    tabIndex={selected ? 0 : -1}
    onClick={onSelect}
    aria-label={ariaLabel}
  >
    <Text variant="body-md/medium" color="none" className={styles.itemText}>
      {children}
    </Text>
  </Clickable>
);

StoryTabBarItem.displayName = 'StoryTabBarItem';
